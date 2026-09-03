const fs = require("fs");

const OWNER = "NavajyotiBayan";
const README = "README.md";
const START = "<!-- AUTO-REPO-LIST:START -->";
const END = "<!-- AUTO-REPO-LIST:END -->";

async function fetchPinnedRepositories() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
              description
              url
              homepageUrl
              stargazerCount
              forkCount
              primaryLanguage {
                name
              }
              repositoryTopics(first: 5) {
                nodes {
                  topic {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "github-profile-readme-sync"
    },
    body: JSON.stringify({
      query,
      variables: { login: OWNER }
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors?.length) {
    throw new Error(data.errors.map(error => error.message).join("\n"));
  }

  return data.data.user.pinnedItems.nodes;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRepository(repo) {
  const description =
    repo.description?.trim() || "No description provided.";

  const language = repo.primaryLanguage?.name || "GitHub";
  const topics = repo.repositoryTopics.nodes
    .map(({ topic }) => topic.name)
    .slice(0, 4);

  const topicLine = topics.length
    ? `<sub>${topics.map(topic => `\`${escapeHtml(topic)}\``).join(" · ")}</sub>`
    : `<sub>\`${escapeHtml(language)}\`</sub>`;

  const homepage = repo.homepageUrl
    ? ` · <a href="${escapeHtml(repo.homepageUrl)}">Live Demo</a>`
    : "";

  return `
<td width="50%" valign="top">

### <a href="${escapeHtml(repo.url)}">${escapeHtml(repo.name)}</a>

${escapeHtml(description)}

${topicLine}

<br>

⭐ ${repo.stargazerCount} &nbsp; · &nbsp; 🍴 ${repo.forkCount}${homepage}

</td>`;
}

function renderFeaturedProjects(repositories) {
  if (!repositories.length) {
    return `
<div align="center">

_No pinned repositories found._

</div>`;
  }

  const rows = [];

  for (let i = 0; i < repositories.length; i += 2) {
    const left = renderRepository(repositories[i]);
    const right = repositories[i + 1]
      ? renderRepository(repositories[i + 1])
      : `<td width="50%"></td>`;

    rows.push(`<tr>${left}${right}</tr>`);
  }

  return `
<table>
${rows.join("\n")}
</table>`;
}

function updateReadme(repositories) {
  const readme = fs.readFileSync(README, "utf8");

  const startIndex = readme.indexOf(START);
  const endIndex = readme.indexOf(END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      `Could not find ${START} and ${END} markers in ${content}.`
    );
  }

  const generated = renderFeaturedProjects(repositories);
  const before = readme.slice(0, startIndex + START.length);
  const after = readme.slice(endIndex);

  const updated = `${before}\n${generated}\n${after}`;

  fs.writeFileSync(README, updated, "utf8");
}

async function main() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is not available.");
  }

  console.log(`Fetching pinned repositories for ${OWNER}...`);

  const repositories = await fetchPinnedRepositories();

  console.log(
    `Found ${repositories.length} pinned repositories:`,
    repositories.map(repo => repo.name).join(", ") || "none"
  );

  updateReadme(README);

  console.log("README.md updated successfully.");
}

main().catch(error => {
  console.error("Failed to update featured projects:");
  console.error(error);
  process.exit(1);
});
