/**
 * Main Application Module
 * Handles language switching and global functionality
 */
class App {
  constructor() {
    this.currentLanguage = localStorage.getItem("language") || "es";
    this.langLinks = null;
  }

  init() {
    this.langLinks = document.querySelectorAll(".lang-option");
    this.updateLanguageDisplay(this.currentLanguage);
    this.initLanguageToggle();
    this.initGallery();
  }

  initLanguageToggle() {
    this.langLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetLang = link.getAttribute("data-lang");
        this.setLanguage(targetLang);
      });
    });
  }

  setLanguage(lang) {
    this.currentLanguage = lang;
    localStorage.setItem("language", lang);
    this.updateLanguageDisplay(lang);
  }

  updateLanguageDisplay(lang) {
    // Update active language link
    this.langLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-lang") === lang);
    });

    // Update translatable elements with data-es/data-en attributes
    const translatableElements =
      document.querySelectorAll("[data-es][data-en]");
    translatableElements.forEach((element) => {
      const text = element.getAttribute(`data-${lang}`);
      if (!text) return;

      if (element.tagName === "TITLE") {
        element.textContent = text;
      } else if (element.tagName === "INPUT" && element.type === "submit") {
        element.value = text;
      } else {
        element.textContent = text;
      }
    });

    // Update content sections with data-lang attribute
    const contentTexts = document.querySelectorAll(".content-text");
    contentTexts.forEach((content) => {
      const contentLang = content.getAttribute("data-lang");
      content.style.display = contentLang === lang ? "block" : "none";
      content.classList.toggle("hidden", contentLang !== lang);
    });

    // Update bio sections
    const bioTexts = document.querySelectorAll(".bio-text");
    bioTexts.forEach((bioText) => {
      const bioLang = bioText.getAttribute("data-lang");
      bioText.style.display = bioLang === lang ? "block" : "none";
    });

    // Update page title
    const titleElement = document.querySelector("title");
    if (titleElement) {
      const titleText = titleElement.getAttribute(`data-${lang}`);
      if (titleText) {
        titleElement.textContent = titleText;
      }
    }

    // Update images with language-specific sources (leyenda and button)
    const langImages = document.querySelectorAll(
      "img[data-src-es][data-src-en]",
    );
    langImages.forEach((img) => {
      const newSrc = img.getAttribute(`data-src-${lang}`);
      const newAlt = img.getAttribute(`data-alt-${lang}`);
      if (newSrc) {
        img.setAttribute("src", newSrc);
      }
      if (newAlt) {
        img.setAttribute("alt", newAlt);
      }
    });

    // Update <source> elements inside <picture> (mobile images)
    const langSources = document.querySelectorAll(
      "source[data-src-es][data-src-en]",
    );

    langSources.forEach((source) => {
      const newSrc = source.getAttribute(`data-src-${lang}`);
      if (!newSrc) return;

      // iOS / Safari fix
      source.setAttribute("srcset", "");
      source.offsetHeight; // force reflow
      source.setAttribute("srcset", newSrc);
    });
  }

  initGallery() {
    const galleryImages = document.querySelectorAll(".gallery-image");

    if (galleryImages.length === 0) return;

    let currentIndex = 0;

    const showNextImage = () => {
      galleryImages[currentIndex].classList.remove("active");
      currentIndex = (currentIndex + 1) % galleryImages.length;
      galleryImages[currentIndex].classList.add("active");
    };

    setInterval(showNextImage, 4000);
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
});

// Export for external use
window.App = App;
