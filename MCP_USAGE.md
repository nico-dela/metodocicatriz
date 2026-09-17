# MCP_USAGE.md

Qué MCPs / tools conviene usar en este proyecto y cuándo. Sin esta guía, el agente tiende a usar MCPs "por si acaso" o a ignorarlos y alucinar.

## Criterio general

- Un MCP se usa cuando la alternativa es que el agente **alucine o asuma** algo que el MCP puede confirmar.
- Si la info ya está en el código o en `AGENTS.md`/`CODE_QUALITY.md`, no hace falta el MCP.
- Ante la duda, decilo explícitamente ("podría confirmar esto con el browser") en vez de decidir en silencio.

---

## Tools / MCPs relevantes

### cursor-ide-browser

- **Usar cuando**: hay que verificar layout visual tras cambios en home, bio, pdf-viewer, process-graph, tipografía o CSS.
- **No usar cuando**: la tarea es solo editar texto/JSON/manifiestos y no hay duda visual.
- **Riesgo si no se usa**: romper layout mobile/desktop sin darse cuenta.

### WebFetch / WebSearch (tools Cursor)

- **Usar cuando**: hace falta confirmar una API externa, docs de PDF.js/CDN, o un recurso remoto citado en la tarea.
- **No usar cuando**: la respuesta está en el repo.
- **Riesgo si no se usa**: código contra una API/CDN desactualizada.

### Figma MCP

- **Usar cuando**: la tarea menciona Figma o un diseño en Figma.
- **No usar cuando**: no hay diseño Figma involucrado (caso habitual de este sitio).

### DB / tickets / filesystem MCP

- No aplican a este proyecto estático. No inventarlos ni buscarlos "por si acaso".

---

## Orden de prioridad

1. Código/archivos del proyecto
2. Browser MCP para QA visual
3. Docs externas (WebFetch/Search)
4. Web search genérico — último recurso

## Señal de sobrecarga

Si el agente elige mal qué tool usar, revisar esta lista y desactivar lo que no se usó en las últimas sesiones.
