import marked from 'marked'
import DOMPurify from 'dompurify'

export function renderMarkdown(markdown) {
    // Set up marked options
    marked.setOptions({
        gfm: true,
        breaks: true,
        sanitize: false, // We'll use DOMPurify for sanitization
    })

    // Parse markdown to HTML
    const rawHtml = marked(markdown)

    // Sanitize the HTML to prevent XSS attacks
    const cleanHtml = DOMPurify.sanitize(rawHtml)

    return cleanHtml
}