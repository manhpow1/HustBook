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
                :disabled="!isCommentValid || isSubmitting" :aria-label="t('postComment')">
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
import { ref, computed, onMounted, defineAsyncComponent, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useCommentStore } from '../../stores/commentStore';
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
    const nearBottom = scroller ? scroller.scrollHeight - scroller.scrollTop <= scroller.clientHeight + 50 : false;
    console.debug('Is near bottom:', nearBottom);
    return nearBottom;
};
const trackAnalyticsEvent = (action, details) => {
    console.debug(`Tracking analytics event: ${action}`, details);
    window.analytics?.track(action, details);
};

const onAddComment = async () => {
    console.debug('Adding comment:', newComment.value);
    if (isCommentValid.value) {
        isSubmitting.value = true;
        try {
            await commentStore.addComment(postId, newComment.value.trim());
            console.debug('Comment added successfully');
            newComment.value = '';
            if (isNearBottom()) scrollToBottom();
            trackAnalyticsEvent('Add Comment', { postId });
            notificationStore.showNotification(t('commentAdded'), 'success');
        } catch (error) {
            console.error('Error adding comment:', error);
            handleError(error, router);  // Use the correct router instance
        } finally {
            isSubmitting.value = false;
        }
    }
};

watch(() => postId, (newId) => {
    console.debug('postId changed:', newId);
    onRetryLoadComments();
});

const onUpdateComment = async (comment) => {
    try {
        await commentStore.updateComment(props.postId, comment.id, comment.content);
        notificationStore.showNotification(t('commentUpdated'), 'success');
    } catch (error) {
        handleError(error, router);
    }
};

const onDeleteComment = async (commentId) => {
    try {
        await commentStore.deleteComment(props.postId, commentId);
        notificationStore.showNotification(t('commentDeleted'), 'success');
    } catch (error) {
        handleError(error, router);
    }
};

const onLoadMoreComments = throttle(async () => {
    if (!isLoadingMore.value) {
        isLoadingMore.value = true;
        console.debug('Starting to load more comments...');

        try {
            const newComments = (await commentStore.fetchComments(postId, 10, router)) || [];
            console.debug('Fetched new comments:', newComments);

            if (newComments.length === 0) {
                console.debug('No new comments fetched. Setting hasMoreComments to false.');
                hasMoreComments.value = false;
            } else {
                console.debug('Adding new comments:', newComments);
                comments.value.push(...newComments);
            }
        } catch (error) {
            console.error('Error loading more comments:', error);
            handleError(error, router);
        } finally {
            isLoadingMore.value = false;
            console.debug('Finished loading more comments. isLoadingMore:', isLoadingMore.value);
        }
    } else {
        console.debug('Load more action ignored. Already loading comments.');
    }
}, 1000);

const onRetryLoadComments = async () => {
    console.debug('Retrying to load comments');
    commentStore.resetComments(); // Reset existing comments
    try {
        const result = await commentStore.fetchComments(props.postId, 10, router);
        console.debug('Comments fetched during retry:', result);
        if (result.length === 0) {
            console.warn('No comments found for post:', props.postId);
            notificationStore.showNotification(t('noCommentsFound'), 'warning');
        } else {
            console.debug('Comments loaded successfully:', result);
            commentStore.comments.value = result; // Ensure comments are correctly set
        }
    } catch (error) {
        console.error('Error caught in onRetryLoadComments. Calling handleError...');
        if (error.response?.data?.code === 1010 || error.response?.data?.code === 1009) {
            console.debug(`${error.response.data.code} error detected. Hiding comment section.`);
            isCommentSectionVisible.value = false;
            return; // Stop further execution
        }
        handleError(error, router);
    }
};

onMounted(() => {
    console.debug('Mounted component for postId:', postId);
    onRetryLoadComments();
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
