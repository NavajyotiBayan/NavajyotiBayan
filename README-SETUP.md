# Neon Cyber Terminal Profile

Replace these files in the `NavajyotiBayan` profile repository:

- `README.md`
- `fetch_repos.js`
- `.github/workflows/update-readme.yml`

This version intentionally does NOT use fenced code blocks for the visual UI. That avoids GitHub's large gray code-block presentation and copy buttons.

The terminal look is created from GitHub-supported HTML/Markdown elements, badges, tables, and an external animated typing header.

The Featured Projects section is generated from your GitHub pinned repositories by `fetch_repos.js`.

After pushing with GitHub Desktop, you can manually run:

GitHub repository → Actions → Update Featured Projects → Run workflow

The scheduled workflow also refreshes the pinned-project section daily.
