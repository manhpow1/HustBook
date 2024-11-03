import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
const md = new MarkdownIt({
    html: true,      
    breaks: true,    
    linkify: true,   
});
export function renderMarkdown(markdown) {
    // Parse Markdown to HTML
    const rawHtml = md.render(markdown);

    // Sanitize the HTML to prevent XSS attacks
    const cleanHtml = DOMPurify.sanitize(rawHtml);

    return cleanHtml;
}