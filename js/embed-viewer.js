/**
 * Visor embebido in-page para URLs externas (iframe),
 * con estilo similar al modal de PDF.
 */
(function () {
  "use strict";

  var EXTERNAL_ICON =
    '<svg class="embed-modal-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42L17.59 5H14V3z"/>' +
    '<path fill="currentColor" d="M5 5h6v2H7v10h10v-4h2v6H5V5z"/>' +
    "</svg>";

  /** Hosts that refuse iframes (X-Frame-Options / CSP / bot walls). */
  var BLOCKED_EMBED_HOSTS = [
    "academia.edu",
    "www.academia.edu",
    "revistas.unc.edu.ar",
    "ojs.ides.org.ar",
    "canva.com",
    "www.canva.com",
    "facebook.com",
    "www.facebook.com",
    "instagram.com",
    "www.instagram.com",
    "linkedin.com",
    "www.linkedin.com",
    "x.com",
    "twitter.com",
    "www.twitter.com",
  ];

  var overlay = null;
  var iframe = null;
  var titleEl = null;
  var fallbackEl = null;
  var openExternalBtn = null;
  var isOpen = false;
  var currentUrl = "";
  var loadTimer = null;

  function getLanguage() {
    return localStorage.getItem("language") || "es";
  }

  function ensureDom() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "embed-modal-overlay";
    overlay.className = "embed-modal-overlay";
    overlay.style.display = "none";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "embed-modal-title");
    overlay.innerHTML =
      '<header class="embed-modal-toolbar">' +
      '  <p id="embed-modal-title" class="embed-modal-title" aria-live="polite"></p>' +
      '  <div class="embed-modal-toolbar-actions">' +
      '    <button type="button" class="embed-modal-external" data-es-aria="Abrir fuera" data-en-aria="Open externally" aria-label="Abrir fuera" title="Abrir fuera">' +
      EXTERNAL_ICON +
      "</button>" +
      '    <button type="button" class="embed-modal-close" data-es-aria="Cerrar" data-en-aria="Close" aria-label="Cerrar">&times;</button>' +
      "  </div>" +
      "</header>" +
      '<div class="embed-modal-stage">' +
      '  <iframe class="embed-modal-frame" title="Contenido embebido" referrerpolicy="no-referrer-when-downgrade" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
      '  <div class="embed-modal-fallback" hidden>' +
      '    <p class="embed-modal-fallback-text" data-es="Este sitio no permite verse dentro de Cicatriz. Podés abrirlo en una pestaña nueva; el mapa sigue abierto." data-en="This site does not allow embedding inside Cicatriz. You can open it in a new tab; the map stays open."></p>' +
      '    <button type="button" class="embed-modal-fallback-btn" data-es="Abrir enlace" data-en="Open link">Abrir enlace</button>' +
      "  </div>" +
      "</div>";

    document.body.appendChild(overlay);
    iframe = overlay.querySelector(".embed-modal-frame");
    titleEl = overlay.querySelector("#embed-modal-title");
    fallbackEl = overlay.querySelector(".embed-modal-fallback");
    openExternalBtn = overlay.querySelector(".embed-modal-external");

    overlay.querySelector(".embed-modal-close").addEventListener("click", close);
    openExternalBtn.addEventListener("click", openExternal);
    overlay
      .querySelector(".embed-modal-fallback-btn")
      .addEventListener("click", openExternal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
    });
  }

  function applyI18n() {
    var lang = getLanguage();
    if (!overlay) return;
    overlay.querySelectorAll("[data-es][data-en]").forEach(function (el) {
      el.textContent = el.getAttribute("data-" + lang) || el.textContent;
    });
    overlay.querySelectorAll("[data-es-aria][data-en-aria]").forEach(function (el) {
      var label =
        el.getAttribute("data-" + lang + "-aria") ||
        el.getAttribute("aria-label");
      el.setAttribute("aria-label", label);
      if (el.classList.contains("embed-modal-external")) {
        el.setAttribute("title", label);
      }
    });
  }

  function hostOf(rawUrl) {
    try {
      return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
    } catch (err) {
      return "";
    }
  }

  function cannotEmbed(rawUrl) {
    var host = hostOf(rawUrl);
    if (!host) return false;
    for (var i = 0; i < BLOCKED_EMBED_HOSTS.length; i++) {
      var blocked = BLOCKED_EMBED_HOSTS[i].replace(/^www\./, "");
      if (host === blocked || host.endsWith("." + blocked)) return true;
    }
    return false;
  }

  /**
   * Rewrite known hosts to an embeddable URL when possible.
   */
  function toEmbedUrl(rawUrl) {
    var url;
    try {
      url = new URL(rawUrl);
    } catch (err) {
      return rawUrl;
    }

    var host = url.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtu.be") {
      var ytId = url.pathname.replace(/^\//, "").split("/")[0];
      if (ytId) return "https://www.youtube.com/embed/" + encodeURIComponent(ytId);
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      var v = url.searchParams.get("v");
      if (!v && url.pathname.indexOf("/embed/") === 0) return url.toString();
      if (!v && url.pathname.indexOf("/shorts/") === 0) {
        v = url.pathname.split("/")[2];
      }
      if (v) return "https://www.youtube.com/embed/" + encodeURIComponent(v);
    }

    // Spotify
    if (host === "open.spotify.com") {
      var parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] && parts[0].indexOf("intl-") === 0) parts.shift();
      if (parts.length >= 2) {
        return (
          "https://open.spotify.com/embed/" + parts[0] + "/" + parts[1]
        );
      }
    }

    // Google Docs → preview
    if (host === "docs.google.com") {
      var docMatch = url.pathname.match(/\/document\/d\/([^/]+)(?:\/|$)/);
      if (docMatch) {
        return (
          "https://docs.google.com/document/d/" + docMatch[1] + "/preview"
        );
      }
    }

    return url.toString();
  }

  function showFallback(show) {
    if (!fallbackEl || !iframe) return;
    if (show) {
      fallbackEl.hidden = false;
      iframe.style.visibility = "hidden";
      iframe.removeAttribute("src");
      iframe.src = "about:blank";
    } else {
      fallbackEl.hidden = true;
      iframe.style.visibility = "visible";
    }
  }

  function openExternal() {
    if (!currentUrl) return;
    window.open(currentUrl, "_blank", "noopener,noreferrer");
  }

  function open(url, title) {
    if (!url) return;
    ensureDom();
    applyI18n();

    currentUrl = url;
    if (titleEl) {
      titleEl.textContent = title || url;
    }

    if (loadTimer) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }

    overlay.style.display = "flex";
    isOpen = true;
    document.body.style.overflow = "hidden";

    // Academia / revistas / etc. block iframes — skip the broken frame
    if (cannotEmbed(url)) {
      showFallback(true);
      return;
    }

    showFallback(false);
    var embedUrl = toEmbedUrl(url);
    iframe.src = "about:blank";
    requestAnimationFrame(function () {
      iframe.src = embedUrl;
    });

    // Soft fallback if the frame stays empty (rare same-origin edge cases)
    loadTimer = setTimeout(function () {
      loadTimer = null;
      try {
        var doc = iframe.contentDocument;
        if (doc && (!doc.body || !String(doc.body.innerHTML || "").trim())) {
          showFallback(true);
        }
      } catch (err) {
        /* cross-origin: assume embed OK; user still has the icon */
      }
    }, 3200);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (loadTimer) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }
    if (iframe) iframe.src = "about:blank";
    currentUrl = "";
    showFallback(false);
    if (overlay) overlay.style.display = "none";

    var pdfOpen =
      window.PdfModal && window.PdfModal.isOpen && window.PdfModal.isOpen();
    var mapOpen =
      window.ProcessGraph &&
      window.ProcessGraph.isOpen &&
      window.ProcessGraph.isOpen();
    if (!pdfOpen && !mapOpen) {
      document.body.style.overflow = "";
    }
  }

  window.EmbedViewer = {
    open: open,
    close: close,
    isOpen: function () {
      return isOpen;
    },
  };
})();
