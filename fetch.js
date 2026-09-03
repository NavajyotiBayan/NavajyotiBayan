const fs = require("fs");

const OWNER = "NavajyotiBayan";
const README = "README.md";
const START = "<!-- AUTO-REPO-LIST:START -->";
const END = "<!-- AUTO-REPO-LIST:END -->";

async function fetchPinnedRepositories() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        pinnedItems(first: 4, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
              description
              url
              homepageUrl
              stargazerCount
              forkCount
              primaryLanguage { name }
              repositoryTopics(first: 5) {
                nodes { topic { name } }
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
    body: JSON.stringify({ query, variables: { login: OWNER } })
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.errors?.length) {
    throw new Error(data.errors.map(error => error.message).join("\n"));
  }

  return (data.data?.user?.pinnedItems?.nodes ?? []).filter(Boolean).slice(0, 4);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRepository(repo, index) {
  const description = repo.description?.trim() || "No description provided.";
  const language = repo.primaryLanguage?.name || "GitHub";
  const topics = (repo.repositoryTopics?.nodes ?? [])
    .map(({ topic }) => topic?.name)
    .filter(Boolean)
    .slice(0, 3);

  const tags = [language, ...topics.filter(topic => topic !== language)]
    .slice(0, 4)
    .map(tag => `\`${escapeHtml(tag)}\``)
    .join(" · ");

  const homepage = repo.homepageUrl
    ? ` · <a href="${escapeHtml(repo.homepageUrl)}">Live Demo ↗</a>`
    : "";

  return `
<td width="50%" valign="top">

**<a href="${escapeHtml(repo.url)}">[${String(index).padStart(2, "0")}] ${escapeHtml(repo.name)}</a>**

${escapeHtml(description)}

<sub>${tags}</sub>

⭐ ${repo.stargazerCount ?? 0} &nbsp;·&nbsp; 🍴 ${repo.forkCount ?? 0}${homepage}

</td>`;
}

function renderFeaturedProjects(repositories) {
  if (!repositories.length) {
    return `<table width="100%" border="1" cellpadding="14" cellspacing="0"><tr><td><code>Navajyoti@github:~$ pinned --list</code><br><br><i>No pinned repositories found.</i></td></tr></table>`;
  }

  const rows = [];
  for (let i = 0; i < repositories.length; i += 2) {
    const left = renderRepository(repositories[i], i + 1);
    const right = repositories[i + 1]
      ? renderRepository(repositories[i + 1], i + 2)
      : `<td width="50%"></td>`;
    rows.push(`<tr>${left}${right}</tr>`);
  }

  return `
<table width="100%" border="1" cellpadding="10" cellspacing="0">
<tr><td colspan="2"><sub>● ● ●</sub> &nbsp; <code>Navajyoti@github:~$ pinned --list</code></td></tr>
${rows.join("\n")}
<tr><td colspan="2"><sub><code>Navajyoti@github:~$ _</code></sub></td></tr>
</table>`;
}

function updateReadme(repositories) {
  const readme = fs.readFileSync(README, "utf8");
  const startIndex = readme.indexOf(START);
  const endIndex = readme.indexOf(END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`Could not find ${START} and ${END} markers in ${README}.`);
  }

  const generated = renderFeaturedProjects(repositories);
  const before = readme.slice(0, startIndex + START.length);
  const after = readme.slice(endIndex);
  fs.writeFileSync(README, `${before}\n${generated}\n${after}`, "utf8");
}

async function main() {
  if (!process.env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not available.");
  console.log(`Fetching pinned repositories for ${OWNER}...`);
  const repositories = await fetchPinnedRepositories();
  console.log(`Found ${repositories.length} pinned repositories:`, repositories.map(repo => repo.name).join(", ") || "none");
  updateReadme(repositories);
  console.log("README.md updated successfully.");
}

main().catch(error => {
  console.error("Failed to update featured projects:");
  console.error(error);
  process.exit(1);
});
