// Gallery management module
export class GalleryManager {
  constructor() {
    this.galleryItems = document.querySelectorAll(".gallery-item")
    this.galleryImages = document.querySelectorAll(".gallery-image")
  }

  init() {
    this.setupGalleryInteractions()
    this.setupImageLoading()
  }

  setupGalleryInteractions() {
    this.galleryItems.forEach((item, index) => {
      // Add click functionality
      item.addEventListener("click", () => {
        this.onItemClick(item, index)
      })
    })
  }

  setupImageLoading() {
    this.galleryImages.forEach((img, index) => {
      // Create placeholder images
      const placeholderSrc = `/placeholder.svg?height=250&width=250&query=artistic work ${index + 1}`
      img.src = placeholderSrc

      img.addEventListener("load", () => {
        img.style.opacity = "1"
      })

      // Add error handling
      img.addEventListener("error", () => {
        console.warn(`Failed to load image ${index + 1}`)
        img.alt = `Artwork ${index + 1}`
      })
    })
  }

  onItemClick(item, index) {
    console.log(`Gallery item ${index + 1} clicked`)
    // Future: Could implement lightbox or navigation to process detail
  }
}
