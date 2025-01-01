<template>
    <div class="comment-section space-y-6">
        <Alert v-if="offlineMode" variant="warning">
            <AlertCircleIcon class="h-4 w-4" />
            <AlertTitle>Offline Mode</AlertTitle>
            <AlertDescription>
                You are currently offline. Your comments will be synced once you are back online.
            </AlertDescription>
        </Alert>

        <Alert v-if="syncError" variant="destructive">
            <AlertCircleIcon class="h-4 w-4" />
            <AlertTitle>Sync Error</AlertTitle>
            <AlertDescription>
                {{ syncError }}
                <Button variant="link" class="p-0 h-auto font-normal" @click="retrySyncComments">
                    Try again
                </Button>
            </AlertDescription>
        </Alert>

        <Card>
            <CardContent class="p-4 space-y-4">
                <div class="space-y-2">
                    <MarkdownEditor v-model="newComment" :rows="3" ref="commentInput"
                        placeholder="Write your comment here..." :maxLength="1000" @input="onInput"
                        data-testid="new-comment-editor" />
                    <p class="text-sm text-muted-foreground">
                        {{ newComment.length }}/1000 characters
                    </p>
                    <p v-if="inputError" class="text-sm text-destructive" role="alert">
                        {{ inputError }}
                    </p>
                </div>

                <Button @click.prevent="onAddComment" :disabled="!isCommentValid || isSubmitting"
                    class="w-full sm:w-auto" data-testid="post-comment-button">
                    <Loader2Icon v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
                    {{ isSubmitting ? 'Posting...' : 'Comment' }}
                </Button>
            </CardContent>
        </Card>

        <Alert v-if="commentError" variant="destructive">
            <AlertCircleIcon class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
                {{ commentError }}
                <Button variant="link" class="p-0 h-auto font-normal" @click="onRetryLoadComments">
                    Try again
                </Button>
            </AlertDescription>
        </Alert>

        <div v-if="comments.length > 0" class="space-y-4">
            <h3 class="text-lg font-semibold">Comments</h3>
            <ScrollArea class="h-[600px]">
                <TransitionGroup name="comment-list" tag="div" class="space-y-4">
                    <CommentItem v-for="comment in comments" :key="comment.id" :comment="comment"
                        @update="onUpdateComment" @delete="onDeleteComment" data-testid="comment-item" />
                </TransitionGroup>

                <div v-if="loadingComments" class="flex justify-center py-4">
                    <Loader2Icon class="h-6 w-6 animate-spin text-muted-foreground" />
                </div>

                <div v-if="hasMoreComments && !loadingComments" class="flex justify-center py-4">
                    <Button variant="outline" @click="onLoadMoreComments" :disabled="isLoadingMore">
                        <Loader2Icon v-if="isLoadingMore" class="mr-2 h-4 w-4 animate-spin" />
                        {{ isLoadingMore ? 'Loading more...' : 'Load More Comments' }}
                    </Button>
                </div>
            </ScrollArea>
        </div>

        <div v-else-if="!loadingComments && !commentError" class="text-center py-8">
            <MessageSquareIcon class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p class="text-muted-foreground">Be the first to comment!</p>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCommentStore } from '@/stores/commentStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useErrorHandler } from '@/utils/errorHandler'
import { useFormValidation } from '@/composables/useFormValidation'
import { debounce } from 'lodash-es'
import logger from '@/services/logging'
import { storeToRefs } from 'pinia'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import MarkdownEditor from '@/components/shared/MarkdownEditor.vue'
import CommentItem from './CommentItem.vue'

// Icons
import {
    Loader2Icon,
    MessageSquareIcon,
    AlertCircleIcon
} from 'lucide-vue-next'

const props = defineProps({
    postId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['close'])

// Store initialization
const commentStore = useCommentStore()
const notificationStore = useNotificationStore()
const { handleError } = useErrorHandler()

// Local state
const newComment = ref('')
const commentInput = ref(null)
const inputError = ref('')
const isSubmitting = ref(false)
const isLoadingMore = ref(false)
const offlineMode = ref(!navigator.onLine)
const syncError = ref(null)

// Store refs
const { comments, hasMoreComments, loadingComments, commentError } = storeToRefs(commentStore)

// Form validation
const { validateComment } = useFormValidation()
const isCommentValid = computed(() => validateComment(newComment.value))

// Debounced input validation
const debouncedValidateInput = debounce((input, errorRef) => {
    if (input.length > 1000) {
        errorRef.value = 'Comment is too long'
    } else if (input.trim() === '') {
        errorRef.value = 'Comment cannot be empty'
    } else {
        errorRef.value = ''
    }
}, 300)

// Event handlers
const onInput = () => {
    debouncedValidateInput(newComment.value, inputError)
}

const onAddComment = async () => {
    if (!isCommentValid.value) {
        notificationStore.showNotification(inputError.value, 'error')
        return
    }

    isSubmitting.value = true
    try {
        await commentStore.addComment(props.postId, newComment.value.trim())
        newComment.value = ''
        notificationStore.showNotification('Comment posted successfully', 'success')
        logger.info('Comment posted successfully', { postId: props.postId })
    } catch (error) {
        await handleError(error)
    } finally {
        isSubmitting.value = false
    }
}

const onUpdateComment = async (updatedComment) => {
    try {
        await commentStore.updateComment(props.postId, updatedComment.id, updatedComment.content)
        notificationStore.showNotification('Comment updated successfully', 'success')
    } catch (error) {
        await handleError(error)
    }
}

const onDeleteComment = async (commentId) => {
    try {
        await commentStore.deleteComment(props.postId, commentId)
        notificationStore.showNotification('Comment deleted successfully', 'success')
    } catch (error) {
        await handleError(error)
    }
}

const onRetryLoadComments = async () => {
    commentStore.resetComments()
    try {
        const result = await commentStore.fetchComments(props.postId, 10)
        if (!result?.length) {
            notificationStore.showNotification('No comments found', 'warning')
        }
    } catch (error) {
        notificationStore.showNotification('Failed to load comments', 'error')
        await handleError(error)
    }
}

const onLoadMoreComments = debounce(async () => {
    if (isLoadingMore.value) return
    isLoadingMore.value = true
    try {
        const newComments = await commentStore.fetchComments(props.postId, 10)
        if (newComments.length === 0) {
            commentStore.hasMoreComments = false
        }
    } catch (error) {
        notificationStore.showNotification('Failed to load more comments', 'error')
        await handleError(error)
    } finally {
        isLoadingMore.value = false
    }
}, 300)

const retrySyncComments = async () => {
    try {
        await commentStore.syncOfflineComments()
        syncError.value = null
        notificationStore.showNotification('Comments synced successfully', 'success')
    } catch (error) {
        syncError.value = 'Failed to sync comments. Please try again.'
        notificationStore.showNotification('Failed to sync comments', 'error')
        logger.error('Sync comments error:', error)
    }
}

// Network status handling
const checkOnlineStatus = () => {
    offlineMode.value = !navigator.onLine
    if (navigator.onLine) {
        retrySyncComments()
    }
}

// Lifecycle hooks
onMounted(() => {
    onRetryLoadComments()
    commentStore.syncOfflineComments().catch((error) => {
        syncError.value = 'Failed to sync offline comments'
        notificationStore.showNotification('Failed to sync offline comments', 'error')
    })

    window.addEventListener('online', checkOnlineStatus)
    window.addEventListener('offline', checkOnlineStatus)
})

onUnmounted(() => {
    window.removeEventListener('online', checkOnlineStatus)
    window.removeEventListener('offline', checkOnlineStatus)
})
</script>

<style scoped>
.comment-list-enter-active,
.comment-list-leave-active {
    transition: all 0.3s ease;
}

.comment-list-enter-from,
.comment-list-leave-to {
    opacity: 0;
    transform: translateY(30px);
}

.comment-list-move {
    transition: transform 0.3s ease;
}
</style>