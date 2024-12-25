<template>
    <div v-if="isCommentSectionVisible" class="comment-section">
        <!-- Offline Mode Alert -->
        <Alert v-if="offlineMode" type="warning" title="Offline Mode"
            message="You are currently offline. Your comments will be synced once you are back online." />

        <!-- Sync Error Alert -->
        <Alert v-if="syncError" type="error" title="Sync Error" :message="syncError" :showRetry="true"
            @retry="retrySyncComments" />

        <!-- New Comment Input -->
        <div class="mb-4">
            <MarkdownEditor v-model="newComment" :rows="3" ref="commentInput" placeholder="Write your comment here..."
                :maxLength="1000" @input="onInput" data-testid="new-comment-editor" />
            <p class="text-sm mt-1">
                {{ newComment.length }}/1000 characters
            </p>
            <p v-if="inputError" class="text-red-500 text-sm mt-1">{{ inputError }}</p>
            <Button @click.prevent="onAddComment" :disabled="!isCommentValid || isSubmitting" variant="primary"
                class="mt-2" aria-label="Post Comment" data-testid="post-comment-button">
                <span v-if="isSubmitting">Posting...</span>
                <span v-else>Comment</span>
            </Button>
        </div>

        <!-- Error Message -->
        <ErrorMessage v-if="commentError" :message="commentError" title="Comment Error" showRetry
            @retry="onRetryLoadComments" />

        <!-- Comments List -->
        <div v-if="comments.length > 0" class="mt-6">
            <h3 class="text-lg font-semibold mb-4">Comments</h3>
            <RecycleScroller class="scroller" :items="comments" :item-size="150" <!-- Adjusted based on CommentItem
                height -->
                key-field="id"
                v-slot="{ item: comment }"
                >
                <TransitionGroup name="slide" tag="div">
                    <CommentItem v-if="comment" :key="comment.id" :comment="comment" @update="onUpdateComment"
                        @delete="onDeleteComment" data-testid="comment-item" />
                </TransitionGroup>
            </RecycleScroller>
        </div>

        <!-- No Comments Message -->
        <div v-else-if="!loadingComments && !commentError" class="text-center py-8">
            <MessageSquareIcon class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500">Be the first to comment!</p>
        </div>

        <!-- Loading Comments -->
        <div v-if="loadingComments" class="text-center py-4">
            <LoaderIcon class="animate-spin h-5 w-5 mx-auto text-gray-500" />
            <p class="text-gray-500 mt-2">Loading comments...</p>
        </div>

        <!-- Load More Comments Button -->
        <Button v-if="hasMoreComments && !loadingComments && !commentError" @click="onLoadMoreComments"
            :disabled="isLoadingMore" variant="secondary" class="w-full mt-4" aria-label="Load More Comments"
            data-testid="load-more-comments-button">
            <span v-if="isLoadingMore">Loading more comments...</span>
            <span v-else>Load More Comments</span>
        </Button>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useCommentStore } from '../../stores/commentStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { useFormValidation } from '../../composables/useFormValidation';
import {debounce} from 'lodash-es';
import logger from '../../services/logging';

// Components
import MarkdownEditor from '../shared/MarkdownEditor.vue';
import CommentItem from '../shared/CommentItem.vue';
import ErrorMessage from '../ui/ErrorMessage.vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Props
const props = defineProps({
    postId: { type: String, required: true },
});

// Emits
const emit = defineEmits(['close']);

// Router
const router = useRouter();

// Stores
const commentStore = useCommentStore();
const notificationStore = useNotificationStore();
const { handleError } = useErrorHandler();

// Reactive References
const newComment = ref('');
const commentInput = ref(null);
const inputError = ref('');
const isSubmitting = ref(false);
const isLoadingMore = ref(false);
const isCommentSectionVisible = ref(true);
const offlineMode = ref(!navigator.onLine);
const syncError = ref(null);
const { comments, hasMoreComments, loadingComments } = commentStore;
const { commentError } = commentStore;

// Form Validation
const { validateComment } = useFormValidation();
const isCommentValid = computed(() => validateComment(newComment.value));

// Debounced Functions
const debouncedValidateInput = debounce((input, errorRef) => {
    if (input.length > 1000) {
        errorRef.value = 'Comment is too long.';
    } else if (input.trim() === '') {
        errorRef.value = 'Comment cannot be empty.';
    } else {
        errorRef.value = '';
    }
}, 300);

// Input Handler
const onInput = () => {
    debouncedValidateInput(newComment.value, inputError);
};

// Scroll Management
const onScroll = () => {
    const scroller = document.querySelector('.scroller');
    if (scroller) {
        const nearBottom = scroller.scrollHeight - scroller.scrollTop <= scroller.clientHeight + 50;
        if (nearBottom && hasMoreComments.value && !isLoadingMore.value) {
            onLoadMoreComments();
        }
    }
};

// Analytics Tracking
const trackAnalyticsEvent = (action, details) => {
    window.analytics?.track(action, details);
};

// Event Handlers
const onRetryLoadComments = async () => {
    commentStore.resetComments();
    try {
        const result = await commentStore.fetchComments(props.postId, 10, router);
        if (!result || result.length === 0) {
            notificationStore.showNotification('No comments found.', 'warning');
        } else {
            commentStore.comments = result;
        }
    } catch (error) {
        const errorCode = error.response?.data?.code;
        if (errorCode === 1010 || errorCode === 1009) {
            isCommentSectionVisible.value = false;
            return;
        }
        notificationStore.showNotification('Retry failed. Please try again.', 'error');
        await handleError(error);
    }
};

const onAddComment = async () => {
    if (!isCommentValid.value) {
        notificationStore.showNotification(inputError.value, 'error');
        return;
    }

    isSubmitting.value = true;
    try {
        await commentStore.addComment(props.postId, newComment.value.trim());
        newComment.value = '';
        notificationStore.showNotification('Comment posted successfully.', 'success');
        logger.info('Comment posted successfully', { postId: props.postId });
    } catch (error) {
        await handleError(error);
    } finally {
        isSubmitting.value = false;
    }
};

const debouncedLoadMoreComments = debounce(async () => {
    if (isLoadingMore.value) return;

    isLoadingMore.value = true;
    try {
        const newComments = await commentStore.fetchComments(props.postId, 10, router);
        if (newComments.length > 0) {
            commentStore.comments.push(...newComments);
            trackAnalyticsEvent('Load More Comments', { postId: props.postId, count: newComments.length });
        } else {
            commentStore.hasMoreComments = false;
        }
    } catch (error) {
        notificationStore.showNotification('Failed to load more comments.', 'error');
        await handleError(error);
    } finally {
        isLoadingMore.value = false;
    }
}, 1000);

const onLoadMoreComments = () => {
    debouncedLoadMoreComments();
};

const onUpdateComment = async (updatedComment) => {
    try {
        await commentStore.updateComment(props.postId, updatedComment.id, updatedComment.content);
        notificationStore.showNotification('Comment updated successfully.', 'success');
    } catch (error) {
        await handleError(error);
    }
};

const onDeleteComment = async (commentId) => {
    try {
        await commentStore.deleteComment(props.postId, commentId);
        notificationStore.showNotification('Comment deleted successfully.', 'success');
    } catch (error) {
        await handleError(error);
    }
};

const retrySyncComments = async () => {
    try {
        await commentStore.syncOfflineComments();
        syncError.value = null;
        notificationStore.showNotification('Comments synced successfully.', 'success');
    } catch (error) {
        syncError.value = 'Failed to sync comments. Please try again.';
        notificationStore.showNotification('Failed to sync comments. Please try again.', 'error');
        logger.error('Sync comments error:', error);
    }
};

// Network Status Handlers
const checkOnlineStatus = () => {
    offlineMode.value = !navigator.onLine;
    if (navigator.onLine) {
        retrySyncComments();
    }
};

// Lifecycle Hooks
onMounted(() => {
    onRetryLoadComments();
    commentStore.syncOfflineComments().catch((error) => {
        syncError.value = 'Failed to sync offline comments.';
        notificationStore.showNotification('Failed to sync offline comments.', 'error');
    });

    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

    const scroller = document.querySelector('.scroller');
    if (scroller) {
        scroller.addEventListener('scroll', onScroll);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener('online', checkOnlineStatus);
    window.removeEventListener('offline', checkOnlineStatus);

    const scroller = document.querySelector('.scroller');
    if (scroller) {
        scroller.removeEventListener('scroll', onScroll);
    }
});
</script>

<style scoped>
.comment-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    max-height: 500px;
    overflow-y: auto;
    border-radius: 8px;
    background-color: var(--secondary);
    color: var(--secondary-foreground);
    transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
    contain: layout paint;
}

.scroller {
    height: 400px;
    overflow-y: auto;
}

.slide-enter-active,
.slide-leave-active {
    transition: all 0.5s ease;
}

.slide-enter-from,
.slide-leave-to {
    opacity: 0;
    transform: translateY(30px);
}

@media (min-width: 768px) {
    .comment-section {
        max-width: 640px;
        margin: 0 auto;
    }
}
</style>
