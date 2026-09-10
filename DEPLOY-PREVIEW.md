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

### PageSpeed y el HUD de Netlify

Mientras el proyecto esté **privado**, Netlify inyecta `/.netlify/scripts/hud` (~40 KB) en cada página. Eso aparece en PageSpeed como “Reduce unused JavaScript” / “Legacy JavaScript”.

Opciones:
1. En Netlify: **Project configuration → Project visibility → Make public** (el toolbar de pre-launch desaparece).
2. Ocultar el toolbar desde la UI del propio badge (solo afecta tu navegador).
3. El `Content-Security-Policy` del `netlify.toml` también bloquea el render del HUD.
