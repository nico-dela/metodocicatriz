// Navigation management module
export class NavigationManager {
  constructor() {
    this.navLinks = document.querySelectorAll(".nav-link")
    this.currentPage = this.getCurrentPage()
    this.header = document.querySelector(".header")
    this.mobileMenuToggle = null
    this.navigation = document.querySelector(".navigation")
    this.isMenuOpen = false

    this.createMobileMenu()
  }

  init() {
    this.setActiveNavLink()
    this.setupNavigation()
    this.setupScrollEffects()
    this.setupMobileMenu()
  }

  createMobileMenu() {
    // Create mobile menu toggle button
    const headerContainer = document.querySelector(".header-container")
    this.mobileMenuToggle = document.createElement("button")
    this.mobileMenuToggle.className = "mobile-menu-toggle"
    this.mobileMenuToggle.innerHTML = `
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    `
    this.mobileMenuToggle.setAttribute("aria-label", "Toggle mobile menu")
    this.mobileMenuToggle.setAttribute("aria-expanded", "false")

    headerContainer.appendChild(this.mobileMenuToggle)
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

      // Close mobile menu when link is clicked
      link.addEventListener("click", () => {
        if (this.isMenuOpen) {
          this.closeMobileMenu()
        }
      })
    })
  }

  setupScrollEffects() {
    let lastScrollY = window.scrollY
    let ticking = false

    const updateHeader = () => {
      const scrollY = window.scrollY

      // Add scrolled class for backdrop effect
      if (scrollY > 10) {
        this.header.classList.add("scrolled")
      } else {
        this.header.classList.remove("scrolled")
      }

      lastScrollY = scrollY
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

  setupMobileMenu() {
    if (!this.mobileMenuToggle) return

    this.mobileMenuToggle.addEventListener("click", () => {
      this.toggleMobileMenu()
    })

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (this.isMenuOpen && !this.navigation.contains(e.target) && !this.mobileMenuToggle.contains(e.target)) {
        this.closeMobileMenu()
      }
    })

    // Close menu on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isMenuOpen) {
        this.closeMobileMenu()
      }
    })

    // Handle resize
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768 && this.isMenuOpen) {
        this.closeMobileMenu()
      }
    })
  }

  toggleMobileMenu() {
    if (this.isMenuOpen) {
      this.closeMobileMenu()
    } else {
      this.openMobileMenu()
    }
  }

  openMobileMenu() {
    this.isMenuOpen = true
    this.navigation.classList.add("active")
    this.mobileMenuToggle.classList.add("active")
    this.mobileMenuToggle.setAttribute("aria-expanded", "true")
    document.body.style.overflow = "hidden"
  }

  closeMobileMenu() {
    this.isMenuOpen = false
    this.navigation.classList.remove("active")
    this.mobileMenuToggle.classList.remove("active")
    this.mobileMenuToggle.setAttribute("aria-expanded", "false")
    document.body.style.overflow = ""
  }
}
