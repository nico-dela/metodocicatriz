/**
 * PDF Modal Module
 * Handles opening PDFs in a modal overlay instead of navigating to a separate page
 */
(function () {
  "use strict";

  // Configuration
  let pdfFiles = [];
  let modal = null;
  let iframe = null;
  let isOpen = false;

  // Detect paths based on current location
  function getPaths() {
    const isInSubdir = window.location.pathname.includes("/pages/");
    return {
      manifest: isInSubdir
        ? "../assets/pdfs/manifest.json"
        : "./assets/pdfs/manifest.json",
      assets: isInSubdir ? "../assets/pdfs/" : "./assets/pdfs/",
    };
  }

  // Load PDF manifest
  async function loadManifest() {
    const paths = getPaths();
    try {
      const response = await fetch(paths.manifest);
      if (response.ok) {
        const data = await response.json();
        pdfFiles = data.pdfs || [];
      }
    } catch (error) {
      // Silently fail - PDFs just won't be available
    }
  }

  // Create the modal DOM structure
  function createModal() {
    if (document.getElementById("pdf-modal-overlay")) {
      modal = document.getElementById("pdf-modal-overlay");
      iframe = document.getElementById("pdf-modal-iframe");
      return;
    }

    const modalHTML = `
      <div id="pdf-modal-overlay" class="pdf-modal-overlay">
        <div class="pdf-modal">
          <div class="pdf-modal-header">
            <span class="pdf-modal-title"></span>
            <button class="pdf-modal-close" aria-label="Cerrar">&times;</button>
          </div>
          <div class="pdf-modal-body">
            <iframe id="pdf-modal-iframe" class="pdf-modal-iframe" src="" title="PDF Viewer"></iframe>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    modal = document.getElementById("pdf-modal-overlay");
    iframe = document.getElementById("pdf-modal-iframe");

    // Close button
    const closeBtn = modal.querySelector(".pdf-modal-close");
    closeBtn.addEventListener("click", closeModal);

    // Click outside to close
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Update language if translations are available
    if (window.translations && window.translations.currentLanguage) {
      const title = modal.querySelector(".pdf-modal-title");
      if (title) {
        const lang = window.translations.currentLanguage;
        const text = title.getAttribute("data-" + lang);
        if (text) title.textContent = text;
      }
    }
  }

  // Open PDF in modal
  function openPdf(pdfFile) {
    if (!modal || !iframe) return;

    const paths = getPaths();
    const pdfUrl = paths.assets + pdfFile;

    iframe.src = pdfUrl;
    modal.classList.add("active");
    document.body.classList.add("pdf-modal-open");
    isOpen = true;
  }

  // Open random PDF
  function openRandomPdf() {
    if (pdfFiles.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * pdfFiles.length);
    const selectedPdf = pdfFiles[randomIndex];
    openPdf(selectedPdf);
  }

  // Close modal
  function closeModal() {
    if (!modal) return;

    modal.classList.remove("active");
    document.body.classList.remove("pdf-modal-open");
    isOpen = false;

    // Clear iframe after animation
    setTimeout(function () {
      if (iframe) {
        iframe.src = "";
      }
    }, 300);
  }

  // Bind PDF links to open in modal
  function bindPdfLinks() {
    const pdfLinks = document.querySelectorAll('a[href*="pdf-viewer.html"]');

    pdfLinks.forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Extract PDF filename from href
        const href = link.getAttribute("href");
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

  // Bind the random PDF button
  function bindRandomButton() {
    const button = document.getElementById("random-pdf-btn");
    if (button) {
      button.addEventListener("click", function (e) {
        e.preventDefault();
        openRandomPdf();
      });
    }
  }

  // Handle escape key
  function handleKeydown(e) {
    if (e.key === "Escape" && isOpen) {
      closeModal();
    }
  }

  // Initialize everything
  async function init() {
    await loadManifest();
    createModal();
    bindRandomButton();
    bindPdfLinks();
    document.addEventListener("keydown", handleKeydown);
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Export for external use
  window.PdfModal = {
    open: openPdf,
    openRandom: openRandomPdf,
    close: closeModal,
  };
})();
