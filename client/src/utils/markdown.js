import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
});

export function renderMarkdown(markdown) {
    const rawHtml = md.render(markdown);
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    return sanitizedHtml;
}