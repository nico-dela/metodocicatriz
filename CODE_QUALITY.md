# CODE_QUALITY.md

Project standards reference. The agent checks it before generating code (see AGENTS.md §1); keep it and adjust it over time.

## Naming

- Descriptive names, no cryptic abbreviations (`openPdfModal`, not `opm`).
- Functions: verb + noun (`loadManifest`, not `data2`).
- Booleans prefixed with `is`/`has`/`can` (`isValid`, `hasLink`).

## Function structure

- One function, one responsibility.
- About 30 lines as a soft guide; if it exceeds that, consider extracting.
- Early returns instead of nested conditionals.
- Avoid boolean parameters that change the function's behavior (prefer two separate functions).

## Error handling

- Do not swallow exceptions without logging or re-raising.
- Expected errors (validation, user input, missing PDF) are handled explicitly; unexpected errors propagate.
- Actionable error messages: what happened, not just "error".

## Comments

- Code explains the "what"; a comment explains the "why" when it is not obvious.
- No comments that literally repeat the line below.
- No large blocks of commented-out code — delete them; that is what git is for.

## Tests

- There is no suite today. When one exists: one test per behavior; names that describe the scenario; mocks only at the edges (I/O, network, time).

## Dependencies

- Before adding a new library or CDN: does something already in the project solve this?
- Prefer actively maintained libraries.

## Git / commits

- One commit, one logical change.
- Imperative message, in English: "add email validation", not "added" or "adding".

## Project notes

- Respect bilingual copy: `data-es`/`data-en` attributes and `data-lang="es|en"` blocks.
- Brand type: `C_tesis`, `DINNextLTPro` — do not replace them with generic stacks (Inter, system, and so on).
- PDFs: reference them by **filename** in the manifest (`"file": "..."`), not absolute URLs. Do not open PDF binaries to "read" them; copy or replace them via the shell.
- `*.from-home` files are drafts; do not promote them to live unless the user asks.
- If a local PDF already exists, do not add FlipSnack or other external embeds for the same item.
- Prefer minimal changes aligned with existing CSS/JS; do not redesign in passing.
