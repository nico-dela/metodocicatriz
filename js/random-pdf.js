(function () {
  "use strict";

  let pdfFiles = [];
  let modal = null;
  let isOpen = false;
  let isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  function getPaths() {
    const isInSubdir = window.location.pathname.includes("/pages/");
    return {
      manifest: isInSubdir
        ? "../assets/pdfs/manifest.json"
        : "./assets/pdfs/manifest.json",
      assets: isInSubdir ? "../assets/pdfs/" : "./assets/pdfs/",
    };
  }

  async function loadManifest() {
    const paths = getPaths();
    try {
      const response = await fetch(paths.manifest);
      if (response.ok) {
        const data = await response.json();
        pdfFiles = data.pdfs || [];
      }
    } catch (error) {
      console.warn("No se pudo cargar el manifest de PDFs");
    }
  }

  function createModal() {
    if (document.getElementById("pdf-modal-overlay")) {
      modal = document.getElementById("pdf-modal-overlay");
      return;
    }

    const modalHTML = `
      <div id="pdf-modal-overlay" class="pdf-modal-overlay">
        <button class="pdf-modal-close">&times;</button>
        <div id="pdf-modal-content"></div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    modal = document.getElementById("pdf-modal-overlay");

    modal
      .querySelector(".pdf-modal-close")
      .addEventListener("click", closeModal);

    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });

    if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
  }

  async function loadPdfInModal(pdfUrl) {
    const content = document.getElementById("pdf-modal-content");
    if (!content) return;

    content.innerHTML = "";

    try {
      if (!window.pdfjsLib) {
        throw new Error("PDF.js no disponible");
      }

      const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        await renderPageForMobileQuality(pdfDoc, pageNum, content);
      }
    } catch (error) {
      console.error("Error cargando PDF:", error);
      content.innerHTML = `<p style="color: white; text-align: center; padding: 20px;">Error</p>`;
    }
  }

  async function renderPageForMobileQuality(pdfDoc, pageNum, container) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const originalWidth = viewport.width;
      const originalHeight = viewport.height;
      const isLandscape = originalWidth > originalHeight;

      // **LA CLAVE ESTÁ AQUÍ:**
      let scale;

      if (isMobile) {
        // Para móvil: NO reducir demasiado la escala
        if (isLandscape) {
          // PDF horizontal: mantener buena calidad aunque sea ancho
          // En lugar de ajustar al ancho de pantalla, usar escala fija
          scale = 0.9; // 90% del tamaño original (más grande, mejor calidad)
        } else {
          // PDF vertical: ajustar al ancho pero con escala mínima
          const containerWidth = window.innerWidth - 20;
          scale = (containerWidth * 0.9) / originalWidth; // 90% del ancho
          scale = Math.max(scale, 0.7); // Mínimo 70% para mantener calidad
        }
      } else {
        // Desktop: escala normal
        const containerWidth = window.innerWidth - 100;
        scale = containerWidth / originalWidth;
      }

      const renderViewport = page.getViewport({ scale: scale });

      const pageDiv = document.createElement("div");
      pageDiv.className = "pdf-page-container";

      const canvas = document.createElement("canvas");

      // **RENDERIZAR CON MEJOR CALIDAD:**
      const pixelRatio = window.devicePixelRatio || 1;
      const qualityMultiplier = isMobile ? Math.min(pixelRatio, 1.5) : 1;

      canvas.width = renderViewport.width * qualityMultiplier;
      canvas.height = renderViewport.height * qualityMultiplier;

      // Tamaño visual (más pequeño que el renderizado para calidad)
      canvas.style.width = renderViewport.width + "px";
      canvas.style.height = renderViewport.height + "px";
      canvas.style.maxWidth = "100%";
      canvas.style.height = "auto";

      pageDiv.appendChild(canvas);
      container.appendChild(pageDiv);

      const ctx = canvas.getContext("2d");

      // Escalar contexto si renderizamos más grande
      if (qualityMultiplier > 1) {
        ctx.scale(qualityMultiplier, qualityMultiplier);
      }

      const renderContext = {
        canvasContext: ctx,
        viewport: renderViewport,
      };

      await page.render(renderContext).promise;

      // **APLICAR FILTRO DE NITIDEZ PARA MÓVIL:**
      if (isMobile) {
        canvas.style.imageRendering = "crisp-edges";
        canvas.style.webkitFontSmoothing = "antialiased";
      }
    } catch (error) {
      console.error("Error en página " + pageNum + ":", error);
    }
  }

  function openPdf(pdfFile) {
    if (!modal) return;

    const paths = getPaths();
    const pdfUrl = paths.assets + pdfFile;

    modal.style.display = "block";
    document.body.style.overflow = "hidden";
    isOpen = true;

    loadPdfInModal(pdfUrl);
  }

  function openRandomPdf() {
    if (pdfFiles.length === 0) return;
    const randomIndex = Math.floor(Math.random() * pdfFiles.length);
    openPdf(pdfFiles[randomIndex]);
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "";
    isOpen = false;
    setTimeout(() => {
      const content = document.getElementById("pdf-modal-content");
      if (content) content.innerHTML = "";
    }, 300);
  }

  function bindPdfLinks() {
    document
      .querySelectorAll('a[href*="pdf-viewer.html"]')
      .forEach(function (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          const href = this.getAttribute("href");
          const queryString = href.split("?")[1];
          if (queryString) {
            const urlParams = new URLSearchParams(queryString);
            const pdfFile = urlParams.get("pdf");
            if (pdfFile) openPdf(pdfFile);
          }
        });
      });
  }

  function bindRandomButton() {
    const button = document.getElementById("random-pdf-btn");
    if (button) {
      button.addEventListener("click", function (e) {
        e.preventDefault();
        openRandomPdf();
      });
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) closeModal();
  }

  async function init() {
    if (!window.pdfjsLib) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = async () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        await loadManifest();
        createModal();
        bindRandomButton();
        bindPdfLinks();
        document.addEventListener("keydown", handleKeydown);
      };
      document.head.appendChild(script);
    } else {
      await loadManifest();
      createModal();
      bindRandomButton();
      bindPdfLinks();
      document.addEventListener("keydown", handleKeydown);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.PdfModal = {
    open: openPdf,
    openRandom: openRandomPdf,
    close: closeModal,
  };
})();
