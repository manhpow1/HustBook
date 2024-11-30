<template>
    <div v-if="comment" class="comment-item">
        <div class="comment-content">
            <img :src="comment.user.avatar" :alt="comment.user.name" class="user-avatar" />
            <div class="comment-details">
                <div class="comment-header">
                    <h4 class="user-name">{{ comment.user.name }}</h4>
                    <time :datetime="comment.created" class="comment-date">{{ formattedDate }}</time>
                </div>
                <div v-if="!isEditing" class="comment-text" v-html="renderedContent"></div>
                <div v-else class="edit-area">
                    <label for="edit-comment" class="sr-only">Edit Comment</label>
                    <textarea id="edit-comment" v-model="editedContent" class="edit-textarea" rows="3"
                        placeholder="Edit your comment..."></textarea>
                    <p v-if="commentError" class="text-red-500 text-sm mt-1">{{ commentError }}</p>
                </div>
                <div class="comment-actions">
                    <button @click="debouncedToggleLike" class="action-button" :class="{ 'liked': comment.is_liked }"
                        :disabled="isLikeLoading" :aria-label="comment.is_liked ? 'Unlike' : 'Like'">
                        <ThumbsUpIcon class="action-icon" />
                        <span>{{ comment.like }} {{ comment.like === 1 ? 'Like' : 'Likes' }}</span>
                        <span v-if="isLikeLoading" class="loader" aria-live="polite">Loading...</span>
                    </button>
                    <button v-if="canEditDelete" @click="toggleEdit" class="action-button"
                        :aria-label="isEditing ? 'Cancel Edit' : 'Edit'">
                        {{ isEditing ? 'Cancel' : 'Edit' }}
                    </button>
                    <button v-if="canEditDelete && !isEditing" @click="openDeleteDialog"
                        class="action-button delete-button" :aria-label="'Delete'">
                        Delete
                    </button>
                </div>
            </div>
        </div>
        <div v-if="isEditing" class="edit-actions">
            <button @click="debouncedSaveEdit" class="save-button" :disabled="isSaveLoading" :aria-label="'Save'">
                Save
                <span v-if="isSaveLoading" class="loader"></span>
            </button>
            <button @click="cancelEdit" class="cancel-button" :aria-label="'Cancel'">
                Cancel
            </button>
        </div>
        <ConfirmDialog v-if="showDeleteDialog" :title="'Confirm Delete'"
            :message="'Are you sure you want to delete this comment?'" @confirm="debouncedConfirmDelete"
            @cancel="closeDeleteDialog" :isLoading="isDeleteLoading" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ThumbsUpIcon } from 'lucide-vue-next';
import { useUserStore } from '../../stores/userStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { formatDate } from '../../utils/helpers';
import { renderMarkdown } from '../../utils/markdown';
import { debounce } from 'lodash-es';
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import { useFormValidation } from '../../composables/useFormValidation';
import logger from '../../services/logging';

const props = defineProps({
    comment: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['update', 'delete']);

const userStore = useUserStore();
const notificationStore = useNotificationStore();
const isEditing = ref(false);
const editedContent = ref(props.comment.content);
const showDeleteDialog = ref(false);
const isLikeLoading = ref(false);
const isSaveLoading = ref(false);
const isDeleteLoading = ref(false);

const { commentError, validateComment } = useFormValidation();

const canEditDelete = computed(() => userStore.userId === props.comment.user.id);
const renderedContent = computed(() => renderMarkdown(props.comment.content));
const formattedDate = computed(() => formatDate(props.comment.created));

watch(
    () => props.comment.content,
    (newContent) => {
        editedContent.value = newContent;
    }
);

const toggleEdit = () => {
    isEditing.value = !isEditing.value;
    if (isEditing.value) {
        editedContent.value = props.comment.content;
        commentError.value = '';
    }
};

const saveEdit = async () => {
    const trimmedContent = editedContent.value.trim();
    const isCommentValid = validateComment(trimmedContent);
    if (!isCommentValid) {
        notificationStore.showNotification(commentError.value, 'error');
        return;
    }

    if (trimmedContent !== props.comment.content) {
        isSaveLoading.value = true;
        try {
            await emit('update', {
                id: props.comment.id,
                content: trimmedContent,
            });
            isEditing.value = false;
            notificationStore.showNotification('Comment updated successfully', 'success');
            logger.info('Comment updated successfully', { commentId: props.comment.id });
        } catch (error) {
            notificationStore.showNotification('Failed to save the edited comment', 'error');
            logger.error('Error updating comment', error);
        } finally {
            isSaveLoading.value = false;
        }
    } else {
        isEditing.value = false;
    }
};

const debouncedSaveEdit = debounce(saveEdit, 300);

const cancelEdit = () => {
    isEditing.value = false;
    editedContent.value = props.comment.content;
    commentError.value = '';
};

const openDeleteDialog = () => {
    showDeleteDialog.value = true;
};

const closeDeleteDialog = () => {
    showDeleteDialog.value = false;
};

const confirmDelete = async () => {
    isDeleteLoading.value = true;
    try {
        await emit('delete', props.comment.id);
        closeDeleteDialog();
        notificationStore.showNotification('Comment deleted successfully', 'success');
        logger.info('Comment deleted successfully', { commentId: props.comment.id });
    } catch (error) {
        notificationStore.showNotification('Failed to delete the comment', 'error');
        logger.error('Error deleting comment', error);
    } finally {
        isDeleteLoading.value = false;
    }
};

const debouncedConfirmDelete = debounce(confirmDelete, 300);

const toggleLike = async () => {
    isLikeLoading.value = true;
    try {
        await emit('update', {
            id: props.comment.id,
            is_liked: !props.comment.is_liked,
            like: props.comment.like + (props.comment.is_liked ? -1 : 1),
        });
        logger.info('Comment like toggled', { commentId: props.comment.id });
    } catch (error) {
        notificationStore.showNotification('Failed to toggle like on comment', 'error');
        logger.error('Error toggling like on comment', error);
    } finally {
        isLikeLoading.value = false;
    }
};

const debouncedToggleLike = debounce(toggleLike, 300);

const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
        if (isEditing.value) {
            cancelEdit();
        } else if (showDeleteDialog.value) {
            closeDeleteDialog();
        }
    }
};

onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.comment-item {
    @apply mb-4 p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200;
}

.comment-content {
    @apply flex items-start;
}

.user-avatar {
    @apply w-10 h-10 rounded-full mr-3;
}

.comment-details {
    @apply flex-grow;
}

.comment-header {
    @apply flex items-center justify-between mb-1;
}

.user-name {
    @apply font-semibold text-gray-800;
}

.comment-date {
    @apply text-xs text-gray-500;
}

.comment-text {
    @apply text-gray-700 whitespace-pre-wrap break-words;
}

.edit-area {
    @apply mt-2;
}

.edit-textarea {
    @apply w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.comment-actions {
    @apply mt-2 flex items-center space-x-4;
}

.action-button {
    @apply text-sm flex items-center text-gray-500 hover:text-blue-500 transition-colors duration-200;
}

.action-button.liked {
    @apply text-blue-500;
}

.action-icon {
    @apply w-4 h-4 mr-1;
}

.delete-button {
    @apply hover:text-red-500;
}

.edit-actions {
    @apply mt-2 flex justify-end space-x-2;
}

.save-button {
    @apply px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200;
}

.cancel-button {
    @apply px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors duration-200;
}

.loader {
    @apply ml-1 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full;
}
</style>