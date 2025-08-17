// Language switching functionality
const Utils = {
  getStorage(key, defaultValue) {
    const value = localStorage.getItem(key)
    return value !== null ? value : defaultValue
  },
  setStorage(key, value) {
    localStorage.setItem(key, value)
  },
  selectAll(selector) {
    return document.querySelectorAll(selector)
  },
  on(element, event, handler) {
    element.addEventListener(event, handler)
  },
  removeClass(element, className) {
    element.classList.remove(className)
  },
  addClass(element, className) {
    element.classList.add(className)
  },
}

const Language = {
  currentLang: "es",

  init() {
    this.currentLang = Utils.getStorage("language", "es")
    this.bindEvents()
    this.updateContent()
    this.updateButtons()
  },

  bindEvents() {
    const langButtons = Utils.selectAll(".lang-btn")
    langButtons.forEach((btn) => {
      Utils.on(btn, "click", () => {
        const lang = btn.getAttribute("data-lang")
        this.switchLanguage(lang)
      })
    })
  },

  switchLanguage(lang) {
    if (lang !== this.currentLang) {
      this.currentLang = lang
      Utils.setStorage("language", lang)
      this.updateContent()
      this.updateButtons()
    }
  },

  updateContent() {
    const elements = Utils.selectAll("[data-es][data-en]")
    elements.forEach((element) => {
      const content = element.getAttribute(`data-${this.currentLang}`)
      if (content) {
        element.textContent = content
      }
    })

    // Update document language
    document.documentElement.lang = this.currentLang
  },

  updateButtons() {
    const langButtons = Utils.selectAll(".lang-btn")
    langButtons.forEach((btn) => {
      Utils.removeClass(btn, "active")
      if (btn.getAttribute("data-lang") === this.currentLang) {
        Utils.addClass(btn, "active")
      }
    })
  },
}
