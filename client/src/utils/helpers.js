import { format, formatDistanceToNow, isThisYear, parseISO } from 'date-fns'

export function formatRelativeTime(date) {
    if (!date) return 'Unknown date'

    const parsedDate = typeof date === 'string' ? parseISO(date) : date

    if (isNaN(parsedDate)) return 'Invalid date'

    return formatDistanceToNow(parsedDate, { addSuffix: true })
}

export function formatAbsoluteTime(date) {
    if (!date) return 'Unknown date'

    const parsedDate = typeof date === 'string' ? parseISO(date) : date

    if (isNaN(parsedDate)) return 'Invalid date'

    return format(parsedDate, 'PPP p')
}

export function formatNotificationTime(date) {
    if (!date) return 'Unknown'

    const parsedDate = typeof date === 'string' ? parseISO(date) : date

    if (isNaN(parsedDate)) return 'Invalid'

    const now = new Date()
    const diffInHours = (now - parsedDate) / (1000 * 60 * 60)

    if (diffInHours < 24) {
        return formatDistanceToNow(parsedDate, { addSuffix: false })
    } else if (isThisYear(parsedDate)) {
        return format(parsedDate, 'MMM d')
    } else {
        return format(parsedDate, 'MMM d, yyyy')
    }
}

export function formatDate(date) {
    if (!date) {
        return 'Unknown date'; // Fallback for missing or invalid dates
    }

    const now = new Date();
    const postDate = new Date(date);

    if (isNaN(postDate)) {
        return 'Invalid date'; // Fallback for improperly formatted dates
    }

    const diffInHours = (now - postDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
        return formatDistanceToNow(postDate, { addSuffix: true });
    } else {
        return format(postDate, 'PPP');
    }
}

export function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 },
        { label: 'second', seconds: 1 },
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count > 0) {
            return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
        }
    }

    return 'just now';
};