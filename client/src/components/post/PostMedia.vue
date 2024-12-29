<template>
    <div>
        <!-- Image Gallery -->
        <div v-if="hasImages" class="mb-4">
            <div v-if="singleImage" class="mb-4">
                <div @click="openLightbox(0)" class="cursor-pointer rounded-lg overflow-hidden">
                    <img v-if="!post.image[0].covered" :src="post.image[0].url" :alt="post.described"
                        class="w-full h-auto object-cover" loading="lazy" />
                    <div v-else class="w-full h-64 bg-gray-200 flex items-center justify-center">
                        <p class="text-gray-600">This image is covered</p>
                        <button @click.stop="uncoverMedia(post.image[0].id)"
                            class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg" data-testid="uncover-image-button">
                            Uncover
                        </button>
                    </div>
                </div>
            </div>
            <div v-else-if="twoImages" class="grid grid-cols-2 gap-2">
                <div v-for="(img, index) in post.image" :key="img.id" @click="openLightbox(index)"
                    class="relative overflow-hidden rounded-lg cursor-pointer">
                    <img v-if="!img.covered" :src="img.url" :alt="post.described" class="w-full h-48 object-cover"
                        loading="lazy" />
                    <div v-else class="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <p class="text-gray-600">This image is covered</p>
                        <button @click.stop="uncoverMedia(img.id)"
                            class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg" data-testid="uncover-image-button">
                            Uncover
                        </button>
                    </div>
                </div>
            </div>
            <div v-else-if="threeImages" class="grid grid-cols-2 gap-2">
                <div class="relative overflow-hidden rounded-lg cursor-pointer row-span-2" @click="openLightbox(0)">
                    <img v-if="!post.image[0].covered" :src="post.image[0].url" :alt="post.described"
                        class="w-full h-full object-cover" loading="lazy" />
                    <div v-else class="w-full h-full bg-gray-200 flex items-center justify-center">
                        <p class="text-gray-600">This image is covered</p>
                        <button @click.stop="uncoverMedia(post.image[0].id)"
                            class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg" data-testid="uncover-image-button">
                            Uncover
                        </button>
                    </div>
                </div>
                <div v-for="index in [1, 2]" :key="post.image[index].id" @click="openLightbox(index)"
                    class="relative overflow-hidden rounded-lg cursor-pointer">
                    <img v-if="!post.image[index].covered" :src="post.image[index].url" :alt="post.described"
                        class="w-full h-48 object-cover" loading="lazy" />
                    <div v-else class="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <p class="text-gray-600">This image is covered</p>
                        <button @click.stop="uncoverMedia(post.image[index].id)"
                            class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg" data-testid="uncover-image-button">
                            Uncover
                        </button>
                    </div>
                </div>
            </div>
            <div v-else-if="fourOrMoreImages" class="grid grid-cols-2 gap-2">
                <div v-for="(img, index) in visibleImages" :key="img.id" @click="openLightbox(index)"
                    class="relative overflow-hidden rounded-lg cursor-pointer">
                    <img v-if="!img.covered" :src="img.url" :alt="post.described" class="w-full h-48 object-cover"
                        loading="lazy" />
                    <div v-else class="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <p class="text-gray-600">This image is covered</p>
                        <button @click.stop="uncoverMedia(img.id)"
                            class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg" data-testid="uncover-image-button">
                            Uncover
                        </button>
                    </div>
                    <div v-if="index === 3 && post.image.length > 4"
                        class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-2xl font-bold"
                        aria-label="More images">
                        +{{ post.image.length - 4 }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Video Gallery -->
        <div v-if="hasVideos" class="mb-4">
            <div class="relative">
                <video v-if="!post.video[0].covered" :src="post.video[0].url"
                    class="w-full h-auto rounded-lg cursor-pointer" @click="openLightbox(0)" controls loading="lazy">
                    Your browser does not support the video tag.
                </video>
                <div v-else class="w-full h-64 bg-gray-200 flex items-center justify-center rounded-lg">
                    <p class="text-gray-600">This video is covered</p>
                    <button @click.stop="uncoverMedia(post.video[0].id)"
                        class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg" data-testid="uncover-video-button">
                        Uncover
                    </button>
                </div>
                <div v-if="!post.video[0].covered" class="absolute inset-0 flex items-center justify-center">
                    <PlayIcon class="w-16 h-16 text-white opacity-75 hover:opacity-100 transition-opacity duration-200"
                        aria-hidden="true" />
                </div>
            </div>
        </div>

        <!-- Media Viewer -->
        <MediaViewer v-if="showLightbox" :isOpen="showLightbox" :mediaList="mediaList" :initialIndex="currentMediaIndex"
            :likes="post.like" :comments="post.comment" :isLiked="post.isLiked === '1'" @close="closeLightbox"
            @like="handleLike" @comment="handleComment" data-testid="media-viewer" />
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { PlayIcon } from 'lucide-vue-next';
import MediaViewer from '../shared/MediaViewer.vue';
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '../ui/toast';
import { usePostStore } from '../../stores/postStore';

// Define component props
const props = defineProps({
    post: {
        type: Object,
        required: true,
    },
});

// Define component emits
const emit = defineEmits(['uncoverMedia', 'like', 'comment']);

// Composables and utilities
const { handleError } = useErrorHandler();
const { toast } = useToast();
const postStore = usePostStore();

// Reactive state for media viewer
const showLightbox = ref(false);
const currentMediaIndex = ref(0);

// Computed properties for media lists
const hasImages = computed(() => props.post.image && props.post.image.length > 0);
const hasVideos = computed(() => props.post.video && props.post.video.length > 0);
const singleImage = computed(() => props.post.image.length === 1);
const twoImages = computed(() => props.post.image.length === 2);
const threeImages = computed(() => props.post.image.length === 3);
const fourOrMoreImages = computed(() => props.post.image.length >= 4);
const visibleImages = computed(() => props.post.image.slice(0, 4));

// Computed property for media list to be viewed in MediaViewer
const mediaList = computed(() => {
    let media = [];

    if (hasImages.value) {
        media = props.post.image.slice(0, 4).map((img) => ({
            type: 'image',
            url: img.url,
            alt: props.post.described,
            covered: img.covered,
        }));
    }

    if (hasVideos.value) {
        media.push({
            type: 'video',
            url: props.post.video[0].url,
            covered: props.post.video[0].covered,
        });
    }

    return media;
});

// Method to open the media viewer (lightbox)
const openLightbox = (index) => {
    currentMediaIndex.value = index;
    showLightbox.value = true;
};

// Method to close the media viewer
const closeLightbox = () => {
    showLightbox.value = false;
};

// Method to uncover media (image/video)
const uncoverMedia = async (mediaId) => {
    try {
        await postStore.uncoverMedia(props.post.id, mediaId);
        toast({ type: 'success', message: 'Media uncovered successfully.' });
        emit('uncoverMedia', mediaId);
    } catch (error) {
        console.error('Failed to uncover media:', error);
        toast({ type: 'error', message: 'Failed to uncover media. Please try again.' });
        await handleError(error);
    }
};

// Method to handle like action
const handleLike = async () => {
    try {
        await postStore.toggleLike(props.post.id);
    } catch (error) {
        console.error('Failed to like post:', error);
        toast({ type: 'error', message: 'Failed to like post. Please try again.' });
        await handleError(error);
    }
};

// Method to handle comment action
const handleComment = () => {
    emit('comment');
};
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