<template>
    <div>
        <div v-if="post.images?.length" class="mb-4">
            <div v-if="post.images.length === 1" class="mb-4">
                <Card class="overflow-hidden">
                    <div class="relative">
                        <img :src="post.images[0]" :alt="post.content || 'Post image'"
                            class="w-full max-h-[600px] object-contain" loading="lazy" @click="openLightbox(0)" />
                    </div>
                </Card>
            </div>
            <!-- 2 Images -->
            <div v-else-if="post.images.length === 2" class="grid grid-cols-2 gap-2">
                <Card v-for="(img, index) in post.images" :key="index" class="overflow-hidden">
                    <div class="relative">
                        <img :src="img" :alt="post.content || 'Post image'" class="w-full max-h-[400px] object-contain"
                            loading="lazy" @click="openLightbox(index)" />
                    </div>
                </Card>
            </div>

            <!-- 3 Images -->
            <div v-else-if="post.images.length === 3" class="grid grid-rows-2 grid-cols-2 gap-2">
                <Card class="row-span-2 overflow-hidden">
                    <div class="relative h-full">
                        <img :src="post.images[0]" :alt="post.content || 'Post image'"
                            class="w-full h-full max-h-[500px] object-contain" loading="lazy"
                            @click="openLightbox(0)" />
                    </div>
                </Card>
                <Card v-for="index in [1, 2]" :key="index" class="overflow-hidden">
                    <div class="relative">
                        <img :src="post.images[index]" :alt="post.content || 'Post image'"
                            class="w-full max-h-[250px] object-contain" loading="lazy" @click="openLightbox(index)" />
                    </div>
                </Card>
            </div>

            <!-- 4 Images -->
            <div v-else class="grid grid-cols-2 gap-2">
                <Card v-for="(img, index) in post.images.slice(0, 4)" :key="index" class="overflow-hidden">
                    <div class="relative">
                        <img :src="img" :alt="post.content || 'Post image'" class="w-full max-h-[300px] object-contain"
                            loading="lazy" @click="openLightbox(index)" />
                        <div v-if="index === 3 && post.images.length > 4"
                            class="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                            <span class="text-2xl font-bold">+{{ post.images.length - 4 }}</span>
                        </div>
                    </div>
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
