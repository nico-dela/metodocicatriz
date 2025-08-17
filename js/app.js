// Main application initialization
class App {
  constructor() {
    this.init()
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      window.Utils.on(document, "DOMContentLoaded", () => {
        this.initializeModules()
      })
    } else {
      this.initializeModules()
    }
  }

  initializeModules() {
    try {
      // Initialize all modules
      window.Navigation.init()
      window.Language.init()
      window.Content.init()

      // Add fade-in animation to main content
      const mainContent = window.Utils.select(".main-content")
      if (mainContent) {
        window.Utils.addClass(mainContent, "fade-in")
      }

      console.log("App initialized successfully")
    } catch (error) {
      console.error("Error initializing app:", error)
    }
  }
}

// Initialize the application
new App()

// Declare Utils, Navigation, Language, and Content variables
window.Utils = {
  on: (element, event, handler) => element.addEventListener(event, handler),
  select: (selector) => document.querySelector(selector),
  addClass: (element, className) => element.classList.add(className),
}

window.Navigation = {
  init: () => console.log("Navigation initialized"),
}

window.Language = {
  init: () => console.log("Language initialized"),
}

window.Content = {
  init: () => console.log("Content initialized"),
}
