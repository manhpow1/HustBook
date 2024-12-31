export function formatNumber(num) {
    if (typeof num !== 'number') {
        num = parseInt(num, 10);
        if (isNaN(num)) return '0';
    }
    if (num < 0 || num > 1e15) { // Adjust upper limit as needed
        throw new Error('Number out of acceptable range');
    }

    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}