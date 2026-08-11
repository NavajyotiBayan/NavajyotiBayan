const fs = require("fs");

const USERNAME = "NavajyotiBayan";
const README = "README.md";

async function main() {
    const response = await fetch(
        `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`
    );

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    const repos = await response.json();

    const projects = repos
        .filter(repo => !repo.fork && repo.name !== USERNAME)
        .sort((a, b) => {
            const stars = b.stargazers_count - a.stargazers_count;

            if (stars !== 0) return stars;

            return new Date(b.updated_at) - new Date(a.updated_at);
        })
        .slice(0, 6);

    const content = projects.map(repo => {
        const description =
            repo.description || "A personal project and experiment.";

        return `### [${repo.name}](${repo.html_url})

${description}

\`${repo.language || "Code"}\` · ⭐ ${repo.stargazers_count}`;
    }).join("\n\n");

    let readme = fs.readFileSync(README, "utf8");

    const start = "<!-- AUTO-REPO-LIST:START -->";
    const end = "<!-- AUTO-REPO-LIST:END -->";

    const startIndex = readme.indexOf(start);
    const endIndex = readme.indexOf(end);

    if (startIndex === -1 || endIndex === -1) {
        throw new Error("README markers not found.");
    }

    const updated =
        readme.slice(0, startIndex + start.length) +
        "\n\n" +
        content +
        "\n\n" +
        readme.slice(endIndex);

    fs.writeFileSync(README, updated);

    console.log(`Updated ${projects.length} repositories.`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
