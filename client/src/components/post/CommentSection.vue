<template>
    <div v-if="isCommentSectionVisible" class="comment-section">
        <div v-if="offlineMode" class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4"
            role="alert">
            <p class="font-bold">Offline Mode</p>
            <p>You are currently offline. Your comments will be synced once you are back online.</p>
        </div>
        <div v-if="syncError" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p class="font-bold">Sync Error</p>
            <p>{{ syncError }}</p>
            <button @click="retrySyncComments"
                class="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200">
                Retry Sync
            </button>
        </div>
        <div class="mb-4">
            <MarkdownEditor v-model="newComment" :rows="3" ref="commentInput" placeholder="Write your comment here..."
                :maxLength="1000" @input="onInput" />
            <p class="text-sm mt-1">
                {{ newComment.length }}/1000 characters
            </p>
            <p v-if="inputError" class="text-red-500 text-sm mt-1">{{ inputError }}</p>
            <button @click.prevent="onAddComment"
                class="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!isCommentValid || isSubmitting" aria-label="Post Comment" data-testid="add-comment-button">
                {{ isSubmitting ? 'Posting...' : 'Comment' }}
            </button>
        </div>
        <ErrorMessage v-if="commentError" :message="commentError" title="Comment Error" showRetry
            @retry="onRetryLoadComments" />
        <div v-if="comments.length > 0" class="mt-6">
            <h3 class="text-lg font-semibold mb-4">Comments</h3>
            <RecycleScroller class="scroller" :items="comments" :item-size="100" key-field="id"
                v-slot="{ item: comment }">
                <TransitionGroup name="slide" tag="div">
                    <CommentItem v-if="comment" :key="comment.id" :comment="comment" @update="onUpdateComment"
                        @delete="onDeleteComment" />
                </TransitionGroup>
            </RecycleScroller>
        </div>
        <div v-else-if="!loadingComments && !commentError" class="text-center py-8">
            <MessageSquareIcon class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500">Be the first to comment!</p>
        </div>
        <div v-if="loadingComments" class="text-center py-4">
            <LoaderIcon class="animate-spin h-5 w-5 mx-auto text-gray-500" />
            <p class="text-gray-500 mt-2">Loading comments...</p>
        </div>
        <button v-if="hasMoreComments && !loadingComments && !commentError" @click="onLoadMoreComments"
            :disabled="isLoadingMore"
            class="w-full mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors duration-200 disabled:opacity-50">
            {{ isLoadingMore ? 'Loading more comments...' : 'Load More Comments' }}
        </button>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useCommentStore } from '../../stores/commentStore';
import { usePostStore } from '../../stores/postStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { handleError } from '../../utils/errorHandler';
import MarkdownEditor from '../shared/MarkdownEditor.vue';
import { throttle } from 'lodash-es';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { useFormValidation } from '../../composables/useFormValidation';

const router = useRouter();
const CommentItem = defineAsyncComponent(() =>
    import('../shared/CommentItem.vue').catch((error) => {
        console.error('Failed to load CommentItem:', error);
        throw error;
    })
);
const ErrorMessage = defineAsyncComponent(() => import('../ui/ErrorMessage.vue'));
const LoaderIcon = defineAsyncComponent(() => import('lucide-vue-next').then(m => m.LoaderIcon));
const MessageSquareIcon = defineAsyncComponent(() => import('lucide-vue-next').then(m => m.MessageSquareIcon));

const props = defineProps({
    postId: { type: String, required: true },
});

const commentStore = useCommentStore();
const postStore = usePostStore();
const notificationStore = useNotificationStore();
const { comments, hasMoreComments, loadingComments } = storeToRefs(commentStore);

const newComment = ref('');
const commentInput = ref(null);
const inputError = ref('');
const isSubmitting = ref(false);
const isLoadingMore = ref(false);
const isCommentSectionVisible = ref(true);
const offlineMode = ref(false);
const syncError = ref(null);
const { commentError, validateComment } = useFormValidation();

const isCommentValid = computed(() => validateComment(newComment.value));

const checkOnlineStatus = () => {
    offlineMode.value = !navigator.onLine;
};

const retrySyncComments = async () => {
    try {
        await commentStore.syncOfflineComments();
        syncError.value = null;
        notificationStore.showNotification('Comments synced successfully.', 'success');
    } catch (error) {
        syncError.value = 'Failed to sync comments. Please try again.';
        notificationStore.showNotification('Failed to sync comments. Please try again.', 'error');
    }
};

const onInput = () => {
    console.debug('Input changed:', newComment.value);
    debouncedValidateInput(newComment.value, inputError, null);
};

const scrollToBottom = () => {
    const scroller = document.querySelector('.scroller');
    if (scroller) {
        console.debug('Scrolling to bottom');
        scroller.scrollTop = scroller.scrollHeight;
    }
};

const isNearBottom = () => {
    const scroller = document.querySelector('.scroller');
    const nearBottom = scroller
        ? scroller.scrollHeight - scroller.scrollTop <= scroller.clientHeight + 50
        : false;
    console.debug('Checking if near bottom:', nearBottom);
    return nearBottom;
};

const trackAnalyticsEvent = (action, details) => {
    console.debug(`Tracking analytics event: ${action}`, details);
    window.analytics?.track(action, details);
};

const onRetryLoadComments = async () => {
    console.debug(`Retrying to load comments for postId: ${postId}`);
    commentStore.resetComments(); // Reset state to ensure a fresh load
    try {
        const result = await commentStore.fetchComments(postId, 10, router);
        if (!result || result.length === 0) {
            console.warn(`No comments found for postId: ${postId}`);
            notificationStore.showNotification('No comments found.', 'warning');
        } else {
            console.debug('Successfully loaded comments:', result);
            commentStore.comments.value = result;
        }
    } catch (error) {
        console.error('Error during comment retry load:', error);
        // Handle specific error codes to hide the comment section
        const errorCode = error.response?.data?.code;
        if (errorCode === 1010 || errorCode === 1009) {
            console.debug(`Error ${errorCode} detected. Hiding comment section.`);
            isCommentSectionVisible.value = false;
            return;
        }
        notificationStore.showNotification('Retry failed. Please try again.', 'error'); // Notify the user
        await handleError(error, router); // Use the error handler
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
    } catch (error) {
        await handleError(error, router);
    } finally {
        isSubmitting.value = false;
    }
};

let cleanupRealtimeComments;

const onScroll = throttle(() => {
    const nearBottom = isNearBottom();
    console.debug('User scrolled. Near bottom:', nearBottom);
    if (nearBottom) {
        console.debug('User is near bottom, triggering load of more comments...');
        onLoadMoreComments();
    }
}, 300); // Throttle to prevent rapid calls

watch(() => props.postId, (newId) => {
    console.debug(`postId changed from ${props.postId} to ${newId}. Reloading comments.`);
    onRetryLoadComments();
});

watch(comments, (newComments) => {
    console.debug('Comments updated:', newComments);
});

const onUpdateComment = async (comment) => {
    try {
        await commentStore.updateComment(props.postId, comment.id, comment.content);
        notificationStore.showNotification('Comment updated successfully.', 'success');
    } catch (error) {
        await handleError(error, router);
    }
};

const onDeleteComment = async (commentId) => {
    try {
        await commentStore.deleteComment(props.postId, commentId);
        notificationStore.showNotification('Comment deleted successfully.', 'success');
    } catch (error) {
        await handleError(error, router);
    }
};

const onLoadMoreComments = async () => {
    if (isLoadingMore.value || !hasMoreComments.value) return;

    isLoadingMore.value = true;
    try {
        console.debug(`Fetching more comments for postId: ${postId}`);
        const newComments = await commentStore.fetchComments(postId, 10, router);
        if (newComments.length > 0) {
            console.debug('Fetched comments:', newComments);
            comments.value.push(...newComments);
        } else {
            console.debug('No more comments available.');
            hasMoreComments.value = false;
        }
        trackAnalyticsEvent('Load More Comments', { postId, count: newComments.length });
    } catch (error) {
        console.error('Error loading more comments:', error);
        notificationStore.showNotification('Failed to load more comments.', 'error'); // Notify user
        await handleError(error, router); // Existing error handler
    } finally {
        isLoadingMore.value = false;
        console.debug('Completed loading more comments.');
    }
};

onMounted(() => {
    console.debug('Mounted CommentSection component for postId:', props.postId);
    const scroller = document.querySelector('.scroller');
    if (scroller) {
        console.debug('Adding scroll event listener.');
        scroller.addEventListener('scroll', onScroll);
    }
    onRetryLoadComments();
    commentStore.syncOfflineComments().catch(error => {
        syncError.value = 'Failed to sync offline comments.';
        notificationStore.showNotification('Failed to sync offline comments.', 'error');
    });
    cleanupRealtimeComments = commentStore.setupRealtimeComments(props.postId);

    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);
    checkOnlineStatus();
});

onUnmounted(() => {
    const scroller = document.querySelector('.scroller');
    if (scroller) {
        console.debug('Removing scroll event listener.');
        scroller.removeEventListener('scroll', onScroll); // Cleanup listener
    }
    if (cleanupRealtimeComments) {
        cleanupRealtimeComments();
    }
    window.removeEventListener('online', checkOnlineStatus);
    window.removeEventListener('offline', checkOnlineStatus);
});
</script>

<style scoped>
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

.comment-section button:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
}

@media (min-width: 768px) {
    .comment-section {
        max-width: 640px;
        margin: 0 auto;
    }
}
</style>
