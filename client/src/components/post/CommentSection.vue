<template>
    <div class="comment-section space-y-6">
        <Alert v-if="offlineMode" variant="warning">
            <AlertCircleIcon class="h-4 w-4" />
            <AlertTitle>Offline Mode</AlertTitle>
            <AlertDescription>
                You are currently offline. Your comments will be synced once you are
                back online.
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

                <Button @click.prevent="onAddComment" :disabled="isSubmitting || !newComment.trim()"
                    class="w-full sm:w-auto" data-testid="post-comment-button">
                    <Loader2Icon v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
                    {{ isSubmitting ? "Posting..." : "Comment" }}
                </Button>
            </CardContent>
        </Card>

        <div v-if="loadingComments" class="flex justify-center py-4">
            <Loader2Icon class="h-6 w-6 animate-spin text-muted-foreground" />
            <span class="sr-only">Loading comments...</span>
        </div>
        <Alert v-else-if="commentError" variant="destructive">
            <AlertCircleIcon class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
                {{ commentError }}
                <Button variant="link" class="p-0 h-auto font-normal" @click="onRetryLoadComments">
                    Try again
                </Button>
            </AlertDescription>
        </Alert>

        <div v-else-if="comments?.length > 0" class="space-y-4">
            <h3 class="text-lg font-semibold">Comments ({{ totalComments }})</h3>

            <ScrollArea class="h-[600px]">
                <TransitionGroup name="comment-list" tag="div" class="space-y-4">
                    <CommentItem v-for="comment in comments" :key="comment.commentId" :comment="comment"
                        @update="onUpdateComment" @delete="onDeleteComment" data-testid="comment-item" />
                </TransitionGroup>

                <div v-if="loadingComments" class="flex justify-center py-4">
                    <Loader2Icon class="h-6 w-6 animate-spin text-muted-foreground" />
                </div>

                <div v-if="hasMoreComments && !loadingComments" class="flex justify-center py-4">
                    <Button variant="outline" @click="onLoadMoreComments" :disabled="isLoadingMore">
                        <Loader2Icon v-if="isLoadingMore" class="mr-2 h-4 w-4 animate-spin" />
                        {{ isLoadingMore ? "Loading more..." : "Load More Comments" }}
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
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useCommentStore } from "@/stores/commentStore";
import { useUserStore } from "@/stores/userStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useErrorHandler } from "@/utils/errorHandler";
import { useFormValidation } from "@/composables/useFormValidation";
import { debounce } from "lodash-es";
import logger from "@/services/logging";
import { storeToRefs } from "pinia";
const commentStore = useCommentStore();
const userStore = useUserStore();
const {
    comments,
    loadingComments,
    commentError,
    hasMoreComments,
    lastVisible,
    totalComments,
} = storeToRefs(commentStore);
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import MarkdownEditor from "@/components/shared/MarkdownEditor.vue";
import CommentItem from "../shared/CommentItem.vue";

// Icons
import {
    Loader2Icon,
    MessageSquareIcon,
    AlertCircleIcon,
} from "lucide-vue-next";

const props = defineProps({
    postId: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(["close"]);

const notificationStore = useNotificationStore();
const { handleError } = useErrorHandler();

// Local state
const newComment = ref("");
const commentInput = ref(null);
const inputError = ref("");
const isSubmitting = ref(false);
const isLoadingMore = ref(false);
const offlineMode = ref(!navigator.onLine);
const syncError = ref(null);

// Debounced input validation
const debouncedValidateInput = debounce((input, errorRef) => {
    if (input.length > 1000) {
        errorRef.value = "Comment is too long";
    } else if (input.trim() === "") {
        errorRef.value = "Comment cannot be empty";
    } else {
        errorRef.value = "";
    }
}, 300);

const onInput = () => {
    debouncedValidateInput(newComment.value, inputError);
};

const onAddComment = async () => {
    if (!newComment.value.trim()) {
        inputError.value = "Comment cannot be empty";
        return;
    }
    isSubmitting.value = true;
    try {
        logger.debug("Adding comment:", {
            postId: props.postId,
            commentContent: newComment.value,
        });
        if (typeof newComment.value !== 'string') {
            inputError.value = "Invalid comment format";
            return;
        }

        const addedComment = await commentStore.addComment(
            props.postId,
            String(newComment.value.trim())
        );
        
        if (addedComment) {
            newComment.value = "";
            notificationStore.showNotification(
                "Comment posted successfully",
                "success"
            );
            logger.info("Comment posted successfully", { 
                postId: props.postId,
                commentId: addedComment.commentId 
            });
        } else {
            throw new Error("Failed to add comment - invalid response");
        }
    } catch (error) {
        logger.error("Error posting comment:", error);
        await handleError(error);
        inputError.value = "Failed to post comment";
    } finally {
        isSubmitting.value = false;
    }
};

const onUpdateComment = async (updatedComment) => {
    try {
        if (!updatedComment.content?.trim()) {
            notificationStore.showNotification("Comment cannot be empty", "error");
            return;
        }

        if (updatedComment.content.length > 1000) {
            notificationStore.showNotification("Comment is too long", "error");
            return;
        }

        logger.debug("Updating comment:", { commentId: updatedComment.commentId });
        await commentStore.updateComment(
            props.postId,
            updatedComment.commentId,
            updatedComment.content.trim()
        );
        notificationStore.showNotification(
            "Comment updated successfully",
            "success"
        );
    } catch (error) {
        logger.error("Error updating comment:", error);
        await handleError(error);
    }
};

const onDeleteComment = async (comment) => {
    try {
        logger.debug("Deleting comment:", { commentId: comment.commentId });
        await commentStore.deleteComment(props.postId, comment.commentId);
        notificationStore.showNotification(
            "Comment deleted successfully",
            "success"
        );
    } catch (error) {
        logger.error("Error deleting comment:", error);
        await handleError(error);
    }
};

const onRetryLoadComments = async () => {
    commentStore.resetComments();
    try {
        logger.debug("Retrying to load comments");
        const newComments = await commentStore.fetchComments(
            props.postId,
            20,
            lastVisible.value
        );

        if (!Array.isArray(newComments)) {
            throw new Error("Invalid comments response format");
        }

        if (newComments.length === 0) {
            notificationStore.showNotification("No comments found", "warning");
        }
    } catch (error) {
        logger.error("Error retrying to load comments:", error);
        if (error.code === "9992") {
            notificationStore.showNotification("Post not found", "error");
            emit("close");
        } else if (error.code === "1004") {
            notificationStore.showNotification("Invalid pagination token", "error");
            commentStore.resetComments();
            await commentStore.fetchComments(props.postId);
        } else {
            notificationStore.showNotification("Failed to load comments", "error");
            await handleError(error);
        }
    }
};

const onLoadMoreComments = debounce(async () => {
    if (isLoadingMore.value) return;
    isLoadingMore.value = true;

    try {
        logger.debug("Loading more comments", { lastVisible: lastVisible.value });
        const newComments = await commentStore.fetchComments(
            props.postId,
            20,
            lastVisible.value
        );

        if (newComments.length === 0) {
            commentStore.hasMoreComments = false;
        }
    } catch (error) {
        logger.error("Error loading more comments:", error);
        notificationStore.showNotification("Failed to load more comments", "error");
        await handleError(error);
    } finally {
        isLoadingMore.value = false;
    }
}, 300);

const retrySyncComments = async () => {
    try {
        logger.debug("Retrying to sync comments");
        await commentStore.syncOfflineComments();
        syncError.value = null;
        notificationStore.showNotification(
            "Comments synced successfully",
            "success"
        );
        await onRetryLoadComments();
    } catch (error) {
        logger.error("Sync comments error:", error);
        syncError.value = "Failed to sync comments. Please try again.";
        notificationStore.showNotification("Failed to sync comments", "error");
    }
};

const checkOnlineStatus = () => {
    offlineMode.value = !navigator.onLine;
    if (navigator.onLine) {
        retrySyncComments();
    }
};

onMounted(async () => {
    logger.debug("Mounting CommentSection", { postId: props.postId });

    // Reset and fetch initial comments
    try {
        await commentStore.resetComments();

        await commentStore.fetchComments(props.postId);

        logger.debug("Comments loaded successfully", {
            commentsCount: comments.value?.length,
            hasMore: hasMoreComments.value,
            totalComments: totalComments.value,
        });

        if (comments.value.length === 0) {
            logger.info("No comments found for post");
        }
    } catch (err) {
        logger.error("Error fetching initial comments:", err);

        if (err.response?.status === 404 || err.code === "9992") {
            notificationStore.showNotification("Post not found", "error");
            emit("close");
            return;
        }

        if (err.response?.status === 401) {
            notificationStore.showNotification(
                "Please login to view comments",
                "error"
            );
            return;
        }

        const errorMessage =
            err.response?.data?.message || err.message || "Failed to load comments";
        commentError.value = errorMessage;
        notificationStore.showNotification(errorMessage, "error");
    }

    // Sync offline comments if online
    if (navigator.onLine) {
        try {
            await commentStore.syncOfflineComments();
            logger.debug("Offline comments synced successfully");
        } catch (err) {
            logger.error("Error syncing offline comments:", err);
            syncError.value = "Failed to sync offline comments";
            notificationStore.showNotification(
                "Failed to sync offline comments",
                "error"
            );
        }
    }

    // Set up online/offline listeners
    window.addEventListener("online", checkOnlineStatus);
    window.addEventListener("offline", checkOnlineStatus);
});

onUnmounted(() => {
    window.removeEventListener("online", checkOnlineStatus);
    window.removeEventListener("offline", checkOnlineStatus);
});

// Watch for errors
watch(
    () => commentError.value,
    (newError) => {
        if (newError) {
            logger.error("Comment error occurred:", newError);
        }
    }
);
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
