<template>
    <div v-if="isCommentSectionVisible" class="comment-section">
        <div class="mb-4">
            <MarkdownEditor v-model="newComment" :rows="3" ref="commentInput" :placeholder="t('writeComment')"
                :maxLength="1000" @input="onInput" />
            <p class="text-sm mt-1">
                {{ t('characterCount', { count: newComment.length, max: 1000 }) }}
            </p>
            <p v-if="inputError" class="text-red-500 text-sm mt-1">{{ inputError }}</p>
            <button @click.prevent="onAddComment"
                class="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!isCommentValid || isSubmitting" :aria-label="t('postComment')"
                data-testid="add-comment-button">
                {{ isSubmitting ? t('posting') : t('comment') }}
            </button>
        </div>
        <ErrorMessage v-if="commentError" :message="commentError" title="Comment Error" showRetry
            @retry="onRetryLoadComments" />
        <div v-if="comments.length > 0" class="mt-6">
            <h3 class="text-lg font-semibold mb-4">{{ t('comments') }}</h3>
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
            <p class="text-gray-500">{{ t('beFirstToComment') }}</p>
        </div>
        <div v-if="loadingComments" class="text-center py-4">
            <LoaderIcon class="animate-spin h-5 w-5 mx-auto text-gray-500" />
            <p class="text-gray-500 mt-2">{{ t('loadingComments') }}</p>
        </div>
        <button v-if="hasMoreComments && !loadingComments && !commentError" @click="onLoadMoreComments"
            :disabled="isLoadingMore"
            class="w-full mt-4 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors duration-200 disabled:opacity-50">
            {{ isLoadingMore ? t('loadingMoreComments') : t('loadMoreComments') }}
        </button>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, defineAsyncComponent, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useCommentStore } from '../../stores/commentStore';
import { usePostStore } from '../../stores/postStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { handleError } from '../../utils/errorHandler';
import MarkdownEditor from '../shared/MarkdownEditor.vue';
import { debouncedValidateInput } from '../../utils/debounce';
import { throttle } from 'lodash-es';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

const router = useRouter();
const CommentItem = defineAsyncComponent(() =>
    import('../shared/CommentItem.vue').catch((error) => {
        console.error('Failed to load CommentItem:', error);
        throw error;
    })
);
const ErrorMessage = defineAsyncComponent(() => import('../shared/ErrorMessage.vue'));
const LoaderIcon = defineAsyncComponent(() => import('lucide-vue-next').then(m => m.LoaderIcon));
const MessageSquareIcon = defineAsyncComponent(() => import('lucide-vue-next').then(m => m.MessageSquareIcon));

const props = defineProps({
    postId: { type: String, required: true },
});

const { postId } = props;

const { t } = useI18n();
const commentStore = useCommentStore();
const postStore = usePostStore();
const notificationStore = useNotificationStore();
const { comments, commentError, hasMoreComments, loadingComments } = storeToRefs(commentStore);

const newComment = ref('');
const commentInput = ref(null);
const inputError = ref('');
const isSubmitting = ref(false);
const isLoadingMore = ref(false);
const isCommentSectionVisible = ref(true);

const isCommentValid = computed(() => {
    console.debug('Validating comment:', newComment.value);
    return newComment.value.trim().length > 0 && newComment.value.length <= 1000;
});

const onInput = () => {
    console.debug('Input changed:', newComment.value);
    debouncedValidateInput(newComment.value, inputError, t);
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

const onAddComment = async () => {
    console.debug('Attempting to add comment:', newComment.value);

    if (!isCommentValid.value || isSubmitting.value) {
        console.debug('Invalid comment or submission in progress.');
        return;
    }

    const commentContent = newComment.value.trim();
    isSubmitting.value = true;

    try {
        console.debug(`Calling addComment with postId: ${postId} and content: ${commentContent}`);
        await commentStore.addComment(postId, commentContent);

        console.debug('Comment successfully added.');
        newComment.value = ''; // Clear input only after success
        scrollToBottom();
    } catch (error) {
        console.error('Error during comment submission:', error);
        const errorCode = error.response?.data?.code;
        if (errorCode === 1010) {
            await postStore.removePost(postId);
        } else if (errorCode === 9998 || errorCode === 9999) {
            // Handle invalid session or account locked
            router.push('/login');
        }
        await handleError(error, router, notificationStore); // Handle the error appropriately
    } finally {
        isSubmitting.value = false;
    }
};

const onScroll = () => {
    const nearBottom = isNearBottom();
    console.debug('User scrolled. Near bottom:', nearBottom);
    if (nearBottom) {
        console.debug('User is near bottom, triggering load of more comments...');
        onLoadMoreComments();
    }
};

watch(() => postId, (newId) => {
    console.debug(`postId changed from ${postId} to ${newId}. Reloading comments.`);
    onRetryLoadComments();
});

watch(comments, (newComments) => {
    console.debug('Comments updated:', newComments);
});

const onUpdateComment = async (comment) => {
    try {
        await commentStore.updateComment(props.postId, comment.id, comment.content);
        notificationStore.showNotification(t('commentUpdated'), 'success');
    } catch (error) {
        await handleError(error, router, notificationStore);;
    }
};

const onDeleteComment = async (commentId) => {
    try {
        await commentStore.deleteComment(props.postId, commentId);
        notificationStore.showNotification(t('commentDeleted'), 'success');
    } catch (error) {
        await handleError(error, router, notificationStore);;
    }
};

const onLoadMoreComments = throttle(async () => {
    if (isLoadingMore.value) {
        console.debug('Aborting: Already loading more comments.');
        return;
    }

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
        notificationStore.showNotification(t('loadMoreError'), 'error'); // Notify user
        await handleError(error, router, notificationStore);; // Existing error handler
    } finally {
        isLoadingMore.value = false;
        console.debug('Completed loading more comments.');
    }
}, 1000);

const onRetryLoadComments = async () => {
    console.debug(`Retrying to load comments for postId: ${postId}`);

    commentStore.resetComments(); // Reset state to ensure a fresh load

    try {
        const result = await commentStore.fetchComments(postId, 10, router);

        if (!result || result.length === 0) {
            console.warn(`No comments found for postId: ${postId}`);
            notificationStore.showNotification(t('noCommentsFound'), 'warning');
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

        notificationStore.showNotification(t('retry'), 'error'); // Notify the user
        await handleError(error, router, notificationStore); // Use the error handler
    }
};

onMounted(() => {
    console.debug('Mounted CommentSection component for postId:', postId);
    const scroller = document.querySelector('.scroller');
    if (scroller) {
        console.debug('Adding scroll event listener.');
        scroller.addEventListener('scroll', onScroll);
    }
    onRetryLoadComments();
});

onUnmounted(() => {
    const scroller = document.querySelector('.scroller');
    if (scroller) {
        console.debug('Removing scroll event listener.');
        scroller.removeEventListener('scroll', onScroll); // Cleanup listener
    }
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
