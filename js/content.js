// Content management
const Content = {
  data: {
    es: {
      title: "Candela Gencarelli - Método CICATRIZ",
      artistName: "Candela Gencarelli",
      methodTitle: "Método CICATRIZ",
      nav: {
        projects: "Proyectos",
        publications: "Publicaciones",
        bio: "Bio",
        contact: "Contacto",
      },
      sections: {
        projects: {
          title: "Proyectos",
          items: [
            {
              title: "Método CICATRIZ",
              description: "Proceso artístico de sanación y transformación personal a través del arte visual.",
            },
          ],
        },
        publications: {
          title: "Publicaciones",
          items: [
            {
              title: "Instagram Posts",
              description: "Contenido artístico y proceso creativo",
            },
          ],
        },
        bio: {
          title: "Bio",
          content:
            "Artista visual argentina especializada en procesos de sanación a través del arte. Desarrolladora del Método CICATRIZ, un enfoque único que combina técnicas artísticas con procesos de transformación personal.",
        },
        contact: {
          title: "Contacto",
          email: "candela@gencarelli.com",
          instagram: "@candela.gencarelli",
        },
      },
    },
    en: {
      title: "Candela Gencarelli - CICATRIZ Method",
      artistName: "Candela Gencarelli",
      methodTitle: "CICATRIZ Method",
      nav: {
        projects: "Projects",
        publications: "Publications",
        bio: "Bio",
        contact: "Contact",
      },
      sections: {
        projects: {
          title: "Projects",
          items: [
            {
              title: "CICATRIZ Method",
              description: "Artistic process of healing and personal transformation through visual art.",
            },
          ],
        },
        publications: {
          title: "Publications",
          items: [
            {
              title: "Instagram Posts",
              description: "Artistic content and creative process",
            },
          ],
        },
        bio: {
          title: "Bio",
          content:
            "Argentine visual artist specialized in healing processes through art. Developer of the CICATRIZ Method, a unique approach that combines artistic techniques with personal transformation processes.",
        },
        contact: {
          title: "Contact",
          email: "candela@gencarelli.com",
          instagram: "@candela.gencarelli",
        },
      },
    },
  },

  init() {
    // Content is managed through data attributes in HTML
    // This can be extended for dynamic content loading
  },

  updateDynamicContent(lang) {
    const data = this.data[lang]

    // Update page title
    document.title = data.title

    // This method can be extended to update more dynamic content
    // For now, content is handled via data attributes in HTML
  },
}
