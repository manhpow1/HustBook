<template>
    <div class="flex items-center justify-between mb-4">
        <!-- Like Button -->
        <button @click="debouncedHandleLike" class="flex items-center transition-colors duration-200" :class="[
            post.isLiked === '1' ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500',
            { 'opacity-50 cursor-not-allowed': isLiking }
        ]" :disabled="isLiking" aria-label="Like" role="button" data-testid="like-button">
            <div class="relative w-5 h-5 mr-1">
                <ThumbsUpIcon :class="{ 'fill-current': post.isLiked === '1' }" class="w-5 h-5"
                    :style="{ opacity: isLiking ? '0.5' : '1' }" aria-hidden="true" />
                <SpinnerIcon v-if="isLiking" class="absolute top-0 left-0 w-5 h-5 animate-spin" aria-hidden="true" />
            </div>
            {{ formattedLikes }} Likes
        </button>

        <!-- Comment Button -->
        <button @click="handleComment"
            class="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
            aria-label="Comment" role="button" data-testid="comment-button">
            <MessageSquareIcon class="w-5 h-5 mr-1" aria-hidden="true" />
            {{ formattedComments }} Comments
        </button>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { defineAsyncComponent } from 'vue';
import { usePostStore } from '../../stores/postStore';
import { debounce } from 'lodash-es';
import { formatNumber } from '../../utils/numberFormat';

// Asynchronously load icons to reduce initial bundle size
const ThumbsUpIcon = defineAsyncComponent(() =>
    import('lucide-vue-next').then(mod => mod.ThumbsUpIcon)
);
const MessageSquareIcon = defineAsyncComponent(() =>
    import('lucide-vue-next').then(mod => mod.MessageSquareIcon)
);
const SpinnerIcon = defineAsyncComponent(() =>
    import('lucide-vue-next').then(mod => mod.Loader2Icon)
);

// Define component props
const props = defineProps({
    post: {
        type: Object,
        required: true
    }
});

// Initialize store
const postStore = usePostStore();

// Computed properties for formatted counts
const formattedLikes = computed(() => formatNumber(props.post.like || 0));
const formattedComments = computed(() => formatNumber(props.post.comment || 0));

// Reactive state to manage like operation
const isLiking = ref(false);

// Handle like action with debouncing
const handleLike = async () => {
    if (isLiking.value) return;
    isLiking.value = true;
    try {
        await postStore.toggleLike(props.post.id);
    } catch (error) {
        console.error('Error toggling like:', error);
    } finally {
        isLiking.value = false;
    }
};

// Debounced version of handleLike to prevent rapid likes
const debouncedHandleLike = debounce(handleLike, 300);

// Handle comment action
const handleComment = () => {
    postStore.focusCommentInput(props.post.id);
};
</script>

<style scoped>
button:disabled {
    pointer-events: none;
}

.relative {
    position: relative;
}

.absolute {
    position: absolute;
}
</style>
