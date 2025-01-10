<template>
    <div class="flex items-center justify-between space-x-4 py-4">
        <Button variant="ghost" size="sm" :class="[
            post.isLiked === '1' ? 'text-primary' : 'text-muted-foreground',
            'hover:text-primary'
        ]" :disabled="isLiking" @click="debouncedHandleLike" aria-label="Like post">
            <div class="relative flex items-center gap-2">
                <HeartIcon :class="[
                    'h-5 w-5',
                    post.isLiked === '1' ? 'fill-current' : 'fill-none',
                    isLiking ? 'opacity-50' : 'opacity-100'
                ]" />
                <Loader2Icon v-if="isLiking" class="absolute inset-0 h-5 w-5 animate-spin" />
                <span>{{ formattedLikes }}</span>
                <span class="sr-only">Likes</span>
            </div>
        </Button>

        <Button variant="ghost" size="sm" class="text-muted-foreground hover:text-primary" @click="handleComment"
            aria-label="Comment on post">
            <div class="flex items-center gap-2">
                <MessageSquareIcon class="h-5 w-5" />
                <span>{{ formattedComments }}</span>
                <span class="sr-only">Comments</span>
            </div>
        </Button>

        <Button variant="ghost" size="sm" class="text-muted-foreground hover:text-primary" @click="handleShare"
            aria-label="Share post">
            <div class="flex items-center gap-2">
                <ShareIcon class="h-5 w-5" />
                <span>Share</span>
            </div>
        </Button>
    </div>

    <Toaster />
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePostStore } from '@/stores/postStore'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toast'
import { HeartIcon, MessageSquareIcon, ShareIcon, Loader2Icon } from 'lucide-vue-next'
import { formatNumber } from '@/utils/numberFormat'
import { useDebounce } from '@/composables/useDebounce'
import { useErrorHandler } from '@/utils/errorHandler';
import logger from '@/services/logging';

const props = defineProps({
    post: {
        type: Object,
        required: true,
        validator(post) {
            return post && typeof post === 'object' && 'postId' in post;
        }
    }
});

const emit = defineEmits(['comment', 'like']);
const postStore = usePostStore();
const { toast } = useToast();
const { handleError } = useErrorHandler();
const isLiking = ref(false);

// Computed
const formattedLikes = computed(() => {
    const count = parseInt(props.post?.likes) || 0;
    return formatNumber(Math.max(0, count));
});

const formattedComments = computed(() => {
    const count = parseInt(props.post?.comments) || 0;
    return formatNumber(Math.max(0, count));
});

// Methods
const handleLike = async () => {
    if (isLiking.value || !props.post?.postId) return;

    isLiking.value = true;
    try {
        await postStore.toggleLike(props.post.postId);
        const currentLikeStatus = props.post.isLiked === "1";
        const newLikeStatus = currentLikeStatus ? "0" : "1";
        const newLikeCount = parseInt(props.post.likes || 0) + (currentLikeStatus ? -1 : 1);
        
        emit('like', {
            postId: props.post.postId,
            isLiked: newLikeStatus,
            likes: Math.max(0, newLikeCount)
        });
    } catch (error) {
        handleError(error);
        toast({
            title: "Error",
            description: "Unable to process like action. Please try again.",
            variant: "destructive"
        });
        logger.error('Like action failed:', { 
            postId: props.post.postId,
            error: error.message 
        });
    } finally {
        isLiking.value = false;
    }
};

const debouncedHandleLike = useDebounce(handleLike, 300)

const handleComment = () => {
    emit('comment')
}

const handleShare = async () => {
    if (!props.post?.postId) {
        logger.warn('Share attempted with invalid post');
        return;
    }

    try {
        const postUrl = `${window.location.origin}/post/${props.post.postId}`;
        const shareData = {
            title: 'Share Post from HUSTBOOK',
            text: props.post.content?.substring(0, 100) + (props.post.content?.length > 100 ? '...' : ''),
            url: postUrl
        };

        if (navigator.share && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            logger.info('Post shared successfully', { postId: props.post.postId });
        } else {
            await navigator.clipboard.writeText(postUrl);
            toast({
                title: "Success",
                description: "Post link copied to clipboard",
                duration: 2000
            });
            logger.info('Post URL copied to clipboard', { postId: props.post.postId });
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            handleError(error);
            toast({
                title: "Share Failed",
                description: "Unable to share post at this time",
                variant: "destructive"
            });
            logger.error('Share action failed:', {
                postId: props.post.postId,
                error: error.message
            });
        }
    }
};
</script>
