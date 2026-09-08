# Preview en Netlify — Método Cicatriz

La demo para el cliente se publica desde la rama **`preview`**.  
Cada `push` a esa rama actualiza el sitio en Netlify (una vez conectado el repo).

## Setup (una sola vez)

1. Entrá a [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Conectá el repo `nico-dela/metodocicatriz`
3. Configuración:
   - **Branch to deploy:** `preview`
   - **Build command:** *(vacío)*
   - **Publish directory:** `.`
4. Deploy. Netlify te da una URL tipo `https://….netlify.app`

Podés fijar un subdomain legible en **Site settings → Domain management**  
(ej. `metodocicatriz-preview.netlify.app`).

## Flujo de trabajo

```bash
# Trabajar en main o en una feature…
git checkout preview
git merge main          # o cherry-pick / rebase
git push origin preview # → Netlify redeploy automático
```

O pushear commits directo a `preview` mientras iterás con el cliente.

## Nota

La carpeta local `preview-netlify/` ya no es el camino recomendado (quedaba desactualizada).  
Usá la rama `preview` + Git ↔ Netlify.
