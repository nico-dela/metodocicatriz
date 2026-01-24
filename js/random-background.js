/**
 * Random Background Module
 * Displays a random background image from assets/images/manifest.json
 */
class RandomBackground {
  constructor() {
    this.images = [];
    this.basePath = "assets/images/";
    this.manifestPath = "assets/images/manifest.json";
  }

  async init() {
    const container = document.getElementById("random-background");
    if (!container) return;

    // Load images from manifest
    await this.loadManifest();

    if (this.images.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * this.images.length);
    const selectedImage = this.images[randomIndex];

    this.applyBackground(container, selectedImage);
  }

  async loadManifest() {
    try {
      const response = await fetch(this.manifestPath);
      if (response.ok) {
        const data = await response.json();
        this.images = data.images || [];
      }
    } catch (error) {
      console.warn("Could not load images manifest:", error);
    }
  }

  applyBackground(container, imageName) {
    const imageUrl = `${this.basePath}${imageName}`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      container.style.backgroundImage = `url('${imageUrl}')`;
    };
    img.src = imageUrl;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const randomBg = new RandomBackground();
  randomBg.init();
});

// Export for external use
window.RandomBackground = RandomBackground;
