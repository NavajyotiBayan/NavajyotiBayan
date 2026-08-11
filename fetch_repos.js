const fs = require("fs");

const USERNAME = "NavajyotiBayan";
const README_FILE = "README.md";

const START_MARKER = "<!-- AUTO-REPO-LIST:START -->";
const END_MARKER = "<!-- AUTO-REPO-LIST:END -->";

const QUERY = `
query($login: String!) {
  user(login: $login) {
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          description
          url
          stargazerCount
          forkCount
          primaryLanguage {
            name
          }
          isArchived
          isFork
        }
      }
    }
  }
}
`;

async function getPinnedRepositories() {
    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
            "Content-Type": "application/json",
            "User-Agent": "NavajyotiBayan-Profile-README"
        },
        body: JSON.stringify({
            query: QUERY,
            variables: {
                login: USERNAME
            }
        })
    });

    if (!response.ok) {
        throw new Error(
            `GitHub API request failed: ${response.status} ${response.statusText}`
        );
    }

    const result = await response.json();

    if (result.errors) {
        console.error(JSON.stringify(result.errors, null, 2));
        throw new Error("GitHub GraphQL returned an error.");
    }

    return result.data.user.pinnedItems.nodes.filter(
        repo => repo && !repo.isFork
    );
}

function escapeHtml(text = "") {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function createProjectCards(repositories) {
    if (repositories.length === 0) {
        return `
<div align="center">

_No repositories are currently pinned on my GitHub profile._

</div>
`;
    }

    const cards = repositories.map((repo, index) => {
        const description =
            escapeHtml(repo.description || "Personal project and experiment.");

        const language =
            repo.primaryLanguage?.name || "Code";

        const stars = repo.stargazerCount;
        const forks = repo.forkCount;

        return `
<td width="50%" valign="top">

### 📦 [${escapeHtml(repo.name)}](${repo.url})

${description}

\`${language}\` · ⭐ ${stars} · 🍴 ${forks}

</td>
`;
    });

    const rows = [];

    for (let i = 0; i < cards.length; i += 2) {
        const left = cards[i];
        const right = cards[i + 1] || `
<td width="50%" valign="top"></td>
`;

        rows.push(`
<tr>
${left}
${right}
</tr>
`);
    }

    return `
<table>
${rows.join("\n")}
</table>
`;
}

function updateReadme(content) {
    const readme = fs.readFileSync(README_FILE, "utf8");

    const startIndex = readme.indexOf(START_MARKER);
    const endIndex = readme.indexOf(END_MARKER);

    if (startIndex === -1 || endIndex === -1) {
        throw new Error(
            "README markers not found. Add AUTO-REPO-LIST markers first."
        );
    }

    if (endIndex < startIndex) {
        throw new Error("README markers are in the wrong order.");
    }

    const before = readme.slice(
        0,
        startIndex + START_MARKER.length
    );

    const after = readme.slice(endIndex);

    const updatedReadme =
        `${before}\n\n${content}\n\n${after}`;

    fs.writeFileSync(
        README_FILE,
        updatedReadme,
        "utf8"
    );
}

async function main() {
    console.log(`Fetching pinned repositories for ${USERNAME}...`);

    const repositories = await getPinnedRepositories();

    console.log(`Found ${repositories.length} pinned repositories.`);

    repositories.forEach((repo, index) => {
        console.log(`${index + 1}. ${repo.name}`);
    });

    const projectCards = createProjectCards(repositories);

    updateReadme(projectCards);

    console.log("README.md updated successfully.");
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
