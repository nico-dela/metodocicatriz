/**
 * Random PDF Module
 * Handles navigation to a random PDF from assets/pdfs/manifest.json
 */
class RandomPdf {
  constructor() {
    this.pdfFiles = [];
    this.manifestPath = './assets/pdfs/manifest.json';
    this.viewerPath = './pages/pdf-viewer.html';
  }

  async init() {
    // Load PDFs from manifest
    await this.loadManifest();

    const button = document.getElementById('random-pdf-btn');
    if (button) {
      button.addEventListener('click', () => this.navigateToRandomPdf());
    }
  }

  async loadManifest() {
    try {
      const response = await fetch(this.manifestPath);
      if (response.ok) {
        const data = await response.json();
        this.pdfFiles = data.pdfs || [];
      }
    } catch (error) {
      console.warn('Could not load PDFs manifest:', error);
    }
  }

  navigateToRandomPdf() {
    if (this.pdfFiles.length === 0) {
      console.warn('No PDF files configured');
      return;
    }

    const randomIndex = Math.floor(Math.random() * this.pdfFiles.length);
    const selectedPdf = this.pdfFiles[randomIndex];
    
    window.location.href = `${this.viewerPath}?pdf=${encodeURIComponent(selectedPdf)}`;
  }

  getPdfFiles() {
    return [...this.pdfFiles];
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const randomPdf = new RandomPdf();
  randomPdf.init();
});

// Export for external use
window.RandomPdf = RandomPdf;
