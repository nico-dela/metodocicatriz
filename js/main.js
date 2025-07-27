// Main application entry point
import { TranslationManager } from './modules/translation-manager.js';
import { NavigationManager } from './modules/navigation-manager.js';
import { GalleryManager } from './modules/gallery-manager.js';

class App {
  constructor() {
    this.translationManager = new TranslationManager();
    this.navigationManager = new NavigationManager();
    this.galleryManager = new GalleryManager();

    this.init();
  }

  async init() {
    try {
      // Initialize translation system
      await this.translationManager.init();

      // Initialize navigation
      this.navigationManager.init();

      // Initialize gallery if on home page
      if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        this.galleryManager.init();
      }

      console.log('App initialized successfully');
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new App();
});