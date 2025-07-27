// Gallery management module
export class GalleryManager {
  constructor() {
    this.galleryItems = document.querySelectorAll('.gallery-item');
    this.galleryImages = document.querySelectorAll('.gallery-image');
  }

  init() {
    this.setupGalleryInteractions();
    this.setupImageLoading();
  }

  setupGalleryInteractions() {
    this.galleryItems.forEach((item, index) => {
      // Add hover effects
      item.addEventListener('mouseenter', () => {
        this.onItemHover(item, index);
      });

      item.addEventListener('mouseleave', () => {
        this.onItemLeave(item, index);
      });

      // Add click functionality
      item.addEventListener('click', () => {
        this.onItemClick(item, index);
      });
    });
  }

  setupImageLoading() {
    this.galleryImages.forEach((img, index) => {
      // Add loading state
      img.addEventListener('load', () => {
        img.style.opacity = '1';
      });

      // Add error handling
      img.addEventListener('error', () => {
        console.warn(`Failed to load image ${index + 1}`);
        img.alt = `Image ${index + 1} - Loading failed`;
      });
    });
  }

  onItemHover(item, index) {
    // Add subtle animation or effect
    item.style.transform = 'translateY(-5px)';
  }

  onItemLeave(item, index) {
    // Reset animation
    item.style.transform = 'translateY(0)';
  }

  onItemClick(item, index) {
    // Could implement lightbox or navigation to procesos detail
    console.log(`Gallery item ${index + 1} clicked`);

    // For now, just add a subtle feedback
    item.style.transform = 'scale(0.95)';
    setTimeout(() => {
      item.style.transform = 'translateY(-5px)';
    }, 150);
  }
}