export function formatNumber(num) {
    if (typeof num !== 'number') {
        num = parseInt(num, 10);
        if (isNaN(num)) return '0';
    }

    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}