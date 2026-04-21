/**
 * Random Background Module
 * Capas con crossfade, última imagen desde localStorage (carga casi instantánea
 * desde caché) y precarga en segundo plano para reducir el destello claro.
 */
const BG_STORAGE_KEY = "metodocicatriz-bg-image";

class RandomBackground {
  constructor() {
    this.images = [];
    this.basePath = "assets/images/";
    this.manifestPath = "assets/images/manifest.json";
    this.layers = [];
    this.activeLayer = 0;
  }

  async init() {
    const container = document.getElementById("random-background");
    if (!container) return;

    await this.loadManifest();
    if (this.images.length === 0) return;

    this.setupLayers(container);

    const stored = this.getStoredFilename();
    const validStored =
      stored && this.images.includes(stored) ? stored : null;

    const nextName = this.pickRandomFilename(validStored);

    if (validStored) {
      this.applyImageInstant(this.layers[0], validStored);
      this.layers[1].classList.remove("bg-layer--visible");
      const L = this.layers[0];
      L.classList.add("bg-layer--instant", "bg-layer--visible");
      L.offsetHeight;
      L.classList.remove("bg-layer--instant");
      this.activeLayer = 0;
    }

    if (!validStored) {
      await this.revealFirstImage(nextName);
    } else if (nextName !== validStored) {
      await this.crossfadeTo(nextName);
    }

    try {
      localStorage.setItem(BG_STORAGE_KEY, nextName);
    } catch (e) {}

    this.schedulePreloadAll();
  }

  getStoredFilename() {
    try {
      return localStorage.getItem(BG_STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  setupLayers(container) {
    container.innerHTML =
      '<div class="bg-layer bg-layer--a" aria-hidden="true"></div>' +
      '<div class="bg-layer bg-layer--b" aria-hidden="true"></div>';
    this.layers = [
      container.querySelector(".bg-layer--a"),
      container.querySelector(".bg-layer--b"),
    ];
  }

  resolveUrl(filename) {
    return encodeURI(this.basePath + filename);
  }

  applyImageInstant(layer, filename) {
    layer.style.transition = "none";
    layer.style.backgroundImage = "url('" + this.resolveUrl(filename) + "')";
    layer.offsetHeight;
    layer.style.transition = "";
  }

  loadImage(filename) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = this.resolveUrl(filename);
    });
  }

  async revealFirstImage(filename) {
    await this.loadImage(filename);
    const layer = this.layers[0];
    layer.style.backgroundImage = "url('" + this.resolveUrl(filename) + "')";
    this.layers[1].classList.remove("bg-layer--visible");
    requestAnimationFrame(() => {
      layer.classList.add("bg-layer--visible");
    });
    this.activeLayer = 0;
  }

  async crossfadeTo(filename) {
    const ok = await this.loadImage(filename);
    if (!ok) return;
    const inactive = 1 - this.activeLayer;
    const layer = this.layers[inactive];
    layer.style.backgroundImage = "url('" + this.resolveUrl(filename) + "')";
    requestAnimationFrame(() => {
      layer.classList.add("bg-layer--visible");
      this.layers[this.activeLayer].classList.remove("bg-layer--visible");
      this.activeLayer = inactive;
    });
  }

  pickRandomFilename(exclude) {
    if (this.images.length === 1) return this.images[0];
    const candidates = this.images.filter((n) => n !== exclude);
    const pool = candidates.length ? candidates : this.images;
    return pool[Math.floor(Math.random() * pool.length)];
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

  schedulePreloadAll() {
    const run = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const isDataSaver = !!(connection && connection.saveData);
      const isSlowConnection = !!(
        connection &&
        typeof connection.effectiveType === "string" &&
        /2g/.test(connection.effectiveType)
      );
      if (isDataSaver || isSlowConnection) return;

      // Avoid saturating bandwidth/CPU by preloading only a subset.
      const preloadLimit = 8;
      this.images.slice(0, preloadLimit).forEach((name) => {
        const img = new Image();
        img.src = this.resolveUrl(name);
      });
    };
    if ("requestIdleCallback" in window) {
      requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 300);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const randomBg = new RandomBackground();
  randomBg.init();
});

window.RandomBackground = RandomBackground;
