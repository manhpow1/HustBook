<template>
    <div>
        <!-- Delete Button -->
        <button @click="openModal"
            class="text-red-600 hover:text-red-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
            type="button" aria-label="Delete Post" data-testid="delete-post-button">
            <TrashIcon class="w-5 h-5" aria-hidden="true" />
            Delete Post
        </button>

        <!-- Confirmation Modal -->
        <teleport to="body">
            <div v-if="showConfirmation"
                class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeModal"
                role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description">
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full" @click.stop>
                    <h3 id="modal-title" class="text-lg font-semibold mb-4">Confirm Delete</h3>
                    <p id="modal-description" class="mb-6">
                        Are you sure you want to delete this post? This action cannot be undone.
                    </p>
                    <div class="flex justify-end space-x-4">
                        <Button @click="confirmDelete" :disabled="isDeleting" variant="danger" class="flex items-center"
                            aria-label="Confirm Delete" data-testid="confirm-delete-button">
                            <span v-if="isDeleting" class="flex items-center">
                                <LoaderIcon class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                                Deleting...
                            </span>
                            <span v-else>Delete</span>
                        </Button>
                        <Button @click="closeModal" :disabled="isDeleting" variant="secondary"
                            aria-label="Cancel Delete" data-testid="cancel-delete-button">
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        </teleport>

        <!-- Success and Error Messages -->
        <Alert v-if="successMessage" type="success" title="Deleted" :message="successMessage" />
        <Alert v-if="errorMessage" type="error" title="Error" :message="errorMessage" :showRetry="false" />
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { TrashIcon, LoaderIcon } from 'lucide-vue-next';
import Button from '../ui/Button.vue';
import Alert from '../ui/Alert.vue';
import { usePostStore } from '../../stores/postStore';
import { useRouter } from 'vue-router';
import { useErrorHandler } from '../../composables/useErrorHandler';
import logger from '../../services/logging';

const props = defineProps({
    postId: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['post-deleted']);

// State
const showConfirmation = ref(false);
const isDeleting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

// Stores and Router
const postStore = usePostStore();
const router = useRouter();
const { handleError } = useErrorHandler();

// Methods

const openModal = () => {
    showConfirmation.value = true;
    nextTick(() => {
        const confirmButton = document.querySelector('[data-testid="confirm-delete-button"]');
        if (confirmButton) {
            confirmButton.focus();
        }
    });
};

const closeModal = () => {
    if (!isDeleting.value) {
        showConfirmation.value = false;
        const deleteButton = document.querySelector('[data-testid="delete-post-button"]');
        if (deleteButton) {
            deleteButton.focus();
        }
    }
};

const confirmDelete = async () => {
    isDeleting.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
        const response = await postStore.deletePost(props.postId);

        if (response.code === '1000') {
            successMessage.value = 'Post deleted successfully.';
            logger.info('Post deleted successfully', { postId: props.postId });
            emit('post-deleted');
            router.push({ name: 'Home' }); // Navigate to home or appropriate page
        } else {
            errorMessage.value = response.message || 'An error occurred while deleting the post.';
            logger.warn('Failed to delete post', { responseCode: response.code, message: response.message });
        }
    } catch (error) {
        logger.error('Error in confirmDelete', error);
        errorMessage.value = 'An error occurred while deleting the post. Please try again.';
        await handleError(error);
    } finally {
        isDeleting.value = false;
        showConfirmation.value = false;
    }
};

// Handle Esc Key to Close Modal
const handleKeyDown = (event) => {
    if (event.key === 'Escape' && showConfirmation.value) {
        closeModal();
    }
};

// Lifecycle Hooks
onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

button:focus {
    outline: 2px solid #4299e1;
    /* Tailwind's focus ring equivalent */
    outline-offset: 2px;
}

.fixed {
    position: fixed;
}

.flex {
    display: flex;
}

.absolute {
    position: absolute;
}

.z-50 {
    z-index: 50;
}
</style>
