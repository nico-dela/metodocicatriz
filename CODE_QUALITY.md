# CODE_QUALITY.md

Referencia de estándares del proyecto. El agente la consulta antes de generar código (ver AGENTS.md §1); vos la mantenés y ajustás con el tiempo.

## Naming

- Nombres descriptivos, sin abreviaturas crípticas (`openPdfModal`, no `opm`).
- Funciones: verbo + sustantivo (`loadManifest`, no `data2`).
- Booleanos con prefijo `is`/`has`/`can` (`isValid`, `hasLink`).

## Estructura de funciones

- Una función, una responsabilidad.
- Máximo ~30 líneas como guía blanda; si la supera, evaluar extracción.
- Early returns en vez de anidar condicionales.
- Evitar parámetros booleanos que cambien el comportamiento de la función (preferir dos funciones separadas).

## Manejo de errores

- No silenciar excepciones sin loggear o re-lanzar.
- Errores esperables (validación, input de usuario, PDF faltante) se manejan explícitamente; errores inesperados se propagan.
- Mensajes de error accionables: qué pasó, no solo "error".

## Comentarios

- El código explica el "qué"; el comentario explica el "por qué" cuando no es obvio.
- Nada de comentarios que repitan literalmente lo que dice la línea de abajo.
- Sin bloques grandes de código comentado — se borra, para eso está git.

## Tests

- Hoy no hay suite. Cuando exista: un test por comportamiento; nombres que describen el escenario; mocks solo en los bordes (I/O, red, tiempo).

## Dependencias

- Antes de agregar una librería/CDN nueva: ¿esto ya lo resuelve algo que ya está en el proyecto?
- Preferir librerías mantenidas activamente.

## Git / commits

- Un commit, un cambio lógico.
- Mensaje en imperativo: "agrega validación de email", no "agregado" ni "agregando".

## Notas del proyecto

- Respetar bilingüismo: atributos `data-es`/`data-en` y bloques `data-lang="es|en"`.
- Tipografía de marca: `C_tesis`, `DINNextLTPro` — no sustituir por stacks genéricos (Inter, system, etc.).
- PDFs: referenciar por **filename** en el manifiesto (`"file": "..."`), no URLs absolutas. No abrir binarios PDF para “leerlos”; copiar/reemplazar por shell.
- Archivos `*.from-home` son drafts; no promoverlos a live sin que el usuario lo pida.
- Si ya hay PDF local, no agregar FlipSnack u otros embeds externos para el mismo ítem.
- Preferir cambios mínimos alineados al CSS/JS existente; no rediseñar de paso.
