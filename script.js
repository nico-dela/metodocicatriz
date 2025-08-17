document.addEventListener("DOMContentLoaded", () => {
  const galleryImages = document.querySelectorAll(".gallery-image")
  const langLinks = document.querySelectorAll(".lang-option") // Updated selector to match actual HTML
  const contentTexts = document.querySelectorAll(".content-text")

  let currentLanguage = localStorage.getItem("currentLanguage") || "es"

  updateLanguageDisplay(currentLanguage)

  // Automatic gallery rotation
  if (galleryImages.length > 0) {
    let currentImageIndex = 0

    function showNextImage() {
      galleryImages[currentImageIndex].classList.remove("active")
      currentImageIndex = (currentImageIndex + 1) % galleryImages.length
      galleryImages[currentImageIndex].classList.add("active")
    }

    // Change image every 4 seconds
    setInterval(showNextImage, 4000)
  }

  langLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()

      const targetLang = this.getAttribute("data-lang")
      currentLanguage = targetLang

      localStorage.setItem("currentLanguage", targetLang)

      updateLanguageDisplay(targetLang)
    })
  })

  function updateLanguageDisplay(lang) {
    // Update active language link
    langLinks.forEach((l) => {
      l.classList.remove("active")
      if (l.getAttribute("data-lang") === lang) {
        l.classList.add("active")
      }
    })

    // Handle data-es/data-en attribute translations
    const translatableElements = document.querySelectorAll("[data-es][data-en]")
    translatableElements.forEach((element) => {
      const text = element.getAttribute(`data-${lang}`)
      if (text) {
        element.textContent = text
      }
    })

    // Handle content sections with data-lang attributes
    contentTexts.forEach((content) => {
      const contentLang = content.getAttribute("data-lang")
      if (contentLang === lang) {
        content.style.display = "block"
        content.classList.remove("hidden")
      } else {
        content.style.display = "none"
        content.classList.add("hidden")
      }
    })

    const bioTexts = document.querySelectorAll(".bio-text")
    bioTexts.forEach((bioText) => {
      const bioLang = bioText.getAttribute("data-lang")
      if (bioLang === lang) {
        bioText.style.display = "block"
      } else {
        bioText.style.display = "none"
      }
    })

    const titleElement = document.querySelector("title")
    if (titleElement) {
      const titleEs = titleElement.getAttribute("data-es")
      const titleEn = titleElement.getAttribute("data-en")
      if (titleEs && titleEn) {
        titleElement.textContent = lang === "es" ? titleEs : titleEn
      }
    }
  }
})
