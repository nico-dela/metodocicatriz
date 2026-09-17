# AGENTS.md

## Project Context

- **Stack**: sitio estático HTML/CSS/JS vanilla. Deploy en Netlify (`netlify.toml`, publish `.`, sin build). PDF.js vía CDN (`cdnjs.cloudflare.com`). i18n ES/EN con atributos `data-es`/`data-en` y `js/translations.js`.
- **Test command**: no hay suite de tests.
- **Lint command**: no hay linter configurado.
- **Build command**: ninguno (sitio estático). Preview local con cualquier servidor HTTP estático; deploy = push a la rama `preview` (ver `DEPLOY-PREVIEW.md`).
- **Estructura relevante**:
  - `index.html`, `main.js` — home
  - `pages/` — bio, pdf-viewer
  - `css/`, `js/` — estilos y módulos
  - `assets/fonts/`, `assets/images/`, `assets/pdfs/` — assets
  - `assets/pdfs/manifest.json` — catálogo live de PDFs/procesos
  - `*.from-home` — drafts de una evolución del home/process-graph (no promover a live sin pedirlo)
- **Naming**: archivos en kebab-case; PDFs existentes pueden tener espacios/años en el nombre (no renombrar). JS en camelCase.

---

## 1. Antes de generar código

- Revisá si `CODE_QUALITY.md` tiene una regla aplicable a lo que estás por hacer. Si la hay, decilo explícitamente antes de escribir código.
- Revisá `DECISIONS.md` si existe: puede haber contexto de por qué algo está hecho de determinada forma.
- Revisá `MCP_USAGE.md` antes de usar un MCP.

## 2. Tests

- No hay suite. No generes tests salvo que el usuario lo pida o se introduzca tooling de tests.
- Si se agregan tests en el futuro: caso feliz, un edge case, un caso de error/input inválido; sin aserciones triviales solo para cobertura.

## 3. Complejidad ciclomática

- Objetivo por función **nueva**: ≤7. Máximo aceptable: 10.
- Si la superás, refactorizá antes de entregar: extraer funciones con nombre descriptivo → early returns → polimorfismo/strategy si hay ramas por tipo.
- No refactorizar de paso archivos grandes existentes (`process-graph.js`, etc.) salvo que la tarea lo pida.

## 4. Seguridad — checklist antes de dar por terminada la tarea

- [ ] Sin credenciales, tokens o keys hardcodeadas
- [ ] Input validado en puntos de entrada (query params, URLs externas al embed)
- [ ] Sin riesgo de inyección (HTML/URL)
- [ ] Sin datos sensibles en logs

Si algo es ambiguo, decilo en la respuesta en vez de asumir.

## 5. Arquitectura y dependencias

- Respetá las capas existentes (HTML → CSS → JS modules); no cruces boundaries sin avisar.
- No agregues una dependencia nueva (CDN o npm) sin justificar por qué.
- Buscá antes de escribir: no dupliques lógica existente.

## 6. Calidad general

DEBE: naming descriptivo, seguir patrones del proyecto, no romper i18n ES/EN.
NO DEBE: dejar bloques comentados grandes, TODOs de lógica placeholder, optimizaciones especulativas no pedidas.

## 7. Al cerrar una sesión de trabajo

- Si tocaste algo no trivial, agregá una entrada breve en `DECISIONS.md` con: qué se hizo, por qué, qué queda pendiente.

## 8. Si no podés explicar tu propio código

Decilo explícitamente en la respuesta en vez de entregarlo como si fuera obvio.
