# AGENTS.md

## Project Context

- **Stack**: static HTML/CSS/JS site. Deploy on Netlify (`netlify.toml`, publish `.`, no build). PDF.js via CDN (`cdnjs.cloudflare.com`). ES/EN i18n with `data-es`/`data-en` attributes and `js/translations.js`.
- **Test command**: no test suite.
- **Lint command**: no linter configured.
- **Build command**: none (static site). Local preview with any static HTTP server; deploy = push to the `preview` branch (see `DEPLOY-PREVIEW.md`).
- **Relevant layout**:
  - `index.html`, `main.js` — home
  - `pages/` — bio, pdf-viewer
  - `css/`, `js/` — styles and modules
  - `assets/fonts/`, `assets/images/`, `assets/pdfs/` — assets
  - `assets/pdfs/manifest.json` — live catalog of PDFs/processes
  - `*.from-home` — drafts of an evolution of the home/process-graph (do not promote to live unless asked)
- **Naming**: files in kebab-case; existing PDFs may have spaces or years in the name (do not rename). JS in camelCase.

---

## 1. Before generating code

- Check whether `CODE_QUALITY.md` has a rule that applies to what you are about to do. If it does, say so explicitly before writing code.
- Check `DECISIONS.md` if it exists: it may explain why something is done a certain way.
- Check `MCP_USAGE.md` before using an MCP.

## 2. Tests

- There is no suite. Do not generate tests unless the user asks or test tooling is introduced.
- If tests are added later: a happy path, one edge case, and one error or invalid-input case; no trivial assertions just for coverage.

## 3. Cyclomatic complexity

- Target per **new** function: ≤7. Acceptable maximum: 10.
- If you exceed it, refactor before delivering: extract functions with descriptive names → early returns → polymorphism or strategy when branches are by type.
- Do not refactor large existing files in passing (`process-graph.js`, and so on) unless the task asks for it.

## 4. Security — checklist before considering the task done

- [ ] No hardcoded credentials, tokens, or keys
- [ ] Input validated at entry points (query params, URLs external to the embed)
- [ ] No injection risk (HTML/URL)
- [ ] No sensitive data in logs

If something is ambiguous, say so in the reply instead of assuming.

## 5. Architecture and dependencies

- Respect existing layers (HTML → CSS → JS modules); do not cross boundaries without saying so.
- Do not add a new dependency (CDN or npm) without justifying why.
- Search before writing: do not duplicate existing logic.

## 6. General quality

MUST: descriptive naming, follow project patterns, and do not break ES/EN i18n.
MUST NOT: leave large commented-out blocks, placeholder-logic TODOs, or unrequested speculative optimizations.

## 7. When closing a work session

- If you touched something non-trivial, add a short entry to `DECISIONS.md` with what was done, why, and what is still pending.

## 8. If you cannot explain your own code

Say so explicitly in the reply instead of delivering it as if it were obvious.
