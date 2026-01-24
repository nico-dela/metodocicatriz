/**
 * PDF Loader Module
 * Muestra todas las páginas del PDF sin estiramiento vertical
 */
class PdfLoader {
  constructor() {
    this.pdfDoc = null;
    this.viewer = null;
  }

  async init() {
    this.viewer = document.getElementById("pdf-viewer");
    if (!this.viewer) return;

    await this.loadPdfFromUrl();
  }

  async loadPdfFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const pdfFile = urlParams.get("pdf");

    if (!pdfFile) {
      this.showError("No se especificó un archivo PDF");
      return;
    }

    const pdfUrl = "../assets/pdfs/" + decodeURIComponent(pdfFile);

    try {
      // Verificar que PDF.js esté cargado
      if (!window.pdfjsLib) {
        throw new Error("PDF.js no está disponible");
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
    } catch (error) {
      console.error("Error cargando PDF:", error);
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

      pageDiv.appendChild(canvas);
      this.viewer.appendChild(pageDiv);

      // Calcular escala manteniendo proporciones originales
      const scale = this.calculateOptimalScale(page);

      // Obtener viewport con la escala calculada
      const viewport = page.getViewport({ scale: scale });

      // Configurar canvas SIN devicePixelRatio para evitar estiramiento
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
