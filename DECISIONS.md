# DECISIONS.md

Log de sesiones de trabajo. Entrada corta al cerrar cada sesión no trivial — no reemplaza al historial de git, complementa el "por qué" que el diff no cuenta.

Cursor recupera contexto vía `AGENTS.md`, `CODE_QUALITY.md` y `.cursorrules`; este archivo aporta el historial de decisiones del proyecto.

---

## Formato de cada entrada

```markdown
## YYYY-MM-DD HH:MM:ss — <título corto del cambio>
- Qué: <qué se hizo, una línea>
- Por qué: <la decisión de diseño o el problema que resolvía>
- Descartado: <si evaluaste otra alternativa y la descartaste, cuál y por qué>
- Pendiente: <qué queda para la próxima sesión, si algo>
```

---

<!-- Nuevas entradas abajo de esta línea -->

## 2026-09-17 20:27:00 — Compresión web de PDFs de portfolio

- Qué: recomprimí 7 PDFs pesados con Ghostscript (200 dpi, JPEGQ 85); total ~188 MB → ~147 MB.
- Por qué: mejorar tiempo de carga del visor PDF.js en Netlify preview sin bajar a preset `/ebook`.
- Descartado: compresión lossless-only (casi no reduce) y `/ebook` (demasiado agresivo).
- Pendiente: si hace falta más ahorro en Maizena/Ensayo (~89 % del original), re-pasar esos a 150 dpi.

## 2026-09-17 20:15:00 — PDFs actualizados, fanzines locales, bio y guía Cursor

- Qué: reemplacé 7 PDFs en `assets/pdfs/`, agregué 3 fanzines (antes FlipSnack), actualicé bio ES/EN, y creé `AGENTS.md` / `CODE_QUALITY.md` / `DECISIONS.md` / `MCP_USAGE.md` + `.cursorrules` / `.cursorignore`.
- Por qué: el cliente envió versiones corregidas de los PDFs y fanzines locales; la bio nueva refleja el doctorado ya obtenido y KeyLab; hace falta denylist para que Cursor no indexe binarios pesados.
- Descartado: dejar FlipSnack como fallback — con PDF local el visor in-page es suficiente.
- Pendiente: promover `*.from-home` (process-graph / home) a live si se confirma el rediseño; revisar tamaño de deploy Netlify (~190 MB solo en PDFs nuevos).
