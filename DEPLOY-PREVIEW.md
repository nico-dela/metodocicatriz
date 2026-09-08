# Preview Netlify — Método Cicatriz (mapa de procesos PoC)

Carpeta lista para desplegar la versión de prueba con el **mapa-grafo de procesos**.

## Opción A — Drag & drop (más simple)

1. Entrá a https://app.netlify.com/drop  
2. Arrastrá la carpeta `preview-netlify` completa  
3. Netlify te da una URL tipo `https://random-name.netlify.app`  
4. Mandale esa URL a tu cliente  

## Opción B — Netlify CLI

```bash
npx netlify deploy --dir=preview-netlify
```

Para publicar en el sitio “production” del draft site:

```bash
npx netlify deploy --dir=preview-netlify --prod
```

## Contenido

Incluye home, bio, PDFs, y el PoC del mapa (`Mapa de procesos` + botón ☰ del visor).  
No incluye el `CNAME` de producción (`cicatriz.ar`) para no chocar con el dominio actual.
