/**
 * Translations Module
 * Contains all text translations for the site
 */
const translations = {
  es: {
    processes: 'Procesos',
    publications: 'Publicaciones',
    bio: 'Bio',
    contact: 'Contacto',
    mainTitle: 'Método <span style="text-decoration: line-through;">Cicatriz</span>',
    processesTitle: 'Procesos • Candela Gencarelli',
    publicationsTitle: 'Publicaciones • Candela Gencarelli',
    bioTitle: 'Bio • Candela Gencarelli',
    textileArchive: 'Archivo Textil y Memoria',
    experimentalCeramics: 'Cerámica Experimental',
    poeticPortraits: 'Retratos Poéticos',
    deconstructiveClothing: 'Diseño de Indumentaria Deconstructiva',
    mutantHouse: 'La Casa Mutante - Proyectos Colectivos',
    visualResearch: 'Kati Horna y Grete Stern - Investigación Visual',
  },

  en: {
    processes: 'Processes',
    publications: 'Publications',
    bio: 'Bio',
    contact: 'Contact',
    mainTitle: 'Method <span style="text-decoration: line-through;">Scar</span>',
    processesTitle: 'Processes • Candela Gencarelli',
    publicationsTitle: 'Publications • Candela Gencarelli',
    bioTitle: 'Bio • Candela Gencarelli',
    textileArchive: 'Textile Archive and Memory',
    experimentalCeramics: 'Experimental Ceramics',
    poeticPortraits: 'Poetic Portraits',
    deconstructiveClothing: 'Deconstructive Fashion Design',
    mutantHouse: 'The Mutant House - Collective Projects',
    visualResearch: 'Kati Horna and Grete Stern - Visual Research',
  },
};

/**
 * Get translation for a given key
 * @param {string} key - Translation key
 * @returns {string} - Translated text or key if not found
 */
function t(key) {
  const currentLanguage = localStorage.getItem('language') || 'es';
  return translations[currentLanguage][key] || key;
}

// Export for external use
window.translations = translations;
window.t = t;
