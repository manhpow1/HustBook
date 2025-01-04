import { computed } from 'vue';

export function useMediaUtils() {
    const getOptimizedImageUrl = (url, width = 1280) => {
        if (!url) return '';
        return `${url}?w=${width}&q=80&auto=format`;
    };

    const getImageSrcSet = (url) => {
        if (!url) return '';
        const widths = [320, 640, 1024, 1280, 1920];
        return widths.map((w) => `${getOptimizedImageUrl(url, w)} ${w}w`).join(', ');
    };

    const createMediaList = (images = [], videos = [], described = '') => {
        const media = [];

        if (images?.length) {
            media.push(
                ...images.slice(0, 4).map((img) => ({
                    type: 'image',
                    url: img.url,
                    alt: described,
                    covered: img.covered,
                }))
            );
        }

        if (videos?.length) {
            media.push({
                type: 'video',
                url: videos[0].url,
                covered: videos[0].covered,
            });
        }

        return media;
    };

    return {
        getOptimizedImageUrl,
        getImageSrcSet,
        createMediaList,
    };
}