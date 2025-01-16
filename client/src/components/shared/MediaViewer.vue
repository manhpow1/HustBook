<template>
    <Dialog :open="isOpen" @update:open="close">
        <DialogContent class="max-w-none w-full h-full bg-transparent border-none shadow-none p-0">
            <div class="relative w-full h-full flex items-center justify-center">
                <DialogClose
                    class="fixed right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X class="h-8 w-8 text-white" />
                    <span class="sr-only">Close</span>
                </DialogClose>

                <!-- Media Content -->
                <div v-if="currentMedia.type === 'image'" class="flex items-center justify-center w-full h-full px-4">
                    <img :src="currentMedia.url" :alt="currentMedia.alt || 'Post Media'"
                        class="w-auto h-auto max-w-[95vw] max-h-[90vh] object-contain transition-transform duration-300"
                        loading="lazy" @click="handleImageClick" />
                </div>

                <!-- Navigation Buttons -->
                <Button v-if="mediaList.length > 1" variant="ghost" size="icon"
                    class="absolute left-4 top-1/2 -translate-y-1/2 h-auto bg-transparent hover:bg-accent/10"
                    :disabled="rateLimiter.isRateLimited" @click="previousMedia" data-testid="previous-media-button">
                    <ChevronLeft class="h-10 w-10 text-white" />
                    <span class="sr-only">Previous media</span>
                </Button>

                <Button v-if="mediaList.length > 1" variant="ghost" size="icon"
                    class="absolute right-4 top-1/2 -translate-y-1/2 h-auto bg-transparent hover:bg-accent/10"
                    :disabled="rateLimiter.isRateLimited" @click="nextMedia" data-testid="next-media-button">
                    <ChevronRight class="h-10 w-10 text-white" />
                    <span class="sr-only">Next media</span>
                </Button>

                <!-- Media Indicators -->
                <div v-if="mediaList.length > 1" class="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    <Button v-for="(media, index) in mediaList" :key="index" variant="ghost" size="icon"
                        class="w-3 h-3 p-0 rounded-full"
                        :class="index === currentIndex ? 'bg-white' : 'bg-gray-500 hover:bg-gray-300'"
                        :disabled="rateLimiter.isRateLimited" @click="setCurrentMedia(index)"
                        :aria-label="`View media ${index + 1} of ${mediaList.length}`"
                        data-testid="media-indicator-button" />
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRateLimiter } from '../../composables/useRateLimiter';
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '../ui/toast';

// Define component props
const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
    mediaList: {
        type: Array,
        required: true,
        validator: (value) => {
            return value.every(item =>
                (item.type === 'image' || item.type === 'video') &&
                typeof item.url === 'string'
            );
        }
    },
    initialIndex: {
        type: Number,
        default: 0,
        validator: (value) => value >= 0
    },
    likes: {
        type: Number,
        default: 0,
        validator: (value) => value >= 0
    },
    comments: {
        type: Number,
        default: 0,
        validator: (value) => value >= 0
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
const { toast } = useToast();
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
        toast({ type: 'error', message: 'Failed to like media. Please try again.' });
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
