import { format, formatDistanceToNow } from 'date-fns'

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