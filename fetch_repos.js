const fs = require("fs");

const USERNAME = "NavajyotiBayan";
const SVG_FILE = "assets/profile-terminal.svg";

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

function esc(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function wrapText(text, maxChars = 42, maxLines = 3) {
    const words = String(text || "Personal project and experiment.").split(/\s+/);
    const lines = [];
    let line = "";

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (candidate.length > maxChars && line) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }

    if (line) lines.push(line);
    return lines.slice(0, maxLines);
}

function projectCard(repo, x, y, width, height, number) {
    const lines = wrapText(repo.description);
    const desc = lines.map((line, i) =>
        `<text x="${x + 28}" y="${y + 88 + i * 20}" class="desc">${esc(line)}</text>`
    ).join("");

    return `
    <a href="${esc(repo.url)}" target="_blank">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" class="card"/>
      <text x="${x + 28}" y="${y + 38}" class="prompt">$ ${number}.</text>
      <text x="${x + 54}" y="${y + 38}" class="project">${esc(repo.name)}</text>
      ${desc}
      <text x="${x + 28}" y="${y + height - 28}" class="meta">${esc(repo.primaryLanguage?.name || "Code")}</text>
      <text x="${x + width - 128}" y="${y + height - 28}" class="meta">★ ${repo.stargazerCount}</text>
      <text x="${x + width - 68}" y="${y + height - 28}" class="meta">⑂ ${repo.forkCount}</text>
    </a>`;
}

function buildProjects(repositories) {
    const positions = [
        [585, 405],
        [585, 625],
        [585, 845],
        [585, 1065]
    ];

    if (!repositories.length) {
        return `
        <rect x="585" y="405" width="555" height="185" rx="12" class="card"/>
        <text x="613" y="490" class="desc">No pinned repositories found.</text>
        <text x="613" y="530" class="meta">Pin repositories on GitHub to populate this panel.</text>`;
    }

    return repositories.slice(0, 4).map((repo, i) =>
        projectCard(repo, positions[i][0], positions[i][1], 555, 185, i + 1)
    ).join("\n");
}

function updateSvg(repositories) {
    let svg = fs.readFileSync(SVG_FILE, "utf8");

    const start = svg.indexOf("<!-- AUTO_PROJECTS_START -->");
    const end = svg.indexOf("<!-- AUTO_PROJECTS_END -->");

    if (start !== -1 && end !== -1) {
        const replacement = `<!-- AUTO_PROJECTS_START -->\n${buildProjects(repositories)}\n<!-- AUTO_PROJECTS_END -->`;
        svg = svg.slice(0, start) + replacement + svg.slice(end + "<!-- AUTO_PROJECTS_END -->".length);
        fs.writeFileSync(SVG_FILE, svg, "utf8");
        return;
    }

    // Initial template uses the project area directly; replace the card region
    // between the project heading and the bottom learning section.
    const projectHeading = '<text x="850" y="308" class="command">ls ~/featured-projects</text>';
    const bottomLine = '<!-- bottom learning process -->';

    const start2 = svg.indexOf(projectHeading);
    const end2 = svg.indexOf(bottomLine);

    if (start2 === -1 || end2 === -1) {
        throw new Error("Could not locate project section in profile-terminal.svg.");
    }

    const before = svg.slice(0, start2 + projectHeading.length);
    const after = svg.slice(end2);

    svg = `${before}\n<!-- AUTO_PROJECTS_START -->\n${buildProjects(repositories)}\n<!-- AUTO_PROJECTS_END -->\n\n${after}`;
    fs.writeFileSync(SVG_FILE, svg, "utf8");
}

async function main() {
    console.log(`Fetching pinned repositories for ${USERNAME}...`);
    const repositories = await getPinnedRepositories();
    console.log(`Found ${repositories.length} pinned repositories.`);

    repositories.forEach((repo, index) => {
        console.log(`${index + 1}. ${repo.name}`);
    });

    updateSvg(repositories);
    console.log(`${SVG_FILE} updated successfully.`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
