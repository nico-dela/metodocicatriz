(function () {
  "use strict";

  let pdfFiles = [];
  let modal = null;
  let isOpen = false;
  let isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  let currentLanguage = localStorage.getItem("language") || "es";

  // *** VARIABLE PARA CANCELAR LA CARGA ANTERIOR ***
  let currentLoadingTask = null;
  let currentRenderPromises = [];

  // *** NUEVA VARIABLE: Controlar si el selector está visible ***
  let isSelectorVisible = false;

  // *** VARIABLE: Controlar si el modal está inicializado ***
  let isModalInitialized = false;

  function getPaths() {
    const isInSubdir = window.location.pathname.includes("/pages/");
    return {
      manifest: isInSubdir
        ? "../assets/pdfs/manifest.json"
        : "./assets/pdfs/manifest.json",
      assets: isInSubdir ? "../assets/pdfs/" : "./assets/pdfs/",
    };
  }

  function formatPdfDisplayName(filename) {
    let name = filename.replace(/\.pdf$/i, "");
    name = name.replace(/-/g, " ");
    name = name.replace(/[()]/g, " ");
    name = name
      .split(" ")
      .map((word) => {
        if (word.length > 0) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word;
      })
      .join(" ");
    return name;
  }

  function normalizePdfList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(function (entry) {
        if (typeof entry === "string") {
          return { file: entry, title: formatPdfDisplayName(entry) };
        }
        if (entry && typeof entry.file === "string") {
          return {
            file: entry.file,
            title: entry.title || formatPdfDisplayName(entry.file),
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  async function loadManifest() {
    const paths = getPaths();
    try {
      const response = await fetch(paths.manifest);
      if (response.ok) {
        const data = await response.json();
        pdfFiles = normalizePdfList(data.pdfs || []);
      }
    } catch (error) {
      console.warn("No se pudo cargar el manifest de PDFs");
    }
  }

  function getTitleForFile(filename) {
    const entry = pdfFiles.find(function (e) {
      return e.file === filename;
    });
    return entry ? entry.title : formatPdfDisplayName(filename);
  }

  function setPdfModalTitle(filename) {
    const el = document.getElementById("pdf-modal-title");
    if (el) {
      el.textContent = getTitleForFile(filename);
    }
  }

  function clearPdfModalTitle() {
    const el = document.getElementById("pdf-modal-title");
    if (el) el.textContent = "";
  }

  function createModal() {
    // *** EVITAR DUPLICADOS: Si ya existe, solo configurar ***
    if (document.getElementById("pdf-modal-overlay")) {
      modal = document.getElementById("pdf-modal-overlay");

      // Configurar eventos si no están configurados
      setupModalEvents();
      setupSelectorEvents();
      setupLanguageListener();

      isModalInitialized = true;
      return;
    }

    const modalHTML = `
      <div id="pdf-modal-overlay" class="pdf-modal-overlay" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="pdf-modal-title">
        <header class="pdf-modal-toolbar">
          <p id="pdf-modal-title" class="pdf-modal-title" aria-live="polite"></p>
          <button type="button" class="pdf-modal-close" aria-label="Cerrar">&times;</button>
        </header>
        <div id="pdf-modal-content"></div>
        
        <button type="button" class="pdf-selector-toggle" title="Ver todos los procesos" aria-label="Ver todos los procesos">
          ☰
        </button>
        
        <!-- Selector de PDFs (inicialmente oculto) -->
        <div class="pdf-selector-overlay">
          <div class="pdf-selector-container">
            <div class="pdf-selector-header">
              <h3 
                data-es="Archivo de procesos disponibles" 
                data-en="Available process archive"
              >
                Archivo de procesos disponibles
              </h3>
              <button type="button" class="pdf-selector-close" aria-label="Cerrar">&times;</button>
            </div>
            <div class="pdf-selector-list" id="pdf-selector-list">
              <!-- Los PDFs se cargarán aquí dinámicamente -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    modal = document.getElementById("pdf-modal-overlay");

    // *** CONFIGURAR TODOS LOS EVENTOS ***
    setupModalEvents();
    setupSelectorEvents();
    setupLanguageListener();

    isModalInitialized = true;

    if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
  }

  // *** FUNCIÓN SEPARADA: Configurar eventos del modal principal ***
  function setupModalEvents() {
    if (!modal) return;

    const closeBtn = modal.querySelector(".pdf-modal-close");
    if (closeBtn) {
      // Remover listeners anteriores para evitar duplicados
      closeBtn.replaceWith(closeBtn.cloneNode(true));
      modal
        .querySelector(".pdf-modal-close")
        .addEventListener("click", closeModal);
    }

    // Remover y re-añadir listener del overlay
    modal.removeEventListener("click", handleOverlayClick);
    modal.addEventListener("click", handleOverlayClick);
  }

  function handleOverlayClick(e) {
    if (e.target === modal) closeModal();
  }

  // *** FUNCIÓN SEPARADA: Configurar eventos del selector ***
  function setupSelectorEvents() {
    const selectorToggle = document.querySelector(".pdf-selector-toggle");
    const selectorClose = document.querySelector(".pdf-selector-close");
    const selectorOverlay = document.querySelector(".pdf-selector-overlay");

    if (selectorToggle) {
      selectorToggle.replaceWith(selectorToggle.cloneNode(true));
      document
        .querySelector(".pdf-selector-toggle")
        .addEventListener("click", togglePdfSelector);
    }

    if (selectorClose) {
      selectorClose.replaceWith(selectorClose.cloneNode(true));
      document
        .querySelector(".pdf-selector-close")
        .addEventListener("click", closePdfSelector);
    }

    if (selectorOverlay) {
      selectorOverlay.removeEventListener("click", handleSelectorOverlayClick);
      selectorOverlay.addEventListener("click", handleSelectorOverlayClick);
    }
  }

  function handleSelectorOverlayClick(e) {
    if (e.target === document.querySelector(".pdf-selector-overlay")) {
      closePdfSelector();
    }
  }

  // *** FUNCIÓN: Configurar listener de idioma ***
  function setupLanguageListener() {
    // Actualizar currentLanguage
    currentLanguage = localStorage.getItem("language") || "es";

    // Escuchar cambios en localStorage
    window.addEventListener("storage", function (e) {
      if (e.key === "language") {
        currentLanguage = e.newValue || "es";
        updateSelectorLanguage();
      }
    });

    // Inicializar con el idioma actual
    updateSelectorLanguage();
  }

  // *** FUNCIÓN: Actualizar idioma del selector ***
  function updateSelectorLanguage() {
    const selectorTitle = document.querySelector(".pdf-selector-header h3");
    if (!selectorTitle) return;

    const text = selectorTitle.getAttribute(`data-${currentLanguage}`);
    if (text) {
      selectorTitle.textContent = text;
    }

    // Actualizar título del botón
    const selectorToggle = document.querySelector(".pdf-selector-toggle");
    if (selectorToggle) {
      const toggleTitle =
        currentLanguage === "es"
          ? "Ver todos los procesos"
          : "View all processes";
      selectorToggle.title = toggleTitle;
    }
  }

  // *** FUNCIONES PARA EL SELECTOR DE PDFs ***
  function togglePdfSelector() {
    if (isSelectorVisible) {
      closePdfSelector();
    } else {
      openPdfSelector();
    }
  }

  function openPdfSelector() {
    const selectorOverlay = document.querySelector(".pdf-selector-overlay");
    const selectorList = document.getElementById("pdf-selector-list");

    if (!selectorOverlay || !selectorList) return;

    // *** ACTUALIZAR IDIOMA ANTES DE MOSTRAR ***
    currentLanguage = localStorage.getItem("language") || "es";
    updateSelectorLanguage();

    // Limpiar lista anterior
    selectorList.innerHTML = "";

    pdfFiles.forEach(function (entry, index) {
      const listItem = document.createElement("div");
      listItem.className = "pdf-selector-item";
      listItem.dataset.pdfFile = entry.file;

      listItem.innerHTML = `
        <span class="pdf-selector-number">${index + 1}</span>
        <span class="pdf-selector-name">${entry.title}</span>
      `;

      listItem.addEventListener("click", function () {
        const file = this.dataset.pdfFile;
        openPdf(file);
        closePdfSelector();
      });

      selectorList.appendChild(listItem);
    });

    // Mostrar selector
    selectorOverlay.classList.add("active");
    isSelectorVisible = true;
  }

  function closePdfSelector() {
    const selectorOverlay = document.querySelector(".pdf-selector-overlay");
    if (selectorOverlay) {
      selectorOverlay.classList.remove("active");
      isSelectorVisible = false;
    }
  }

  async function loadPdfInModal(pdfUrl) {
    const content = document.getElementById("pdf-modal-content");
    if (!content) return;

    content.innerHTML =
      '<div class="pdf-loading" role="status" aria-live="polite"><span class="pdf-loading-text">Cargando…</span></div>';

    try {
      if (!window.pdfjsLib) {
        throw new Error("PDF.js no disponible");
      }

      // *** CANCELAR CARGA ANTERIOR SI EXISTE ***
      if (currentLoadingTask) {
        try {
          currentLoadingTask.destroy();
        } catch (e) {}
        currentLoadingTask = null;
      }

      // *** CANCELAR RENDERIZADOS ANTERIORES ***
      cancelAllRenders();

      const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
      currentLoadingTask = loadingTask;

      const pdfDoc = await loadingTask.promise;

      content.innerHTML = "";

      currentRenderPromises = [];

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const renderPromise = renderPageForMobileQuality(
          pdfDoc,
          pageNum,
          content,
        );
        currentRenderPromises.push(renderPromise);
      }

      // *** ESPERAR A QUE TODAS LAS PÁGINAS SE RENDERICEN ***
      await Promise.all(currentRenderPromises);
    } catch (error) {
      // *** IGNORAR ERRORES DE CANCELACIÓN ***
      if (error.name === "AbortError" || error.message.includes("destroy")) {
        return;
      }
      content.innerHTML = `<p style="color: white; text-align: center; padding: 20px;">Error</p>`;
    }
  }

  // *** FUNCIÓN PARA CANCELAR TODOS LOS RENDERIZADOS ***
  function cancelAllRenders() {
    currentRenderPromises.forEach((promise) => {
      try {
        if (promise.cancel) promise.cancel();
      } catch (e) {}
    });
    currentRenderPromises = [];
  }

  async function renderPageForMobileQuality(pdfDoc, pageNum, container) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const originalWidth = viewport.width;
      const originalHeight = viewport.height;
      const isLandscape = originalWidth > originalHeight;

      let scale;

      if (isMobile) {
        if (isLandscape) {
          scale = 0.9;
        } else {
          const containerWidth = window.innerWidth - 20;
          scale = (containerWidth * 0.9) / originalWidth;
          scale = Math.max(scale, 0.7);
        }
      } else {
        const containerWidth = window.innerWidth - 100;
        scale = containerWidth / originalWidth;
      }

      const renderViewport = page.getViewport({ scale: scale });

      const pageDiv = document.createElement("div");
      pageDiv.className = "pdf-page-container";

      const canvas = document.createElement("canvas");

      const pixelRatio = window.devicePixelRatio || 1;
      const qualityMultiplier = isMobile ? Math.min(pixelRatio, 1.5) : 1;

      canvas.width = renderViewport.width * qualityMultiplier;
      canvas.height = renderViewport.height * qualityMultiplier;

      canvas.style.width = renderViewport.width + "px";
      canvas.style.height = renderViewport.height + "px";
      canvas.style.maxWidth = "100%";
      canvas.style.height = "auto";

      pageDiv.appendChild(canvas);
      container.appendChild(pageDiv);

      const ctx = canvas.getContext("2d");

      if (qualityMultiplier > 1) {
        ctx.scale(qualityMultiplier, qualityMultiplier);
      }

      const renderContext = {
        canvasContext: ctx,
        viewport: renderViewport,
      };

      await page.render(renderContext).promise;

      if (isMobile) {
        canvas.style.imageRendering = "crisp-edges";
        canvas.style.webkitFontSmoothing = "antialiased";
      }
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
    }
  }

  function openPdf(pdfFile) {
    // *** ASEGURARSE QUE EL MODAL ESTÉ INICIALIZADO ***
    if (!isModalInitialized) {
      createModal();
    }

    if (!modal) return;

    const paths = getPaths();
    const pdfUrl = paths.assets + pdfFile;

    // *** PRIMERO CERRAR CUALQUIER CARGA ANTERIOR ***
    cancelCurrentLoad();

    modal.style.display = "block";
    document.body.style.overflow = "hidden";
    isOpen = true;

    closePdfSelector();

    currentLanguage = localStorage.getItem("language") || "es";

    setPdfModalTitle(pdfFile);
    loadPdfInModal(pdfUrl);
  }

  // *** FUNCIÓN PARA CANCELAR CARGA ACTUAL ***
  function cancelCurrentLoad() {
    if (currentLoadingTask) {
      try {
        currentLoadingTask.destroy();
      } catch (e) {}
      currentLoadingTask = null;
    }
    cancelAllRenders();

    const content = document.getElementById("pdf-modal-content");
    if (content) {
      content.innerHTML = "";
    }
  }

  function openRandomPdf() {
    if (pdfFiles.length === 0) {
      console.warn("No hay PDFs disponibles");
      return;
    }
    const randomIndex = Math.floor(Math.random() * pdfFiles.length);
    openPdf(pdfFiles[randomIndex].file);
  }

  function closeModal() {
    if (!modal) return;

    // *** CANCELAR CARGA AL CERRAR ***
    cancelCurrentLoad();

    // *** CERRAR SELECTOR SI ESTÁ ABIERTO ***
    closePdfSelector();

    modal.style.display = "none";
    document.body.style.overflow = "";
    isOpen = false;

    clearPdfModalTitle();

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
      // *** LIMPIAR EVENTOS ANTERIORES PARA EVITAR DUPLICADOS ***
      button.replaceWith(button.cloneNode(true));
      const newButton = document.getElementById("random-pdf-btn");

      newButton.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openRandomPdf();
      });
    } else {
      console.warn("No se encontró el botón random-pdf-btn");
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) {
      if (isSelectorVisible) {
        closePdfSelector();
      } else {
        closeModal();
      }
    }
  }

  async function init() {
    // *** PRIMERO CARGAR EL MANIFEST ***
    await loadManifest();

    // *** LUEGO CONFIGURAR EL BOTÓN ***
    bindRandomButton();
    bindPdfLinks();

    // *** CONFIGURAR PDF.JS SI ES NECESARIO ***
    if (!window.pdfjsLib) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = async () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        // *** CREAR MODAL DESPUÉS DE QUE PDF.JS CARGUE ***
        createModal();
        document.addEventListener("keydown", handleKeydown);
      };
      script.onerror = () => {
        console.error("Error cargando PDF.js");
        // Crear modal de todas formas (para el botón de selector)
        createModal();
        document.addEventListener("keydown", handleKeydown);
      };
      document.head.appendChild(script);
    } else {
      // *** CREAR MODAL INMEDIATAMENTE ***
      createModal();
      document.addEventListener("keydown", handleKeydown);
    }
  }

  // *** INICIALIZAR INMEDIATAMENTE ***
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.PdfModal = {
    open: openPdf,
    openRandom: openRandomPdf,
    close: closeModal,
    cancelCurrentLoad: cancelCurrentLoad,
    openSelector: openPdfSelector,
    closeSelector: closePdfSelector,
  };
})();
