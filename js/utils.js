// Utility functions
const Utils = {
  // DOM manipulation helpers
  select: (selector) => document.querySelector(selector),
  selectAll: (selector) => document.querySelectorAll(selector),

  // Event handling
  on: (element, event, handler) => {
    if (element) {
      element.addEventListener(event, handler)
    }
  },

  // Class manipulation
  addClass: (element, className) => {
    if (element) {
      element.classList.add(className)
    }
  },

  removeClass: (element, className) => {
    if (element) {
      element.classList.remove(className)
    }
  },

  toggleClass: (element, className) => {
    if (element) {
      element.classList.toggle(className)
    }
  },

  // Animation helpers
  fadeIn: (element, duration = 300) => {
    if (element) {
      element.style.opacity = "0"
      element.style.display = "block"

      let start = null
      const animate = (timestamp) => {
        if (!start) start = timestamp
        const progress = timestamp - start
        const opacity = Math.min(progress / duration, 1)

        element.style.opacity = opacity

        if (progress < duration) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }
  },

  // Local storage helpers
  setStorage: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn("Could not save to localStorage:", e)
    }
  },

  getStorage: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (e) {
      console.warn("Could not read from localStorage:", e)
      return defaultValue
    }
  },
}
