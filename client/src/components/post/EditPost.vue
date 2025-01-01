<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <EditIcon class="w-6 h-6 mr-2 text-primary" aria-hidden="true" />
            Edit Post
        </h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- File Upload Component -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images or Videos
                </label>
                <FileUpload v-model:files="files" :initialFiles="initialFiles" :maxFiles="4"
                    @upload-progress="handleUploadProgress" @upload-error="handleUploadError"
                    aria-describedby="file-error" data-testid="edit-file-upload" />
                <p v-if="fileError" id="file-error" class="text-red-500 text-sm">{{ fileError }}</p>
            </div>

            <!-- Description Field -->
            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea id="description" v-model="description" rows="3" maxlength="500" :class="[
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 transition duration-300 ease-in-out',
                    { 'border-red-500': descriptionError }
                ]" placeholder="What's on your mind?" aria-describedby="description-error" @input="onDescriptionInput"
                    data-testid="edit-description-textarea"></textarea>
                <p v-if="descriptionError" id="description-error" class="text-red-500 text-sm mt-1">
                    {{ descriptionError }}
                </p>
                <p class="mt-2 text-sm text-gray-500">{{ description.length }}/500 characters</p>
            </div>

            <!-- Status Select Field -->
            <div>
                <label for="status-select" class="block text-sm font-medium text-gray-700 mb-2">
                    How are you feeling?
                </label>
                <select id="status-select" v-model="status" :class="[
                    'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md',
                    { 'border-red-500': statusError }
                ]" data-testid="edit-status-select">
                    <option value="">Select a status</option>
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                <p v-if="statusError" class="text-red-500 text-sm mt-1">{{ statusError }}</p>
            </div>

            <!-- Emoji Picker -->
            <div class="relative">
                <button type="button" @click="toggleEmojiPicker"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    aria-label="Toggle emoji picker" data-testid="edit-toggle-emoji-picker-button">
                    <SmileIcon class="w-5 h-5 mr-2" aria-hidden="true" />
                    Add Emoji
                </button>
                <EmojiPicker v-if="showEmojiPicker" @select="insertEmoji"
                    class="absolute z-10 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg p-2" />
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-between">
                <Button type="button" @click="cancelEdit" variant="secondary" class="px-4 py-2"
                    aria-label="Cancel Editing" data-testid="edit-cancel-button">
                    Cancel
                </Button>
                <Button type="submit" :disabled="isLoading || !isFormValid" variant="primary" class="px-4 py-2"
                    aria-label="Update Post" data-testid="edit-submit-button">
                    <span v-if="isLoading" class="flex items-center">
                        <LoaderIcon class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                        Updating...
                    </span>
                    <span v-else>Update Post</span>
                </Button>
            </div>
        </form>

        <!-- Unsaved Changes Modal -->
        <UnsavedChangesModal v-model="showUnsavedChangesModal" @save="saveChanges" @discard="discardChanges"
            @cancel="cancelNavigation" />

        <!-- Success and Error Messages -->
        <Alert v-if="successMessage" type="success" title="Success" :message="successMessage" />
        <Alert v-if="errorMessage" type="error" title="Error" :message="errorMessage" :showRetry="false" />

        <!-- Upload Progress -->
        <transition name="fade">
            <div v-if="showUploadProgress" class="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-md" role="status"
                aria-live="polite" data-testid="edit-upload-progress">
                <p class="text-sm font-medium text-gray-700 mb-2">Uploading changes...</p>
                <div class="w-48 h-2 bg-gray-200 rounded-full">
                    <div class="h-full bg-primary rounded-full transition-width duration-300"
                        :style="{ width: `${uploadProgress}%` }"></div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { EditIcon, LoaderIcon, SmileIcon } from 'lucide-vue-next';
import FileUpload from '../shared/FileUpload.vue';
import EmojiPicker from '../shared/EmojiPicker.vue';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import UnsavedChangesModal from '../shared/UnsavedChangesModal.vue';
import { usePostStore } from '../../stores/postStore';
import { useFormValidation } from '../../composables/useFormValidation';
import { useErrorHandler } from '@/utils/errorHandler';
import { debounce } from 'lodash-es';
import { sanitizeInput } from '../../utils/sanitize';
import logger from '../../services/logging';

const router = useRouter();
const postStore = usePostStore();
const { handleError } = useErrorHandler();

// Props
const props = defineProps({
    postId: {
        type: String,
        required: true,
    },
});

// Emits
const emit = defineEmits(['post-updated']);

// Form State
const description = ref('');
const status = ref('');
const files = ref([]);
const initialFiles = ref([]);
const isLoading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const showEmojiPicker = ref(false);
const showUploadProgress = ref(false);
const uploadProgress = ref(0);

// Modal State
const showUnsavedChangesModal = ref(false);
const pendingNavigation = ref(null);

// Form Validation
const {
    descriptionError,
    statusError,
    fileError,
    validateDescription,
    validateStatus,
    validateFiles,
} = useFormValidation();


// Status Options
const statusOptions = [
    { value: 'happy', label: 'Happy' },
    { value: 'sad', label: 'Sad' },
    { value: 'excited', label: 'Excited' },
    { value: 'angry', label: 'Angry' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'loved', label: 'Loved' },
];

// Computed Properties
const isFormValid = computed(() => {
    const isDescriptionValid = validateDescription(description.value);
    const isStatusValid = validateStatus(status.value);
    const areFilesValid = validateFiles(files.value);
    return isDescriptionValid && isStatusValid && areFilesValid && !fileError.value;
});

// Debounced Functions
const debouncedValidateInput = debounce((input, errorRef) => {
    if (input.length > 500) {
        errorRef.value = 'Description is too long.';
    } else if (input.trim() === '') {
        errorRef.value = 'Description cannot be empty.';
    } else {
        errorRef.value = '';
    }
}, 300);

// Input Handler
const onDescriptionInput = () => {
    debouncedValidateInput(description.value, descriptionError);
    debouncedSaveDraft();
};

// Autosave Functionality
const debouncedSaveDraft = debounce(() => {
    const draft = {
        description: description.value,
        status: status.value,
        files: files.value,
    };
    localStorage.setItem('editPostDraft', JSON.stringify(draft));
    logger.debug('Edit post draft saved to localStorage');
}, 1000);

// Load Post Data
const loadPostData = async () => {
    try {
        const postData = await postStore.fetchPost(props.postId);
        description.value = postData.described;
        status.value = postData.status;
        initialFiles.value = postData.media.map((url) => ({ url }));
        files.value = [...initialFiles.value];
        logger.debug('Post data loaded successfully');
    } catch (error) {
        logger.error('Failed to load post data', error);
        errorMessage.value = 'Failed to load post data.';
        await handleError(error);
    }
};

// Submit Edited Post
const handleSubmit = async () => {
    if (!isFormValid.value) {
        errorMessage.value = 'Please fix the errors before submitting.';
        return;
    }

    isLoading.value = true;
    errorMessage.value = '';
    successMessage.value = '';
    showUploadProgress.value = true;

    const sanitizedDescription = sanitizeInput(description.value);

    try {
        const updatedPostData = {
            described: sanitizedDescription,
            status: status.value,
            files: files.value, // Assuming files are handled as File objects or URLs
        };

        const response = await postStore.updatePost(props.postId, updatedPostData);

        if (response.code === '1000') {
            successMessage.value = 'Post updated successfully!';
            logger.info('Post updated successfully', { postId: props.postId });
            resetForm();
            emit('post-updated');
            router.push({ name: 'PostDetail', params: { id: props.postId } }); // Navigate to post detail
        } else {
            errorMessage.value = response.message || 'An error occurred while updating the post.';
            logger.warn('Failed to update post', { responseCode: response.code, message: response.message });
        }
    } catch (error) {
        logger.error('Error in handleSubmit', error);
        errorMessage.value = 'An error occurred while updating the post. Please try again.';
        await handleError(error);
    } finally {
        isLoading.value = false;
        showUploadProgress.value = false;
        uploadProgress.value = 0;
    }
};

// Reset Form Fields
const resetForm = () => {
    description.value = '';
    status.value = '';
    files.value = [];
    initialFiles.value = [];
    showEmojiPicker.value = false;
    localStorage.removeItem('editPostDraft');
};

// Insert Emoji into Description
const insertEmoji = (emoji) => {
    description.value += emoji;
};

// Toggle Emoji Picker
const toggleEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value;
};

// Handle Upload Progress
const handleUploadProgress = (progress) => {
    uploadProgress.value = progress;
};

// Handle Upload Errors
const handleUploadError = (error) => {
    errorMessage.value = 'Failed to upload files. Please try again.';
    logger.error('File upload error:', error);
};

// Handle Unsaved Changes
const saveChanges = async () => {
    await handleSubmit();
    if (!errorMessage.value) {
        showUnsavedChangesModal.value = false;
        pendingNavigation.value.next();
    }
};

const discardChanges = () => {
    resetForm();
    showUnsavedChangesModal.value = false;
    pendingNavigation.value.next();
};

const cancelNavigation = () => {
    showUnsavedChangesModal.value = false;
    pendingNavigation.value.next(false);
};

// Navigation Guard
const handleRouteChange = (to, from, next) => {
    if (hasUnsavedChanges.value) {
        showUnsavedChangesModal.value = true;
        pendingNavigation.value = { to, from, next };
    } else {
        next();
    }
};

// Watchers
watch(
    () => props.postId,
    () => {
        loadPostData();
    },
    { immediate: true }
);

// Computed for Unsaved Changes
const hasUnsavedChanges = computed(() => {
    return (
        description.value.trim() !== '' ||
        status.value !== '' ||
        files.value.length !== initialFiles.value.length
    );
});

// Lifecycle Hooks
onMounted(() => {
    loadPostData();
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.beforeEach(handleRouteChange);
});

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    router.beforeEach(() => { }); // Remove the navigation guard
});

// Handle Browser Before Unload Event
const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges.value) {
        e.preventDefault();
        e.returnValue = '';
    }
};
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

.relative {
    position: relative;
}

.absolute {
    position: absolute;
}
</style>
