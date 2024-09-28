import { format, formatDistanceToNow } from 'date-fns'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
})

export function formatDate(date) {
    const now = new Date()
    const postDate = new Date(date)
    const diffInHours = (now - postDate) / (1000 * 60 * 60)

    if (diffInHours < 24) {
        return formatDistanceToNow(postDate, { addSuffix: true })
    } else {
        return format(postDate, 'PPP')
    }
}

export function renderMarkdown(content) {
    const renderedContent = md.render(content)
    return sanitizeHtml(renderedContent, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ['src', 'alt']
        }
    })
}