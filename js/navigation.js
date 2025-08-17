// Navigation functionality
const Utils = {
  selectAll: (selector) => document.querySelectorAll(selector),
  select: (selector) => document.querySelector(selector),
  on: (element, event, handler) => element.addEventListener(event, handler),
  addClass: (element, className) => element.classList.add(className),
  removeClass: (element, className) => element.classList.remove(className),
}

const Navigation = {
  init() {
    this.bindEvents()
    this.setActiveSection()
  },

  bindEvents() {
    // Smooth scroll for navigation links
    const navLinks = Utils.selectAll(".nav-menu a")
    navLinks.forEach((link) => {
      Utils.on(link, "click", (e) => {
        e.preventDefault()
        const targetId = link.getAttribute("href").substring(1)
        this.scrollToSection(targetId)
      })
    })

    // Update active section on scroll
    Utils.on(window, "scroll", () => {
      this.setActiveSection()
    })
  },

  scrollToSection(sectionId) {
    const section = Utils.select(`#${sectionId}`)
    if (section) {
      const offsetTop = section.offsetTop - 100 // Account for fixed nav
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      })
    }
  },

  setActiveSection() {
    const sections = Utils.selectAll(".content-section, .hero-section")
    const navLinks = Utils.selectAll(".nav-menu a")

    let currentSection = ""

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 150
      const sectionHeight = section.offsetHeight

      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        currentSection = section.id
      }
    })

    // Update active nav link
    navLinks.forEach((link) => {
      Utils.removeClass(link, "active")
      const href = link.getAttribute("href").substring(1)
      if (href === currentSection) {
        Utils.addClass(link, "active")
      }
    })
  },
}

Navigation.init()
