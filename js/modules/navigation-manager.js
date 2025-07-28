// Navigation management module
export class NavigationManager {
  constructor() {
    this.navLinks = document.querySelectorAll(".nav-link")
    this.currentPage = this.getCurrentPage()
    this.header = document.querySelector(".header")
  }

  init() {
    this.setActiveNavLink()
    this.setupNavigation()
    this.setupScrollEffects()
  }

  getCurrentPage() {
    const path = window.location.pathname

    if (path === "/" || path.includes("index.html")) {
      return "home"
    } else if (path.includes("processes.html")) {
      return "processes"
    } else if (path.includes("publications.html")) {
      return "publications"
    } else if (path.includes("bio.html")) {
      return "bio"
    } else if (path.includes("contact.html")) {
      return "contact"
    }

    return "home"
  }

  setActiveNavLink() {
    this.navLinks.forEach((link) => {
      link.classList.remove("active")

      const href = link.getAttribute("href")

      if (
        (this.currentPage === "home" && (href === "#" || href === "index.html")) ||
        (this.currentPage === "processes" && href.includes("processes.html")) ||
        (this.currentPage === "publications" && href.includes("publications.html")) ||
        (this.currentPage === "bio" && href.includes("bio.html")) ||
        (this.currentPage === "contact" && href.includes("contact.html"))
      ) {
        link.classList.add("active")
      }
    })
  }

  setupNavigation() {
    // Add smooth scrolling for anchor links
    this.navLinks.forEach((link) => {
      if (link.getAttribute("href") === "#") {
        link.addEventListener("click", (e) => {
          e.preventDefault()
          window.location.href = "index.html"
        })
      }
    })
  }

  setupScrollEffects() {
    // Only add scroll effects on desktop
    if (window.innerWidth > 768) {
      let ticking = false

      const updateHeader = () => {
        const scrollY = window.scrollY

        // Add scrolled class for backdrop effect
        if (scrollY > 10) {
          this.header.classList.add("scrolled")
        } else {
          this.header.classList.remove("scrolled")
        }

        ticking = false
      }

      const requestTick = () => {
        if (!ticking) {
          requestAnimationFrame(updateHeader)
          ticking = true
        }
      }

      window.addEventListener("scroll", requestTick, { passive: true })
    }
  }
}
