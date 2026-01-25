(function () {
  "use strict";

  const CV_FILENAME = "CV_Candela_Gencarelli.pdf";
  let modal = null;
  let isCVModalOpen = false;
  let isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  function createCVModal() {
    if (document.getElementById("cv-modal-overlay")) {
      modal = document.getElementById("cv-modal-overlay");
      return;
    }

    const modalHTML = `
      <div id="cv-modal-overlay" class="pdf-modal-overlay">
        <button class="cv-modal-close">&times;</button>
        <div id="cv-modal-content"></div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    modal = document.getElementById("cv-modal-overlay");

    const closeBtn = modal.querySelector(".cv-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeModal);
    }

    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }

  function init() {
    createCVModal();

    const cvButton = document.getElementById("cv-button");
    if (cvButton) {
      cvButton.addEventListener("click", function (e) {
        e.preventDefault();
        openCV();
      });
      updateButtonText();
    }

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

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isCVModalOpen) {
        closeModal();
      }
    });

    document.addEventListener("languageChanged", function () {
      updateButtonText();
      updateLinkTexts();
    });

    updateLinkTexts();
  }

  async function loadCVInModal() {
    const content = document.getElementById("cv-modal-content");
    if (!content) return;

    content.innerHTML = "";

    try {
      if (!window.pdfjsLib) {
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

      const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;

      // **NUEVO: usar la misma lógica de calidad que random-pdf.js**
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        await renderCVPageForMobileQuality(pdfDoc, pageNum, content);
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

  // **NUEVA FUNCIÓN: Render con calidad para móvil (igual que random-pdf.js)**
  async function renderCVPageForMobileQuality(pdfDoc, pageNum, container) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const originalWidth = viewport.width;
      const originalHeight = viewport.height;
      const isLandscape = originalWidth > originalHeight;

      let scale;

      if (isMobile) {
        // Misma lógica de calidad que random-pdf.js
        if (isLandscape) {
          // PDF horizontal: mantener buena calidad aunque sea ancho
          scale = 0.9; // 90% del tamaño original
        } else {
          // PDF vertical: ajustar al ancho con escala mínima
          const containerWidth = window.innerWidth - 20;
          scale = (containerWidth * 0.9) / originalWidth;
          scale = Math.max(scale, 0.7); // Mínimo 70% para calidad
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

      // Renderizar con mejor calidad
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

      // Aplicar filtro de nitidez para móvil
      if (isMobile) {
        canvas.style.imageRendering = "crisp-edges";
        canvas.style.webkitFontSmoothing = "antialiased";
      }
    } catch (error) {
      console.error("Error en página " + pageNum + ":", error);
    }
  }

  function openCV() {
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
