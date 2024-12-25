<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl" role="form"
        aria-labelledby="create-post-heading">
        <h2 id="create-post-heading" class="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <PencilIcon class="w-6 h-6 mr-2 text-indigo-600" aria-hidden="true" />
            Create a New Post
        </h2>
        <form @submit.prevent="submitPost" class="space-y-6">
            <!-- Description Field -->
            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea v-model="description" id="description" rows="3" :class="[
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition duration-300 ease-in-out',
                    { 'border-red-500': descriptionError }
                ]" placeholder="What's on your mind?" aria-describedby="description-error" @input="onDescriptionInput"
                    data-testid="description-textarea"></textarea>
                <p v-if="descriptionError" id="description-error" class="mt-2 text-sm text-red-600">
                    {{ descriptionError }}
                </p>
            </div>

            <!-- Status Select Field -->
            <div>
                <label for="status-select" class="block text-sm font-medium text-gray-700 mb-2">
                    How are you feeling?
                </label>
                <select v-model="status" id="status-select" :class="[
                    'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md',
                    { 'border-red-500': statusError }
                ]" aria-describedby="status-error" data-testid="status-select">
                    <option value="">Select a status</option>
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                <p v-if="statusError" id="status-error" class="mt-2 text-sm text-red-600">
                    {{ statusError }}
                </p>
            </div>

            <!-- File Upload Component -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images or Videos
                </label>
                <FileUpload v-model:files="files" :maxFiles="4" @upload-progress="handleUploadProgress"
                    @upload-error="handleUploadError" aria-describedby="file-error" data-testid="file-upload" />
                <p v-if="fileError" id="file-error" class="mt-2 text-sm text-red-600">
                    {{ fileError }}
                </p>
            </div>

            <!-- Emoji Picker -->
            <div class="relative">
                <Button type="button" @click="toggleEmojiPicker" variant="primary"
                    class="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
                    aria-label="Toggle emoji picker" data-testid="toggle-emoji-picker-button">
                    <SmileIcon class="w-5 h-5 mr-2" aria-hidden="true" />
                    Add Emoji
                </Button>
                <EmojiPicker v-if="showEmojiPicker" @select="insertEmoji"
                    class="absolute z-10 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg p-2" />
            </div>

            <!-- Submit Button -->
            <Button type="submit" :disabled="isLoading || !isFormValid" variant="primary"
                class="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 ease-in-out"
                :aria-busy="isLoading ? 'true' : 'false'" data-testid="submit-post-button">
                <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                {{ isLoading ? 'Posting...' : 'Create Post' }}
            </Button>
        </form>

        <!-- Success and Error Messages -->
        <Alert v-if="successMessage" type="success" title="Success" :message="successMessage" class="mt-4" />
        <Alert v-if="errorMessage" type="error" title="Error" :message="errorMessage" class="mt-4" />

        <!-- Upload Progress -->
        <transition name="fade">
            <div v-if="showUploadProgress" class="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-md" role="status"
                aria-live="polite" data-testid="upload-progress">
                <p class="text-sm font-medium text-gray-700 mb-2">Uploading post...</p>
                <div class="w-48 h-2 bg-gray-200 rounded-full">
                    <div class="h-full bg-indigo-600 rounded-full transition-width duration-300"
                        :style="{ width: `${uploadProgress}%` }"></div>
                </div>
            </div>
        </transition>

        <!-- Unsaved Changes Modal -->
        <UnsavedChangesModal v-model="showUnsavedChangesModal" @save="saveChanges" @discard="discardChanges"
            @cancel="cancelNavigation" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { PencilIcon, LoaderIcon, SmileIcon } from 'lucide-vue-next';
import FileUpload from '../shared/FileUpload.vue';
import EmojiPicker from '../ui/EmojiPicker.vue';
import { Button } from '@/components/ui/button';
import Alert from '@/components/ui/alert';
import UnsavedChangesModal from '../shared/UnsavedChangesModal.vue';
import { usePostStore } from '../../stores/postStore';
import { useFormValidation } from '../../composables/useFormValidation';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { debounce } from 'lodash-es'
import { sanitizeInput } from '../../utils/sanitize';
import logger from '../../services/logging';

const router = useRouter();
const postStore = usePostStore();
const { handleError } = useErrorHandler();

// Form State
const description = ref('');
const status = ref('');
const files = ref([]);
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
    if (input.length > 1000) {
        errorRef.value = 'Description is too long.';
    } else if (input.trim() === '') {
        errorRef.value = 'Description cannot be empty.';
    } else {
        errorRef.value = '';
    }
}, 300);

const debouncedSaveDraft = debounce(() => {
    const draft = {
        description: description.value,
        status: status.value,
        files: files.value,
    };
    localStorage.setItem('postDraft', JSON.stringify(draft));
    logger.debug('Draft saved to localStorage');
}, 1000);

// Input Handler
const onDescriptionInput = () => {
    debouncedValidateInput(description.value, descriptionError);
    debouncedSaveDraft();
};

// Load Draft on Mount
const loadDraft = () => {
    const draft = localStorage.getItem('postDraft');
    if (draft) {
        const { description: desc, status: stat, files: fls } = JSON.parse(draft);
        description.value = desc;
        status.value = stat;
        files.value = fls;
        logger.debug('Draft loaded from localStorage');
    }
};

// Submit Post
const submitPost = async () => {
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
        const response = await postStore.createPost({
            described: sanitizedDescription,
            status: status.value,
            files: files.value, // Assuming files are handled as File objects in store
        });

        if (response.code === '1000') {
            successMessage.value = 'Post created successfully!';
            logger.info('Post created successfully', { postId: response.data.id });
            resetForm();
            router.push('/'); // Navigate to home or post detail page as needed
        } else {
            errorMessage.value = response.message || 'An error occurred while creating the post.';
            logger.warn('Failed to create post', { responseCode: response.code, message: response.message });
        }
    } catch (error) {
        logger.error('Error in submitPost', error);
        errorMessage.value = 'An error occurred while creating the post. Please try again.';
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
    showEmojiPicker.value = false;
    localStorage.removeItem('postDraft');
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
    await submitPost();
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

// Computed for Unsaved Changes
const hasUnsavedChanges = computed(() => {
    return (
        description.value.trim() !== '' ||
        status.value !== '' ||
        files.value.length > 0
    );
});

// Lifecycle Hooks
onMounted(() => {
    loadDraft();
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

.fixed {
    position: fixed;
}

.z-10 {
    z-index: 10;
}

.z-50 {
    z-index: 50;
}
</style>