import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
});

export function renderMarkdown(markdown) {
    if (typeof markdown !== 'string') {
        throw new TypeError('Input must be a string');
    }

    // Render raw HTML from Markdown
    const rawHtml = md.render(markdown);

    // Sanitize the rendered HTML
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
        ALLOWED_ATTR: ['href', 'title', 'target'],
    });

    return sanitizedHtml;
}