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
      <div id="pdf-modal-overlay" class="pdf-modal-overlay" style="display: none;">
        <button class="pdf-modal-close">&times;</button>
        <div id="pdf-modal-content"></div>
        
        <!-- Botón para abrir selector de PDFs -->
        <button class="pdf-selector-toggle" title="Ver todos los procesos">
          📂
        </button>
        
        <!-- Selector de PDFs (inicialmente oculto) -->
        <div class="pdf-selector-overlay">
          <div class="pdf-selector-container">
            <div class="pdf-selector-header">
              <h3 
                data-es="Procesos disponibles" 
                data-en="Available processes"
              >
                Procesos disponibles
              </h3>
              <button class="pdf-selector-close">&times;</button>
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

    // Crear elementos de lista para cada PDF
    pdfFiles.forEach((pdfFile, index) => {
      const listItem = document.createElement("div");
      listItem.className = "pdf-selector-item";
      listItem.dataset.pdfFile = pdfFile;

      // Formatear nombre para mostrar
      const displayName = formatPdfDisplayName(pdfFile);

      listItem.innerHTML = `
        <span class="pdf-selector-number">${index + 1}</span>
        <span class="pdf-selector-name">${displayName}</span>
      `;

      listItem.addEventListener("click", function () {
        const pdfFile = this.dataset.pdfFile;
        openPdf(pdfFile);
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

  function formatPdfDisplayName(filename) {
    // Remover extensión .pdf
    let name = filename.replace(/\.pdf$/i, "");

    // Reemplazar guiones por espacios
    name = name.replace(/-/g, " ");

    // Reemplazar paréntesis por espacios
    name = name.replace(/[()]/g, " ");

    // Capitalizar primera letra de cada palabra
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

  async function loadPdfInModal(pdfUrl) {
    const content = document.getElementById("pdf-modal-content");
    if (!content) return;

    // *** LIMPIAR CONTENIDO COMPLETAMENTE ***
    content.innerHTML = "";

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

      // *** NUEVA CARGA ***
      const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
      currentLoadingTask = loadingTask;

      const pdfDoc = await loadingTask.promise;

      // *** GUARDAR PROMESAS DE RENDERIZADO ***
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
      content.innerHTML = `<p style="color: white; text-align: center; padding: 20px;">Error cargando PDF</p>`;
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

    // *** CERRAR SELECTOR SI ESTÁ ABIERTO ***
    closePdfSelector();

    // *** ACTUALIZAR IDIOMA ***
    currentLanguage = localStorage.getItem("language") || "es";

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
    console.log("Abriendo PDF aleatorio:", pdfFiles[randomIndex]);
    openPdf(pdfFiles[randomIndex]);
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
        console.log("Botón random clickeado");
        openRandomPdf();
      });

      console.log("Botón random configurado:", newButton);
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
    console.log("Inicializando PDF Modal...");

    // *** PRIMERO CARGAR EL MANIFEST ***
    await loadManifest();
    console.log("PDFs cargados:", pdfFiles.length);

    // *** LUEGO CONFIGURAR EL BOTÓN ***
    bindRandomButton();
    bindPdfLinks();

    // *** CONFIGURAR PDF.JS SI ES NECESARIO ***
    if (!window.pdfjsLib) {
      console.log("Cargando PDF.js...");
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = async () => {
        console.log("PDF.js cargado");
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        // *** CREAR MODAL DESPUÉS DE QUE PDF.JS CARGUE ***
        createModal();
        document.addEventListener("keydown", handleKeydown);
        console.log("Modal inicializado");
      };
      script.onerror = () => {
        console.error("Error cargando PDF.js");
        // Crear modal de todas formas (para el botón de selector)
        createModal();
        document.addEventListener("keydown", handleKeydown);
      };
      document.head.appendChild(script);
    } else {
      console.log("PDF.js ya está cargado");
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

  console.log("PDF Modal Module cargado");
})();
