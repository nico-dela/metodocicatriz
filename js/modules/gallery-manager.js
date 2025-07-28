// Gallery management module
export class GalleryManager {
  constructor() {
    this.galleryItems = document.querySelectorAll(".gallery-item")
    this.galleryImages = document.querySelectorAll(".gallery-image")
    this.observer = null
  }

  init() {
    this.setupGalleryInteractions()
    this.setupImageLoading()
    this.setupIntersectionObserver()
    this.setupTouchInteractions()
  }

  setupGalleryInteractions() {
    this.galleryItems.forEach((item, index) => {
      // Add hover effects for desktop
      if (window.matchMedia("(hover: hover)").matches) {
        item.addEventListener("mouseenter", () => {
          this.onItemHover(item, index)
        })

        item.addEventListener("mouseleave", () => {
          this.onItemLeave(item, index)
        })
      }

      // Add click functionality
      item.addEventListener("click", (e) => {
        this.onItemClick(item, index, e)
      })

      // Add keyboard support
      item.setAttribute("tabindex", "0")
      item.setAttribute("role", "button")
      item.setAttribute("aria-label", `Gallery item ${index + 1}`)

      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          this.onItemClick(item, index, e)
        }
      })
    })
  }

  setupImageLoading() {
    this.galleryImages.forEach((img, index) => {
      const item = img.closest(".gallery-item")

      // Add loading state
      item.classList.add("loading")

      // Create placeholder images
      const placeholderSrc = `/placeholder.svg?height=250&width=250&query=artistic work ${index + 1}`
      img.src = placeholderSrc

      img.addEventListener("load", () => {
        item.classList.remove("loading")
        img.classList.add("loaded")
      })

      // Add error handling
      img.addEventListener("error", () => {
        console.warn(`Failed to load image ${index + 1}`)
        item.classList.remove("loading")
        img.alt = `Artwork ${index + 1}`
        img.classList.add("loaded")
      })
    })
  }

  setupIntersectionObserver() {
    // Lazy loading and animation trigger
    const options = {
      threshold: 0.1,
      rootMargin: "50px",
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const item = entry.target
          const img = item.querySelector(".gallery-image")

          // Trigger animation
          item.style.animationPlayState = "running"

          this.observer.unobserve(item)
        }
      })
    }, options)

    this.galleryItems.forEach((item) => {
      this.observer.observe(item)
    })
  }

  setupTouchInteractions() {
    // Enhanced touch interactions for mobile
    this.galleryItems.forEach((item, index) => {
      let touchStartTime = 0
      let touchStartPos = { x: 0, y: 0 }

      item.addEventListener(
        "touchstart",
        (e) => {
          touchStartTime = Date.now()
          const touch = e.touches[0]
          touchStartPos = { x: touch.clientX, y: touch.clientY }

          // Add touch feedback
          item.style.transform = "scale(0.95)"
        },
        { passive: true },
      )

      item.addEventListener(
        "touchend",
        (e) => {
          const touchEndTime = Date.now()
          const touchDuration = touchEndTime - touchStartTime

          // Reset transform
          item.style.transform = ""

          // Only trigger click if it was a quick tap (not a scroll)
          if (touchDuration < 300) {
            const touch = e.changedTouches[0]
            const touchEndPos = { x: touch.clientX, y: touch.clientY }
            const distance = Math.sqrt(
              Math.pow(touchEndPos.x - touchStartPos.x, 2) + Math.pow(touchEndPos.y - touchStartPos.y, 2),
            )

            if (distance < 10) {
              this.onItemClick(item, index, e)
            }
          }
        },
        { passive: true },
      )

      item.addEventListener(
        "touchcancel",
        () => {
          item.style.transform = ""
        },
        { passive: true },
      )
    })
  }

  onItemHover(item, index) {
    // Subtle hover effect
    item.style.transform = "translateY(-8px) scale(1.02)"
  }

  onItemLeave(item, index) {
    // Reset hover effect
    item.style.transform = ""
  }

  onItemClick(item, index, event) {
    console.log(`Gallery item ${index + 1} clicked`)

    // Add click feedback
    item.style.transform = "scale(0.95)"

    // Haptic feedback for supported devices
    if ("vibrate" in navigator) {
      navigator.vibrate(50)
    }

    setTimeout(() => {
      if (window.matchMedia("(hover: hover)").matches) {
        item.style.transform = "translateY(-8px) scale(1.02)"
      } else {
        item.style.transform = ""
      }
    }, 150)

    // Future: Could implement lightbox or navigation to process detail
    // For now, just provide visual feedback
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}
