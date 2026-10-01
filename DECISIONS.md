# DECISIONS.md

Work-session log. A short entry when closing each non-trivial session — it does not replace git history; it adds the "why" the diff does not tell.

Cursor recovers context via `AGENTS.md`, `CODE_QUALITY.md`, and `.cursorrules`; this file holds the project's decision history.

New entries are in English.

---

## Entry format

```markdown
## YYYY-MM-DD HH:MM:ss — <short title of the change>
- What: <what was done, one line>
- Why: <the design decision or the problem it solved>
- Rejected: <if you considered another option and dropped it, which one and why>
- Pending: <what is left for the next session, if anything>
```

---

<!-- New entries below this line -->

## 2026-09-19 13:35:00 — Fix PDF tap on the map (mobile)

- What: opening the map preloads the PDF stack; tapping a node with `file`, `openNode` waits for `PdfModal` (via `ensurePdfStack` / on-demand load) before opening the modal.
- Why: on mobile there is no hover on the random button, so `PdfModal` never loaded and PDF nodes failed silently; URL nodes kept working with `window.open` / EmbedViewer.
- Rejected: navigate to `pdf-viewer.html` — the in-page modal is already the canonical path.
- Pending: none.

## 2026-09-17 20:27:00 — Web compression of portfolio PDFs

- What: recompressed 7 heavy PDFs with Ghostscript (200 dpi, JPEGQ 85); total ~188 MB → ~147 MB.
- Why: improve PDF.js viewer load time on the Netlify preview without dropping to the `/ebook` preset.
- Rejected: lossless-only compression (barely reduces) and `/ebook` (too aggressive).
- Pending: if more savings are needed on Maizena/Ensayo (~89% of the original), re-run those at 150 dpi.

## 2026-09-17 20:15:00 — Updated PDFs, local fanzines, bio, and Cursor guide

- What: replaced 7 PDFs in `assets/pdfs/`, added 3 fanzines (previously FlipSnack), updated the ES/EN bio, and created `AGENTS.md` / `CODE_QUALITY.md` / `DECISIONS.md` / `MCP_USAGE.md` plus `.cursorrules` / `.cursorignore`.
- Why: the client sent corrected versions of the PDFs and local fanzines; the new bio reflects the completed doctorate and KeyLab; a denylist is needed so Cursor does not index heavy binaries.
- Rejected: keep FlipSnack as a fallback — with a local PDF the in-page viewer is enough.
- Pending: promote `*.from-home` (process-graph / home) to live if the redesign is confirmed; review the Netlify deploy size (~190 MB in new PDFs alone).
