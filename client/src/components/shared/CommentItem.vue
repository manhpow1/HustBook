<template>
    <div v-if="comment" class="comment-item">
        <div class="comment-content">
            <img :src="comment.user.avatar" :alt="`${comment.user.name}'s avatar`" class="user-avatar" />
            <div class="comment-details">
                <div class="comment-header">
                    <h4 class="user-name">{{ comment.user.name }}</h4>
                    <time :datetime="comment.created" class="comment-date">{{ formattedDate }}</time>
                </div>
                <div v-if="!isEditing" class="comment-text" v-html="renderedContent"></div>
                <div v-else class="edit-area">
                    <label for="edit-comment" class="sr-only">Edit Comment</label>
                    <textarea id="edit-comment" v-model="editedContent" class="edit-textarea" rows="3"
                        placeholder="Edit your comment here..." aria-label="Edit Comment"></textarea>
                    <p v-if="commentError" class="text-red-500 text-sm mt-1">{{ commentError }}</p>
                </div>
                <div class="comment-actions">
                    <Button @click="toggleLike" :variant="comment.isLiked ? 'primary' : 'outline'"
                        class="action-button" :disabled="isLikeLoading" aria-label="Like" data-testid="like-button">
                        <ThumbsUpIcon class="action-icon" />
                        <span>{{ comment.like }} {{ comment.like === 1 ? 'Like' : 'Likes' }}</span>
                        <span v-if="isLikeLoading" class="loader" aria-live="polite">Loading...</span>
                    </Button>
                    <Button v-if="canEditDelete" @click="toggleEdit" variant="secondary" class="action-button"
                        aria-label="Edit" data-testid="edit-button">
                        {{ isEditing ? 'Cancel' : 'Edit' }}
                    </Button>
                    <Button v-if="canEditDelete && !isEditing" @click="openDeleteDialog" variant="danger"
                        class="action-button delete-button" aria-label="Delete" data-testid="delete-button">
                        Delete
                    </Button>
                </div>
            </div>
        </div>

        <!-- Edit Actions -->
        <div v-if="isEditing" class="edit-actions">
            <Button @click="debouncedSaveEdit" :disabled="isSaveLoading" variant="primary" class="save-button"
                aria-label="Save Comment" data-testid="save-comment-button">
                <span v-if="isSaveLoading">Saving...</span>
                <span v-else>Save</span>
            </Button>
            <Button @click="cancelEdit" variant="secondary" class="cancel-button" aria-label="Cancel Edit"
                data-testid="cancel-edit-button">
                Cancel
            </Button>
        </div>

        <!-- Confirm Delete Dialog -->
        <ConfirmDialog v-if="showDeleteDialog" title="Confirm Delete"
            message="Are you sure you want to delete this comment?" @confirm="debouncedConfirmDelete"
            @cancel="closeDeleteDialog" :isLoading="isDeleteLoading" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ThumbsUpIcon } from 'lucide-vue-next';
import { useUserStore } from '../../stores/userStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useFormValidation } from '../../composables/useFormValidation';
import { formatDate } from '../../utils/helpers';
import { renderMarkdown } from '../../utils/markdown';
import { debounce } from 'lodash-es';
import logger from '../../services/logging';

// Components
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import Button from '../ui/Button.vue';

// Props
const props = defineProps({
    comment: {
        type: Object,
        required: true,
    },
});

// Emits
const emit = defineEmits(['update', 'delete']);

// Stores
const userStore = useUserStore();
const notificationStore = useNotificationStore();

// Reactive References
const isEditing = ref(false);
const editedContent = ref(props.comment.content);
const showDeleteDialog = ref(false);
const isLikeLoading = ref(false);
const isSaveLoading = ref(false);
const isDeleteLoading = ref(false);

// Form Validation
const { commentError, validateComment } = useFormValidation();

// Computed Properties
const canEditDelete = computed(() => userStore.userId === props.comment.user.id);
const renderedContent = computed(() => renderMarkdown(props.comment.content));
const formattedDate = computed(() => formatDate(props.comment.created));

// Debounced Functions
const debouncedSaveEdit = debounce(async () => {
    const trimmedContent = editedContent.value.trim();
    const isValid = validateComment(trimmedContent);
    if (!isValid) {
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
            notificationStore.showNotification('Comment updated successfully.', 'success');
            logger.info('Comment updated successfully', { commentId: props.comment.id });
        } catch (error) {
            notificationStore.showNotification('Failed to save comment edit.', 'error');
            logger.error('Error updating comment', error);
        } finally {
            isSaveLoading.value = false;
        }
    } else {
        isEditing.value = false;
    }
}, 300);

const debouncedConfirmDelete = debounce(async () => {
    isDeleteLoading.value = true;
    try {
        await emit('delete', props.comment.id);
        closeDeleteDialog();
        notificationStore.showNotification('Comment deleted successfully.', 'success');
        logger.info('Comment deleted successfully', { commentId: props.comment.id });
    } catch (error) {
        notificationStore.showNotification('Failed to delete comment.', 'error');
        logger.error('Error deleting comment', error);
    } finally {
        isDeleteLoading.value = false;
    }
}, 300);

const debouncedToggleLike = debounce(async () => {
    isLikeLoading.value = true;
    try {
        await emit('update', {
            id: props.comment.id,
            isLiked: !props.comment.isLiked,
            like: props.comment.like + (props.comment.isLiked ? -1 : 1),
        });
        logger.info('Comment like toggled', { commentId: props.comment.id });
    } catch (error) {
        notificationStore.showNotification('Failed to like comment.', 'error');
        logger.error('Error toggling like on comment', error);
    } finally {
        isLikeLoading.value = false;
    }
}, 300);

// Methods
const toggleEdit = () => {
    isEditing.value = !isEditing.value;
    if (isEditing.value) {
        editedContent.value = props.comment.content;
        commentError.value = '';
    }
};


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

const toggleLike = () => {
    debouncedToggleLike();
};

const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
        if (isEditing.value) {
            cancelEdit();
        } else if (showDeleteDialog.value) {
            closeDeleteDialog();
        }
    }
};

// Lifecycle Hooks
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
