/**
 * PDF Loader Module
 * Handles loading PDFs from URL parameters in the PDF viewer page
 */
class PdfLoader {
  constructor() {
    this.iframe = null;
    this.defaultPdf = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';
  }

  init() {
    this.iframe = document.getElementById('pdf-iframe');
    if (!this.iframe) return;

    this.loadPdfFromUrl();
    this.initThumbnailNavigation();
  }

  loadPdfFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const pdfFile = urlParams.get('pdf');

    if (pdfFile) {
      this.iframe.src = '../assets/pdfs/' + decodeURIComponent(pdfFile);
    } else {
      this.iframe.src = this.defaultPdf;
    }
  }

  initThumbnailNavigation() {
    const thumbnails = document.querySelectorAll('.pdf-thumbnail');
    
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', () => {
        thumbnails.forEach(t => t.classList.remove('active'));
        thumbnail.classList.add('active');
        
        const pageNumber = thumbnail.dataset.page;
        if (this.iframe.src) {
          this.iframe.src = this.iframe.src.split('#')[0] + '#page=' + pageNumber;
        }
      });
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const pdfLoader = new PdfLoader();
  pdfLoader.init();
});
