// Translation management module
export class TranslationManager {
  constructor() {
    this.currentLanguage = localStorage.getItem('language') || 'en';
    this.translations = {};
    this.langButtons = document.querySelectorAll('.lang-btn');
  }

  async init() {
    try {
      // Load translations
      await this.loadTranslations();

      // Set up language toggle buttons
      this.setupLanguageToggle();

      // Apply initial translations
      this.applyTranslations();

      // Update language button states
      this.updateLanguageButtons();

    } catch (error) {
      console.error('Error initializing translation manager:', error);
    }
  }

  async loadTranslations() {
    try {
      const [enResponse, esResponse] = await Promise.all([
        fetch('translations/en.json'),
        fetch('translations/es.json')
      ]);

      this.translations.en = await enResponse.json();
      this.translations.es = await esResponse.json();

    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to default English translations
      this.translations.en = this.getDefaultTranslations();
      this.translations.es = this.getDefaultTranslations();
    }
  }

  setupLanguageToggle() {
    this.langButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const lang = e.target.dataset.lang;
        this.changeLanguage(lang);
      });
    });
  }

  changeLanguage(lang) {
    if (lang === this.currentLanguage) return;

    this.currentLanguage = lang;
    localStorage.setItem('language', lang);

    this.applyTranslations();
    this.updateLanguageButtons();

    // Update document language
    document.documentElement.lang = lang;
  }

  applyTranslations() {
    const elements = document.querySelectorAll('[data-translate]');

    elements.forEach(element => {
      const key = element.dataset.translate;
      const translation = this.getTranslation(key);

      if (translation) {
        element.textContent = translation;
      }
    });
  }

  getTranslation(key) {
    const keys = key.split('.');
    let translation = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        return null;
      }
    }

    return translation;
  }

  updateLanguageButtons() {
    this.langButtons.forEach(button => {
      const lang = button.dataset.lang;
      button.classList.toggle('active', lang === this.currentLanguage);
    });
  }

  getDefaultTranslations() {
    return {
      nav: {
        processes: "processes",
        publications: "Publications",
        bio: "Bio",
        contact: "Contact"
      }
    };
  }
}