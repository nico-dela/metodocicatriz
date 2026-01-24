/**
 * CV Handler - Maneja específicamente la apertura del CV en modal
 * Solo para la página bio.html
 */
(function () {
  "use strict";

  // Nombre fijo del archivo CV
  const CV_FILENAME = "CV_Candela_Gencarelli.pdf";
  let modal = null;
  let isCVModalOpen = false;

  function createCVModal() {
    // Si ya existe el modal, solo devolverlo
    if (document.getElementById("cv-modal-overlay")) {
      modal = document.getElementById("cv-modal-overlay");
      return;
    }

    const modalHTML = `
      <div id="cv-modal-overlay" class="pdf-modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 9999;
        display: none;
      ">
        <!-- Botón de cerrar -->
        <button class="cv-modal-close" style="
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
        <div id="cv-modal-content" style="
          width: 100%;
          height: 100%;
          overflow: auto;
          padding: 20px;
        "></div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    modal = document.getElementById("cv-modal-overlay");

    // Configurar eventos UNA SOLA VEZ
    const closeBtn = modal.querySelector(".cv-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }

    // Cerrar al hacer click fuera del contenido
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }

  function init() {
    // CREAR EL MODAL AL INICIO, no cuando se haga clic
    createCVModal();

    // Configurar botón de CV
    const cvButton = document.getElementById("cv-button");
    if (cvButton) {
      cvButton.addEventListener("click", function (e) {
        e.preventDefault();
        openCV();
      });

      // También configurar el texto del botón según idioma
      updateButtonText();
    }

    // Configurar enlaces de texto del CV
    const cvLinkEs = document.getElementById("cv-link-es");
    const cvLinkEn = document.getElementById("cv-link-en");

    if (cvLinkEs) {
      cvLinkEs.addEventListener("click", function (e) {
        e.preventDefault();
        openCV();
      });
    }

    if (cvLinkEn) {
      cvLinkEn.addEventListener("click", function (e) {
        e.preventDefault();
        openCV();
      });
    }

    // Manejar tecla Escape para cerrar modal
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isCVModalOpen) {
        closeModal();
      }
    });

    // Actualizar textos cuando cambie el idioma
    document.addEventListener("languageChanged", function () {
      updateButtonText();
      updateLinkTexts();
    });

    // Inicializar textos
    updateLinkTexts();
  }

  async function loadCVInModal() {
    const content = document.getElementById("cv-modal-content");
    if (!content) return;

    content.innerHTML = "";

    try {
      if (!window.pdfjsLib) {
        // Cargar PDF.js si no está disponible
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          loadCVInModal();
        };
        document.head.appendChild(script);
        return;
      }

      const pdfUrl = "../assets/pdfs/" + CV_FILENAME;

      // Cargar el PDF
      const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;

      // Obtener ancho disponible para el modal
      const modalWidth = window.innerWidth - 40;

      // Renderizar todas las páginas
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        await renderCVPage(pdfDoc, pageNum, modalWidth, content);
      }
    } catch (error) {
      console.error("Error cargando CV:", error);
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
          <p>Error al cargar el CV</p>
          <p style="font-size: 14px; color: #ccc;">${error.message}</p>
          <p style="font-size: 12px; margin-top: 10px;">
            <a href="./pdf-viewer.html?pdf=${encodeURIComponent(CV_FILENAME)}" 
               style="color: #4CAF50; text-decoration: underline;" target="_blank">
              Abrir en nueva pestaña
            </a>
          </p>
        </div>
      `;
    }
  }

  async function renderCVPage(pdfDoc, pageNum, containerWidth, container) {
    try {
      const page = await pdfDoc.getPage(pageNum);

      // Calcular escala manteniendo proporciones
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

      // Calcular viewport
      const viewport = page.getViewport({ scale: scale });

      // Configurar canvas
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

    // Calcular escala para que la página quepa en el ancho disponible
    const scale = containerWidth / pageWidth;

    // Para móvil: limitar la escala máxima
    if (window.innerWidth <= 768) {
      return Math.min(scale, 1.3);
    } else {
      return Math.min(scale, 1.8);
    }
  }

  function openCV() {
    // Asegurarse de que el modal existe
    if (!modal) {
      createCVModal();
    }

    if (!modal) return;

    modal.style.display = "block";
    document.body.style.overflow = "hidden";
    isCVModalOpen = true;

    loadCVInModal();
  }

  function closeModal() {
    if (!modal) return;

    modal.style.display = "none";
    document.body.style.overflow = "";
    isCVModalOpen = false;

    // Limpiar contenido después de cerrar
    setTimeout(() => {
      const content = document.getElementById("cv-modal-content");
      if (content) content.innerHTML = "";
    }, 300);
  }

  function updateButtonText() {
    const cvButton = document.getElementById("cv-button");
    if (!cvButton) return;

    const lang = localStorage.getItem("language") || "es";
    const text = cvButton.getAttribute("data-" + lang);
    if (text) {
      cvButton.textContent = text;
    }
  }

  function updateLinkTexts() {
    const lang = localStorage.getItem("language") || "es";

    // Solo actualizar el enlace del idioma activo
    if (lang === "es") {
      const cvLinkEs = document.getElementById("cv-link-es");
      if (cvLinkEs) {
        cvLinkEs.style.display = "inline";
        cvLinkEs.innerHTML = "podés consultar mi CV académico completo";
      }

      const cvLinkEn = document.getElementById("cv-link-en");
      if (cvLinkEn) {
        cvLinkEn.style.display = "none";
      }
    } else {
      const cvLinkEs = document.getElementById("cv-link-es");
      if (cvLinkEs) {
        cvLinkEs.style.display = "none";
      }

      const cvLinkEn = document.getElementById("cv-link-en");
      if (cvLinkEn) {
        cvLinkEn.style.display = "inline";
        cvLinkEn.innerHTML = "you may consult my full academic CV.";
      }
    }
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
