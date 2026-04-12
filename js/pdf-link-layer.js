/**
 * Capa HTML de anotaciones tipo enlace sobre el canvas de PDF.js.
 * El render solo pinta en canvas; los enlaces URI hay que superponerlos a mano.
 */
(function (global) {
  "use strict";

  function linkUrlFromAnnotation(data) {
    if (data.url && typeof data.url === "string") {
      return data.url;
    }
    if (data.unsafeUrl && typeof data.unsafeUrl === "string") {
      return data.unsafeUrl;
    }
    return null;
  }

  function isAllowedExternalUrl(href) {
    try {
      const u = new URL(href, global.location.href);
      return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:";
    } catch (e) {
      return false;
    }
  }

  function unionPercentRects(items) {
    const byHref = new Map();
    for (const it of items) {
      if (!byHref.has(it.href)) {
        byHref.set(it.href, []);
      }
      byHref.get(it.href).push(it);
    }
    const merged = [];
    for (const [href, rects] of byHref) {
      let minL = Infinity;
      let minT = Infinity;
      let maxR = -Infinity;
      let maxB = -Infinity;
      for (const r of rects) {
        const right = r.left + r.w;
        const bottom = r.top + r.h;
        minL = Math.min(minL, r.left);
        minT = Math.min(minT, r.top);
        maxR = Math.max(maxR, right);
        maxB = Math.max(maxB, bottom);
      }
      merged.push({
        href: href,
        left: minL,
        top: minT,
        w: maxR - minL,
        h: maxB - minT,
      });
    }
    return merged;
  }

  async function attachPdfLinkAnnotations(page, linkLayer, viewport) {
    if (!global.pdfjsLib || !linkLayer || !viewport) {
      return;
    }

    let annotations;
    try {
      annotations = await page.getAnnotations({ intent: "display" });
    } catch (e) {
      return;
    }

    const AnnotationType = global.pdfjsLib.AnnotationType;
    const vw = viewport.width;
    const vh = viewport.height;
    const raw = [];

    for (const data of annotations) {
      try {
        const isLink =
          data.annotationType === AnnotationType.LINK || data.subtype === "Link";
        if (!isLink) {
          continue;
        }

        const href = linkUrlFromAnnotation(data);
        if (!href || !isAllowedExternalUrl(href)) {
          continue;
        }

        if (
          !data.rect ||
          typeof data.rect.length !== "number" ||
          data.rect.length < 4
        ) {
          continue;
        }

        const rect = viewport.convertToViewportRectangle(data.rect);
        const x1 = rect[0];
        const y1 = rect[1];
        const x2 = rect[2];
        const y2 = rect[3];
        const left = (Math.min(x1, x2) / vw) * 100;
        const top = (Math.min(y1, y2) / vh) * 100;
        const w = (Math.abs(x2 - x1) / vw) * 100;
        const h = (Math.abs(y2 - y1) / vh) * 100;

        if (w <= 0 || h <= 0 || !isFinite(left + top + w + h)) {
          continue;
        }

        raw.push({ href: href, left: left, top: top, w: w, h: h });
      } catch (e) {
        // ignorar anotación suelta
      }
    }

    const merged = unionPercentRects(raw);

    for (const box of merged) {
      const a = document.createElement("a");
      a.href = box.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "pdf-link-annotation";
      a.setAttribute("aria-label", "Abrir enlace en nueva pestaña");
      a.style.cssText = [
        "position:absolute",
        "left:" + box.left + "%",
        "top:" + box.top + "%",
        "width:" + box.w + "%",
        "height:" + box.h + "%",
        "min-height:32px",
        "box-sizing:border-box",
      ].join(";");
      linkLayer.appendChild(a);
    }
  }

  function wrapCanvasForPdfLinks(canvas) {
    const wrap = document.createElement("div");
    wrap.className = "pdf-page-canvas-wrap";
    wrap.style.cssText =
      "position:relative;display:inline-block;max-width:100%;line-height:0;vertical-align:top;isolation:isolate;";
    canvas.style.position = "relative";
    canvas.style.zIndex = "0";
    canvas.style.pointerEvents = "none";

    const linkLayer = document.createElement("div");
    linkLayer.className = "pdf-link-layer";
    linkLayer.style.cssText =
      "position:absolute;inset:0;z-index:1;pointer-events:auto;";

    wrap.appendChild(canvas);
    wrap.appendChild(linkLayer);
    return { wrap: wrap, linkLayer: linkLayer };
  }

  global.attachPdfLinkAnnotations = attachPdfLinkAnnotations;
  global.wrapCanvasForPdfLinks = wrapCanvasForPdfLinks;
})(typeof window !== "undefined" ? window : globalThis);
