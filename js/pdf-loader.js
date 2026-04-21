/**
 * PDF Loader Module
 * Muestra todas las páginas del PDF sin estiramiento vertical
 */
class PdfLoader {
  constructor() {
    this.pdfDoc = null;
    this.viewer = null;
    this.pdfEntries = [];
  }

  formatFilename(filename) {
    let name = filename.replace(/\.pdf$/i, "");
    name = name.replace(/-/g, " ");
    name = name.replace(/[()]/g, " ");
    return name
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  normalizeManifestEntries(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => {
        if (typeof entry === "string") {
          return {
            file: entry,
            title: this.formatFilename(entry),
            titleEs: this.formatFilename(entry),
            titleEn: this.formatFilename(entry),
          };
        }
        if (entry && typeof entry.file === "string") {
          const fallbackTitle = this.formatFilename(entry.file);
          return {
            file: entry.file,
            title: entry.title || fallbackTitle,
            titleEs: entry.title_es || entry.titleEs || entry.title || fallbackTitle,
            titleEn: entry.title_en || entry.titleEn || entry.title || fallbackTitle,
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  async loadManifest() {
    try {
      const response = await fetch("../assets/pdfs/manifest.json");
      if (response.ok) {
        const data = await response.json();
        this.pdfEntries = this.normalizeManifestEntries(data.pdfs || []);
      }
    } catch (e) {
      console.warn("No se pudo cargar el manifiesto de PDFs");
    }
  }

  getTitleForFile(filename, language) {
    const entry = this.pdfEntries.find((e) => e.file === filename);
    if (!entry) return this.formatFilename(filename);
    if (language === "en") return entry.titleEn || entry.title || this.formatFilename(filename);
    return entry.titleEs || entry.title || this.formatFilename(filename);
  }

  async init() {
    this.viewer = document.getElementById("pdf-viewer");
    if (!this.viewer) return;

    await this.loadManifest();
    await this.loadPdfFromUrl();
  }

  async loadPdfFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const pdfFile = urlParams.get("pdf");

    if (!pdfFile) {
      this.viewer.setAttribute("aria-busy", "false");
      this.showError("No se especificó un archivo PDF");
      return;
    }

    const pdfUrl = "../assets/pdfs/" + decodeURIComponent(pdfFile);

    const titleEl = document.getElementById("pdf-viewer-title");
    const lang = localStorage.getItem("language") || "es";
    const displayTitle = this.getTitleForFile(decodeURIComponent(pdfFile), lang);
    if (titleEl) {
      titleEl.textContent = displayTitle;
    }
    const pageTitle = document.querySelector("title");
    if (pageTitle) {
      const baseEs = pageTitle.getAttribute("data-es") || "";
      const baseEn = pageTitle.getAttribute("data-en") || "";
      const base = lang === "en" ? baseEn : baseEs;
      document.title = base
        ? displayTitle + " • " + base.replace(/^[^•]*•\s*/, "").trim()
        : displayTitle;
    }

    try {
      // Verificar que PDF.js esté cargado
      if (!window.pdfjsLib) {
        throw new Error("PDF.js no está disponible");
      }
      if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }

      // Cargar el PDF
      const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
      this.pdfDoc = await loadingTask.promise;

      // Limpiar viewer
      this.viewer.innerHTML = "";

      // Renderizar todas las páginas
      for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
        await this.renderPage(pageNum);
      }
      this.viewer.setAttribute("aria-busy", "false");
    } catch (error) {
      console.error("Error cargando PDF:", error);
      this.viewer.setAttribute("aria-busy", "false");
      this.showError("Error al cargar el PDF: " + error.message);
    }
  }

  async renderPage(pageNum) {
    try {
      const page = await this.pdfDoc.getPage(pageNum);

      // Crear contenedor para la página
      const pageDiv = document.createElement("div");
      pageDiv.className = "pdf-page";
      pageDiv.id = "page-" + pageNum;

      // Crear canvas
      const canvas = document.createElement("canvas");
      canvas.id = "canvas-" + pageNum;

      // Calcular escala manteniendo proporciones originales
      const scale = this.calculateOptimalScale(page);

      // Obtener viewport con la escala calculada
      const viewport = page.getViewport({ scale: scale });

      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";

      const ctx = canvas.getContext("2d");
      if (outputScale !== 1) {
        ctx.scale(outputScale, outputScale);
      }

      await page
        .render({
          canvasContext: ctx,
          viewport: viewport,
          background: "rgb(255, 255, 255)",
        })
        .promise;

      const wrapped =
        typeof window.wrapCanvasForPdfLinks === "function"
          ? window.wrapCanvasForPdfLinks(canvas)
          : { wrap: canvas, linkLayer: null };
      if (wrapped.linkLayer && typeof window.attachPdfLinkAnnotations === "function") {
        try {
          await window.attachPdfLinkAnnotations(page, wrapped.linkLayer, viewport);
        } catch (e) {
          console.warn("Capa de enlaces PDF (pág. " + pageNum + "):", e);
        }
      }

      pageDiv.appendChild(wrapped.wrap);
      this.viewer.appendChild(pageDiv);
    } catch (error) {
      console.error("Error renderizando página " + pageNum + ":", error);
      throw error;
    }
  }

  calculateOptimalScale(page) {
    // Obtener el tamaño natural de la página
    const naturalViewport = page.getViewport({ scale: 1 });
    const pageWidth = naturalViewport.width;
    const pageHeight = naturalViewport.height;

    // Obtener ancho del contenedor
    const containerWidth = this.viewer.clientWidth - 40; // 20px de padding a cada lado

    // Calcular escala para que la página quepa en el ancho disponible
    // Esto mantiene las proporciones originales
    const scale = containerWidth / pageWidth;

    // Para móvil: limitar la escala máxima para buen rendimiento
    if (window.innerWidth <= 768) {
      return Math.min(scale, 1.3); // Máximo 130% en móvil
    } else {
      return Math.min(scale, 1.8); // Máximo 180% en desktop
    }
  }

  showError(message) {
    this.viewer.innerHTML = `
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
        <p><strong>Error</strong></p>
        <p>${message}</p>
        <button onclick="location.href='../index.html'" style="
          margin-top: 15px;
          padding: 8px 16px;
          background: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-family: sans-serif;
        ">
          Volver al inicio
        </button>
      </div>
    `;
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  new PdfLoader().init();
});
