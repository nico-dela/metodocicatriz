const translations = {
  es: {
    // Navigation
    processes: "Procesos",
    publications: "Publicaciones",
    bio: "Bio",
    contact: "Contacto",

    // Titles
    mainTitle: "Método <span style='text-decoration: line-through;'>Cicatriz</span>",
    processesTitle: "Procesos • Candela Gencarelli",
    publicationsTitle: "Publicaciones • Candela Gencarelli",
    bioTitle: "Bio • Candela Gencarelli",

    // Projects
    textileArchive: "Archivo Textil y Memoria",
    experimentalCeramics: "Cerámica Experimental",
    poeticPortraits: "Retratos Poéticos",
    deconstructiveClothing: "Diseño de Indumentaria Deconstructiva",
    mutantHouse: "La Casa Mutante - Proyectos Colectivos",
    visualResearch: "Kati Horna y Grete Stern - Investigación Visual",
  },

  en: {
    // Navigation
    processes: "Processes",
    publications: "Publications",
    bio: "Bio",
    contact: "Contact",

    // Titles
    mainTitle: "Method <span style='text-decoration: line-through;'>Scar</span>",
    processesTitle: "Processes • Candela Gencarelli",
    publicationsTitle: "Publications • Candela Gencarelli",
    bioTitle: "Bio • Candela Gencarelli",

    // Projects
    textileArchive: "Textile Archive and Memory",
    experimentalCeramics: "Experimental Ceramics",
    poeticPortraits: "Poetic Portraits",
    deconstructiveClothing: "Deconstructive Fashion Design",
    mutantHouse: "The Mutant House - Collective Projects",
    visualResearch: "Kati Horna and Grete Stern - Visual Research",
  },
}

// Current language state is now managed in script.js with localStorage persistence

// Translation function (kept for potential future use)
function t(key) {
  const currentLanguage = localStorage.getItem("currentLanguage") || "es"
  return translations[currentLanguage][key] || key
}
