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

    const createMediaList = (post) => {
        if (!post) return [];
        
        const images = Array.isArray(post.images) ? post.images.map(url => ({
            type: 'image',
            url: getOptimizedImageUrl(url),
            srcset: getImageSrcSet(url),
            alt: post.content || 'Post image'
        })) : [];
        
        const video = post.video ? [{
            type: 'video',
            url: post.video,
            thumbnail: post.videoThumbnail
        }] : [];
        
        return [...images, ...video];
    };

    return {
        getOptimizedImageUrl,
        getImageSrcSet,
        createMediaList,
    };
}
