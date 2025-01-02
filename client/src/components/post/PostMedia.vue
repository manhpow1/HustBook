<template>
    <div>
        <!-- Image Grid Layout -->
        <div v-if="hasImages" class="mb-4">
            <!-- Single Image Layout -->
            <div v-if="singleImage" class="mb-4">
                <Card class="overflow-hidden">
                    <AspectRatio ratio={16/9}>
                        <div v-if="!post.image[0].covered" @click="openLightbox(0)"
                            class="relative w-full h-full cursor-pointer group">
                            <img :src="post.image[0].url" :alt="post.described"
                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
                        </div>
                        <div v-else class="flex items-center justify-center h-full bg-muted">
                            <div class="text-center">
                                <p class="text-muted-foreground mb-2">This image is covered</p>
                                <Button variant="default" @click.stop="uncoverMedia(post.image[0].id)">
                                    <EyeIcon class="h-4 w-4 mr-2" />
                                    Uncover
                                </Button>
                            </div>
                        </div>
                    </AspectRatio>
                </Card>
            </div>
            <!-- Two Images Layout -->
            <div v-else-if="twoImages" class="grid grid-cols-2 gap-2">
                <Card v-for="(img, index) in post.image" :key="img.id" class="overflow-hidden">
                    <AspectRatio ratio={1}>
                        <div v-if="!img.covered" @click="openLightbox(index)"
                            class="relative w-full h-full cursor-pointer group">
                            <img :src="img.url" :alt="post.described"
                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
                        </div>
                        <div v-else class="flex items-center justify-center h-full bg-muted">
                            <div class="text-center">
                                <p class="text-muted-foreground mb-2">This image is covered</p>
                                <Button variant="default" @click.stop="uncoverMedia(img.id)">
                                    <EyeIcon class="h-4 w-4 mr-2" />
                                    Uncover
                                </Button>
                            </div>
                        </div>
                    </AspectRatio>
                </Card>
            </div>
            <!-- Three Images Layout -->
            <div v-else-if="threeImages" class="grid grid-cols-2 gap-2">
                <Card class="overflow-hidden row-span-2">
                    <AspectRatio ratio={1}>
                        <div v-if="!post.image[0].covered" @click="openLightbox(0)"
                            class="relative w-full h-full cursor-pointer group">
                            <img :src="post.image[0].url" :alt="post.described"
                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
                        </div>
                        <div v-else class="flex items-center justify-center h-full bg-muted">
                            <div class="text-center">
                                <p class="text-muted-foreground mb-2">This image is covered</p>
                                <Button variant="default" @click.stop="uncoverMedia(post.image[0].id)">
                                    <EyeIcon class="h-4 w-4 mr-2" />
                                    Uncover
                                </Button>
                            </div>
                        </div>
                    </AspectRatio>
                </Card>
                <Card v-for="index in [1, 2]" :key="post.image[index].id" class="overflow-hidden">
                    <AspectRatio ratio={1}>
                        <div v-if="!post.image[index].covered" @click="openLightbox(index)"
                            class="relative w-full h-full cursor-pointer group">
                            <img :src="post.image[index].url" :alt="post.described"
                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
                        </div>
                        <div v-else class="flex items-center justify-center h-full bg-muted">
                            <div class="text-center">
                                <p class="text-muted-foreground mb-2">This image is covered</p>
                                <Button variant="default" @click.stop="uncoverMedia(post.image[index].id)">
                                    <EyeIcon class="h-4 w-4 mr-2" />
                                    Uncover
                                </Button>
                            </div>
                        </div>
                    </AspectRatio>
                </Card>
            </div>
            <!-- Four or More Images Layout -->
            <div v-else-if="fourOrMoreImages" class="grid grid-cols-2 gap-2">
                <Card v-for="(img, index) in visibleImages" :key="img.id" class="overflow-hidden">
                    <AspectRatio ratio={1}>
                        <div v-if="!img.covered" @click="openLightbox(index)"
                            class="relative w-full h-full cursor-pointer group">
                            <img :src="img.url" :alt="post.described"
                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
                            <div v-if="index === 3 && post.image.length > 4"
                                class="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                                <span class="text-2xl font-bold">+{{ post.image.length - 4 }}</span>
                            </div>
                        </div>
                        <div v-else class="flex items-center justify-center h-full bg-muted">
                            <div class="text-center">
                                <p class="text-muted-foreground mb-2">This image is covered</p>
                                <Button variant="default" @click.stop="uncoverMedia(img.id)">
                                    <EyeIcon class="h-4 w-4 mr-2" />
                                    Uncover
                                </Button>
                            </div>
                        </div>
                    </AspectRatio>
                </Card>
            </div>
        </div>

        <!-- Video Layout -->
        <div v-if="hasVideos" class="mb-4">
            <Card class="overflow-hidden">
                <AspectRatio ratio={16/9}>
                    <div v-if="!post.video[0].covered" class="relative w-full h-full">
                        <video :src="post.video[0].url" class="w-full h-full object-cover cursor-pointer"
                            @click="openLightbox(0)" controls loading="lazy">
                            Your browser does not support the video tag.
                        </video>
                        <div
                            class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                            <PlayIcon class="w-16 h-16 text-white" />
                        </div>
                    </div>
                    <div v-else class="flex items-center justify-center h-full bg-muted">
                        <div class="text-center">
                            <p class="text-muted-foreground mb-2">This video is covered</p>
                            <Button variant="default" @click.stop="uncoverMedia(post.video[0].id)">
                                <EyeIcon class="h-4 w-4 mr-2" />
                                Uncover
                            </Button>
                        </div>
                    </div>
                </AspectRatio>
            </Card>
        </div>

        <!-- Media Viewer Modal -->
        <MediaViewer v-if="showLightbox" :is-open="showLightbox" :media-list="mediaList"
            :initial-index="currentMediaIndex" :likes="post.like" :comments="post.comment"
            :is-liked="post.isLiked === '1'" @close="closeLightbox" @like="handleLike" @comment="handleComment" />
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { PlayIcon, EyeIcon } from 'lucide-vue-next';
import MediaViewer from '../shared/MediaViewer.vue';
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '../ui/toast';

const props = defineProps({
    post: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['uncoverMedia', 'like', 'comment']);

// Composables
const { handleError } = useErrorHandler();
const { toast } = useToast();

// Refs
const showLightbox = ref(false);
const currentMediaIndex = ref(0);

// Computed Properties
const hasImages = computed(() => props.post.image && props.post.image.length > 0);
const hasVideos = computed(() => props.post.video && props.post.video.length > 0);
const singleImage = computed(() => props.post.image?.length === 1);
const twoImages = computed(() => props.post.image?.length === 2);
const threeImages = computed(() => props.post.image?.length === 3);
const fourOrMoreImages = computed(() => props.post.image?.length >= 4);
const visibleImages = computed(() => props.post.image?.slice(0, 4) || []);

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

// Methods
const openLightbox = (index) => {
    currentMediaIndex.value = index;
    showLightbox.value = true;
};

const closeLightbox = () => {
    showLightbox.value = false;
};

const uncoverMedia = async (mediaId) => {
    try {
        emit('uncoverMedia', mediaId);
        toast({
            title: 'Success',
            description: 'Media uncovered successfully',
            variant: 'default'
        });
    } catch (error) {
        logger.error('Failed to uncover media:', error);
        toast({
            title: 'Error',
            description: 'Failed to uncover media. Please try again.',
            variant: 'destructive'
        });
        await handleError(error);
    }
};

const handleLike = async () => {
    try {
        emit('like');
    } catch (error) {
        logger.error('Failed to like media:', error);
        toast({
            title: 'Error',
            description: 'Failed to like media. Please try again.',
            variant: 'destructive'
        });
        await handleError(error);
    }
};

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