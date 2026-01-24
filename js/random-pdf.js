/**
 * PDF Modal Module - Versión con desplazamiento y spinner
 */
(function () {
  "use strict";

  let pdfFiles = [];
  let modal = null;
  let isOpen = false;

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
      <div id="pdf-modal-overlay" class="pdf-modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 9999;
        display: none;
      ">
        <!-- Botón de cerrar (sin título) -->
        <button class="pdf-modal-close" style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 24px;
          cursor: pointer;
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
        ">&times;</button>
        
        <!-- Contenedor del PDF -->
        <div id="pdf-modal-content" style="
          width: 100%;
          height: 100%;
          overflow: auto;
          padding: 20px;
        "></div>
        
        <!-- Spinner de carga -->
        <div id="pdf-modal-loading" style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10000;
          display: none;
          text-align: center;
        ">
          <div class="pdf-modal-spinner" style="
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            margin: 0 auto 15px auto;
          "></div>
          <div style="color: white; font-family: sans-serif; font-size: 14px;">
          </div>
        </div>
      </div>
      
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          #pdf-modal-overlay .pdf-modal-spinner {
            width: 40px;
            height: 40px;
            border-width: 3px;
          }
        }
      </style>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    modal = document.getElementById("pdf-modal-overlay");

    // Configurar eventos
    modal
      .querySelector(".pdf-modal-close")
      .addEventListener("click", closeModal);

    // Cerrar al hacer click fuera del contenido
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });

    // Configurar PDF.js si no está ya configurado
    if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
  }

  function showModalLoading(show) {
    const loading = document.getElementById("pdf-modal-loading");
    if (loading) {
      loading.style.display = show ? "block" : "none";
    }
  }

  async function loadPdfInModal(pdfUrl) {
    const content = document.getElementById("pdf-modal-content");
    if (!content) return;

    content.innerHTML = "";
    showModalLoading(true);

    try {
      if (!window.pdfjsLib) {
        throw new Error("PDF.js no disponible");
      }

      // Cargar el PDF
      const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;

      // Obtener ancho disponible para el modal
      const modalWidth = window.innerWidth - 40; // 20px de padding a cada lado

      // Renderizar todas las páginas
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        await renderModalPage(pdfDoc, pageNum, modalWidth, content);
      }

      showModalLoading(false);
    } catch (error) {
      console.error("Error cargando PDF en modal:", error);
      content.innerHTML = `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          text-align: center;
          padding: 20px;
          background: rgba(0,0,0,0.7);
          border-radius: 8px;
          width: 80%;
          max-width: 400px;
        ">
          <p>Error al cargar el PDF</p>
          <p style="font-size: 14px; color: #ccc;">${error.message}</p>
        </div>
      `;
      showModalLoading(false);
    }
  }

  async function renderModalPage(pdfDoc, pageNum, containerWidth, container) {
    try {
      const page = await pdfDoc.getPage(pageNum);

      // Calcular escala óptima para esta página
      const scale = calculateOptimalScaleForPage(page, containerWidth);

      // Crear contenedor para la página
      const pageDiv = document.createElement("div");
      pageDiv.style.cssText = `
        margin: 0 auto 20px auto;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        display: block;
        max-width: 100%;
      `;

      const canvas = document.createElement("canvas");
      canvas.style.cssText = `
        display: block;
        max-width: 100%;
        height: auto;
      `;

      pageDiv.appendChild(canvas);
      container.appendChild(pageDiv);

      // Calcular dimensiones
      const viewport = page.getViewport({ scale: scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";

      const ctx = canvas.getContext("2d");
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (error) {
      console.error("Error renderizando página " + pageNum + ":", error);
      throw error;
    }
  }

  function calculateOptimalScaleForPage(page, containerWidth) {
    // Obtener el tamaño natural de la página
    const naturalViewport = page.getViewport({ scale: 1 });
    const pageWidth = naturalViewport.width;
    const pageHeight = naturalViewport.height;

    // Para móvil: ajustar al ancho del contenedor
    if (window.innerWidth <= 768) {
      // Calcular escala para que la página quepa en el ancho disponible
      const scale = containerWidth / pageWidth;
      // Limitar la escala máxima para que no se vea muy pequeño
      return Math.min(scale, 1.2); // Máximo 120% del tamaño original
    } else {
      // Para desktop: usar escala fija pero ajustada
      const scale = containerWidth / pageWidth;
      return Math.min(scale, 1.5); // Máximo 150% del tamaño original
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
    if (pdfFiles.length === 0) {
      alert("No hay PDFs disponibles");
      return;
    }

    const randomIndex = Math.floor(Math.random() * pdfFiles.length);
    const selectedPdf = pdfFiles[randomIndex];
    openPdf(selectedPdf);
  }

  function closeModal() {
    if (!modal) return;

    modal.style.display = "none";
    document.body.style.overflow = "";
    isOpen = false;

    // Limpiar contenido después de cerrar
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
            if (pdfFile) {
              openPdf(pdfFile);
            }
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
    if (e.key === "Escape" && isOpen) {
      closeModal();
    }
  }

  async function init() {
    // Cargar PDF.js si no está disponible
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
