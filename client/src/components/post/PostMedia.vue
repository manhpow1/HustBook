<template>
    <div>
        <div v-if="post.images?.length" class="mb-4">
            <div v-if="post.images.length === 1" class="mb-4">
                <Card class="overflow-hidden">
                    <AspectRatio :ratio="16/9">
                        <div @click="openLightbox(0)"
                            class="relative w-full h-full cursor-pointer group">
                            <img :src="post.images[0]"
                                :alt="post.content || 'Post image'"
                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
                        </div>
                    </AspectRatio>
                </Card>
            </div>
            <!-- Two Images Layout -->
            <div v-else-if="post.images.length === 2" class="grid grid-cols-2 gap-2">
                <Card v-for="(img, index) in post.images" :key="index" class="overflow-hidden">
                    <AspectRatio :ratio="1">
                        <div @click="openLightbox(index)"
                            class="relative w-full h-full cursor-pointer group">
                            <img :src="img"
                                :alt="post.content || 'Post image'"
                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
                        </div>
                    </AspectRatio>
                </Card>
            </div>
            <!-- Three Images Layout -->
            <div v-else-if="post.images.length === 3" class="grid grid-cols-2 gap-2">
                <Card class="overflow-hidden row-span-2">
                    <AspectRatio :ratio="1">
                        <div @click="openLightbox(0)"
                            class="relative w-full h-full cursor-pointer group">
                            <img :src="getOptimizedImageUrl(post.images[0])" 
                                :srcset="getImageSrcSet(post.images[0])"
                                :alt="post.content || 'Post image'"
                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
                        </div>
                    </AspectRatio>
                </Card>
                <Card v-for="index in [1, 2]" :key="index" class="overflow-hidden">
                    <AspectRatio :ratio="1">
                        <div @click="openLightbox(index)"
                            class="relative w-full h-full cursor-pointer group">
                            <img :src="post.images[index]"
                                :alt="post.content || 'Post image'"
                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
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
                            <img :src="img.url" :alt="post.content"
                                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy" />
                            <div v-if="index === 3 && post.media.length > 4"
                                class="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                                <span class="text-2xl font-bold">+{{ post.media.length - 4 }}</span>
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
        <!-- Media Viewer Modal -->
        <MediaViewer v-if="showLightbox" :is-open="showLightbox" :media-list="mediaList"
            :initial-index="currentMediaIndex" :likes="post.likes" :comments="post.comments"
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
import { useMediaUtils } from '@/composables/useMediaUtils';

const props = defineProps({
    post: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['like', 'comment']);

// Composables
const { handleError } = useErrorHandler();
const { toast } = useToast();

// Refs
const showLightbox = ref(false);
const currentMediaIndex = ref(0);

const mediaList = computed(() => {
    if (!props.post) return [];
    return props.post.images?.map((url, index) => ({
        type: 'image',
        url,
        index
    })) || [];
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
