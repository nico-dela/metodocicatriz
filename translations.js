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

// Current language state
let currentLanguage = "es"

// Translation function
function t(key) {
  return translations[currentLanguage][key] || key
}

// Language switching function
function switchLanguage(lang) {
  currentLanguage = lang
  updatePageContent()
}

// Update page content based on current language
function updatePageContent() {
  // Update navigation
  const navItems = document.querySelectorAll("[data-translate]")
  navItems.forEach((item) => {
    const key = item.getAttribute("data-translate")
    if (translations[currentLanguage][key]) {
      item.innerHTML = translations[currentLanguage][key]
    }
  })

  // Update title
  const titleElement = document.querySelector("title")
  if (titleElement && titleElement.getAttribute("data-translate")) {
    const key = titleElement.getAttribute("data-translate")
    titleElement.textContent = translations[currentLanguage][key]
  }

  // Update main title if exists
  const mainTitle = document.querySelector(".main-title")
  if (mainTitle) {
    mainTitle.innerHTML = translations[currentLanguage].mainTitle
  }
}
