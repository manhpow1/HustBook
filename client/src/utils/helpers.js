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
    if (!dateString) return 'Unknown date';
    
    try {
        const date = parseISO(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 30) return 'just now';
        if (diffInSeconds < 60) return 'less than a minute ago';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 7200) return '1 hour ago';
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 172800) return 'yesterday';
        
        // For older dates, use a more detailed format
        if (isThisYear(date)) {
            return format(date, 'MMM d');
        }
        return format(date, 'MMM d, yyyy');
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}
