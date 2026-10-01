# MCP_USAGE.md

Which MCPs and tools are worth using in this project, and when. Without this guide, the agent tends to use MCPs "just in case" or to ignore them and hallucinate.

Explanations to the user about tool use are in English.

## General criterion

- Use an MCP when the alternative is that the agent **hallucinates or assumes** something the MCP can confirm.
- If the information is already in the code or in `AGENTS.md`/`CODE_QUALITY.md`, the MCP is unnecessary.
- When unsure, say so explicitly ("I could confirm this with the browser") instead of deciding in silence.

---

## Relevant tools / MCPs

### cursor-ide-browser

- **Use when**: visual layout must be checked after changes to home, bio, pdf-viewer, process-graph, typography, or CSS.
- **Do not use when**: the task is only editing text, JSON, or manifests and there is no visual doubt.
- **Risk if unused**: breaking mobile or desktop layout without noticing.

### WebFetch / WebSearch (Cursor tools)

- **Use when**: an external API, PDF.js/CDN docs, or a remote resource cited in the task must be confirmed.
- **Do not use when**: the answer is in the repo.
- **Risk if unused**: code against an outdated API or CDN.

### Figma MCP

- **Use when**: the task mentions Figma or a Figma design.
- **Do not use when**: no Figma design is involved (the usual case for this site).

### DB / tickets / filesystem MCP

- They do not apply to this static project. Do not invent them or look for them "just in case".

---

## Priority order

1. Project code and files
2. Browser MCP for visual QA
3. External docs (WebFetch/Search)
4. Generic web search — last resort

## Overload signal

If the agent picks the wrong tool, review this list and disable what was not used in recent sessions.
