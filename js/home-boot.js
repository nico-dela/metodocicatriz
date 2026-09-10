/**
 * Home boot: lazy-load PDF stack and process map on interaction.
 */
(function () {
  "use strict";

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () {
        resolve();
      };
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  var pdfStackPromise = null;
  function ensurePdfStack() {
    if (window.PdfModal) return Promise.resolve();
    if (pdfStackPromise) return pdfStackPromise;
    pdfStackPromise = loadScript("js/pdf-link-layer.js")
      .then(function () {
        return loadScript("js/embed-viewer.js");
      })
      .then(function () {
        return loadScript("js/random-pdf.js");
      });
    return pdfStackPromise;
  }

  var mapLoaded = false;
  function loadMap() {
    if (mapLoaded) return;
    mapLoaded = true;
    if (!document.getElementById("process-graph-css")) {
      var link = document.createElement("link");
      link.id = "process-graph-css";
      link.rel = "stylesheet";
      link.href = "css/process-graph.css";
      document.head.appendChild(link);
    }
    var script = document.createElement("script");
    script.src = "js/process-graph.js";
    script.onload = function () {
      if (
        window.ProcessGraph &&
        typeof window.ProcessGraph.open === "function"
      ) {
        window.ProcessGraph.open();
      }
    };
    document.body.appendChild(script);
  }

  function bind() {
    var pdfBtn = document.getElementById("random-pdf-btn");
    if (pdfBtn) {
      var warm = function () {
        ensurePdfStack().catch(function () {});
      };
      pdfBtn.addEventListener("pointerenter", warm, { once: true });
      pdfBtn.addEventListener("focus", warm, { once: true });
      pdfBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        ensurePdfStack()
          .then(function () {
            if (
              window.PdfModal &&
              typeof window.PdfModal.openRandom === "function"
            ) {
              window.PdfModal.openRandom();
            }
          })
          .catch(function (err) {
            console.error(err);
          });
      });
    }

    var mapBtn = document.getElementById("process-map-btn");
    if (!mapBtn) return;
    mapBtn.addEventListener(
      "pointerenter",
      function () {
        if (document.getElementById("process-graph-css")) return;
        var link = document.createElement("link");
        link.id = "process-graph-css";
        link.rel = "stylesheet";
        link.href = "css/process-graph.css";
        document.head.appendChild(link);
      },
      { once: true },
    );
    mapBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (
        window.ProcessGraph &&
        typeof window.ProcessGraph.open === "function"
      ) {
        window.ProcessGraph.open();
        return;
      }
      loadMap();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
