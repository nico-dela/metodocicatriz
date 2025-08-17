document.addEventListener("DOMContentLoaded", () => {
  const galleryImages = document.querySelectorAll(".gallery-image")
  const langLinks = document.querySelectorAll(".lang-link")
  const contentTexts = document.querySelectorAll(".content-text")

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

  // Language toggle functionality (works on all pages)
  langLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()

      const targetLang = this.getAttribute("data-lang")

      // Update active language link
      langLinks.forEach((l) => l.classList.remove("active"))
      this.classList.add("active")

      // Show/hide content based on language
      contentTexts.forEach((content) => {
        const contentLang = content.getAttribute("data-lang")
        if (contentLang === targetLang) {
          content.classList.remove("hidden")
        } else {
          content.classList.add("hidden")
        }
      })
    })
  })
})
