<template>
    <transition name="fade">
        <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
            role="dialog" aria-labelledby="media-viewer-title" aria-modal="true" data-testid="media-viewer">
            <div class="relative max-w-4xl max-h-full w-full">
                <!-- Close Button -->
                <button @click="close" class="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none"
                    aria-label="Close Media Viewer" data-testid="close-media-viewer-button">
                    <XIcon class="w-8 h-8" />
                </button>

                <!-- Media Content -->
                <div v-if="currentMedia.type === 'image'" class="flex items-center justify-center">
                    <img :src="getOptimizedImageUrl(currentMedia.url)" :srcset="getImageSrcSet(currentMedia.url)"
                        sizes="(max-width: 768px) 100vw, 80vw" :alt="currentMedia.alt || 'Post Media'"
                        class="max-w-full max-h-[90vh] object-contain" loading="lazy" @click="handleImageClick" />
                </div>

                <div v-else-if="currentMedia.type === 'video'" class="flex items-center justify-center">
                    <video ref="videoPlayer" :src="currentMedia.url" class="max-w-full max-h-[90vh]" controls
                        @click="handleVideoClick" loading="lazy">
                        Your browser does not support the video tag.
                    </video>
                </div>

                <!-- Navigation Buttons -->
                <button v-if="mediaList.length > 1" @click="previousMedia"
                    class="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 focus:outline-none"
                    aria-label="Previous Media" data-testid="previous-media-button">
                    <ChevronLeftIcon class="w-10 h-10" />
                </button>

                <button v-if="mediaList.length > 1" @click="nextMedia"
                    class="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 focus:outline-none"
                    aria-label="Next Media" data-testid="next-media-button">
                    <ChevronRightIcon class="w-10 h-10" />
                </button>

                <!-- Media Indicators -->
                <div v-if="mediaList.length > 1" class="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                    <button v-for="(media, index) in mediaList" :key="index" @click="setCurrentMedia(index)"
                        class="w-3 h-3 rounded-full focus:outline-none transition-colors duration-200"
                        :class="index === currentIndex ? 'bg-white' : 'bg-gray-500 hover:bg-gray-300'"
                        :aria-label="`View media ${index + 1}`" data-testid="media-indicator-button"></button>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-vue-next';
import { useRateLimiter } from '../../composables/useRateLimiter';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { useToast } from '../../composables/useToast';

// Define component props
const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
    mediaList: {
        type: Array,
        required: true,
    },
    initialIndex: {
        type: Number,
        default: 0,
    },
    likes: {
        type: Number,
        default: 0,
    },
    comments: {
        type: Number,
        default: 0,
    },
    isLiked: {
        type: Boolean,
        default: false,
    },
});

// Define component emits
const emit = defineEmits(['close', 'like', 'comment']);

// Composables and utilities
const { handleError } = useErrorHandler();
const { showToast } = useToast();
const rateLimiter = useRateLimiter(5, 1000); // Max 5 actions per second

// Reactive state
const currentIndex = ref(props.initialIndex);
const videoPlayer = ref(null);

// Computed property for current media
const currentMedia = computed(() => props.mediaList[currentIndex.value] || {});

// Methods to navigate media with rate limiting
const previousMedia = () => {
    if (rateLimiter.isRateLimited.value) return;
    rateLimiter.incrementAttempts();
    currentIndex.value = (currentIndex.value - 1 + props.mediaList.length) % props.mediaList.length;
};

const nextMedia = () => {
    if (rateLimiter.isRateLimited.value) return;
    rateLimiter.incrementAttempts();
    currentIndex.value = (currentIndex.value + 1) % props.mediaList.length;
};

const setCurrentMedia = (index) => {
    if (rateLimiter.isRateLimited.value) return;
    rateLimiter.incrementAttempts();
    currentIndex.value = index;
};

// Methods to handle media interactions
const handleLike = async () => {
    try {
        await emit('like');
    } catch (error) {
        console.error('Error liking media:', error);
        showToast('Failed to like media. Please try again.', 'error');
        await handleError(error);
    }
};

const handleComment = () => {
    emit('comment');
};

// Method to close the media viewer
const close = () => {
    emit('close');
};

// Methods to handle clicks on media
const handleImageClick = () => {
    // Additional logic can be added here if needed
};

const handleVideoClick = () => {
    // Play or pause video based on current state
    if (videoPlayer.value) {
        if (videoPlayer.value.paused) {
            videoPlayer.value.play();
        } else {
            videoPlayer.value.pause();
        }
    }
};

// Helper methods for image optimization
const getOptimizedImageUrl = (url, width = 1280) => {
    // Implement logic to return an optimized version of the image
    // For example, using a CDN that supports image resizing
    return `${url}?w=${width}&q=80&auto=format`;
};

const getImageSrcSet = (url) => {
    const widths = [320, 640, 1024, 1280, 1920];
    return widths.map((w) => `${getOptimizedImageUrl(url, w)} ${w}w`).join(', ');
};

// Keyboard navigation
const handleKeydown = (event) => {
    if (event.key === 'Escape') {
        close();
    } else if (event.key === 'ArrowLeft') {
        previousMedia();
    } else if (event.key === 'ArrowRight') {
        nextMedia();
    }
};

// Event listeners for keyboard navigation
onMounted(() => {
    if (props.isOpen) {
        window.addEventListener('keydown', handleKeydown);
        document.body.style.overflow = 'hidden';
    }
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
    document.body.style.overflow = '';
});

// Watch for isOpen prop changes
watch(
    () => props.isOpen,
    (newVal) => {
        if (newVal) {
            window.addEventListener('keydown', handleKeydown);
            document.body.style.overflow = 'hidden';
        } else {
            window.removeEventListener('keydown', handleKeydown);
            document.body.style.overflow = '';
        }
    }
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

button:disabled {
    pointer-events: none;
}

.absolute {
    position: absolute;
}

.relative {
    position: relative;
}

.cursor-pointer {
    cursor: pointer;
}
</style>