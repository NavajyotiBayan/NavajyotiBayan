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
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
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

    return result.data.user.pinnedItems.nodes.filter(
        repo => repo && !repo.isFork
    );
}

function escapeMarkdown(value = "") {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\|/g, "\\|");
}

function createProjectTable(repositories) {
    if (!repositories.length) {
        return `
<div align="center">
<sub>NO PINNED REPOSITORIES FOUND</sub>
</div>`;
    }

    return `
<table>
${repositories.slice(0, 4).map((repo) => {
        const name = escapeMarkdown(repo.name);
        const description = escapeMarkdown(
            repo.description || "Personal project and experiment."
        );
        const language = escapeMarkdown(
            repo.primaryLanguage?.name || "Code"
        );

        return `<tr>
<td>

<h3><samp>› ${name}</samp></h3>

${description}

<code>${language}</code>
&nbsp; <samp>★ ${repo.stargazerCount}</samp>
&nbsp; <samp>⑂ ${repo.forkCount}</samp>

<br><br>

<a href="${repo.url}"><b>OPEN PROJECT →</b></a>

</td>
</tr>`;
    }).join("\n")}
</table>`;
}

function updateReadme(projects) {
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
        `${before}\n\n${projects}\n\n${after}`,
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
