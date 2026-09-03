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
          primaryLanguage { name }
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
            variables: { login: USERNAME }
        })
    });

    if (!response.ok) {
        throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
        console.error(JSON.stringify(result.errors, null, 2));
        throw new Error("GitHub GraphQL returned an error.");
    }

    return result.data.user.pinnedItems.nodes.filter(repo => repo && !repo.isFork);
}

function escapeMarkdown(value = "") {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`");
}

function wrapDescription(text, max = 48) {
    const words = String(text || "Personal project and experiment.").split(/\s+/);
    const lines = [];
    let line = "";

    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > max && line) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }

    if (line) lines.push(line);
    return lines.slice(0, 3);
}

function createProjectTable(repositories) {
    if (!repositories.length) {
        return `
<div align="center">

\`No repositories are currently pinned on my GitHub profile.\`

</div>`;
    }

    return `
<table>
${repositories.slice(0, 4).map((repo, index) => {
        const descriptionLines = wrapDescription(repo.description);
        const description = descriptionLines.join("\n");

        return `<tr>
<td>

\`\`\`text
$ ${index + 1}. ${escapeMarkdown(repo.name)}

${description}

${repo.primaryLanguage?.name || "Code"}   ★ ${repo.stargazerCount}   ⑂ ${repo.forkCount}
\`\`\`

**[→ View Repository](${repo.url})**

</td>
</tr>`;
    }).join("\n")}
</table>`;
}

function updateReadme(projectTable) {
    const readme = fs.readFileSync(README_FILE, "utf8");
    const start = readme.indexOf(START_MARKER);
    const end = readme.indexOf(END_MARKER);

    if (start === -1 || end === -1 || end < start) {
        throw new Error("README project markers are missing or invalid.");
    }

    const before = readme.slice(0, start + START_MARKER.length);
    const after = readme.slice(end);

    fs.writeFileSync(
        README_FILE,
        `${before}\n\n${projectTable}\n\n${after}`,
        "utf8"
    );
}

async function main() {
    console.log(`Fetching pinned repositories for ${USERNAME}...`);

    const repositories = await getPinnedRepositories();

    console.log(`Found ${repositories.length} pinned repositories.`);

    updateReadme(createProjectTable(repositories));

    console.log("README.md updated successfully.");
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
