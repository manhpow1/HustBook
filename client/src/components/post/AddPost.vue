<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl" role="form"
        aria-labelledby="create-post-heading">
        <h2 id="create-post-heading" class="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <PencilIcon class="w-6 h-6 mr-2 text-indigo-600" aria-hidden="true" />
            Create a New Post
        </h2>
        <div class="space-y-6">
            <!-- Description Field -->
            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea v-model="description" id="description" rows="3" :class="[
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition duration-300 ease-in-out',
                    { 'border-red-500': descriptionError }
                ]" placeholder="What's on your mind?" aria-describedby="description-error"
                    @input="debouncedSaveDraft"></textarea>
                <p v-if="descriptionError" id="description-error" class="mt-2 text-sm text-red-600">{{ descriptionError
                    }}</p>
            </div>

            <!-- Status Select Field -->
            <div>
                <label for="status-select" class="block text-sm font-medium text-gray-700 mb-2">
                    How are you feeling?
                </label>
                <select v-model="status" id="status-select" :class="[
                    'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md',
                    { 'border-red-500': statusError }
                ]" aria-describedby="status-error">
                    <option value="">Select a status</option>
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                <p v-if="statusError" id="status-error" class="mt-2 text-sm text-red-600">{{ statusError }}</p>
            </div>

            <!-- File Upload Component -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images or Videos
                </label>
                <FileUpload v-model:files="files" :maxFiles="4" aria-describedby="file-error" />
                <p v-if="fileError" id="file-error" class="mt-2 text-sm text-red-600">{{ fileError }}</p>
            </div>

            <!-- Emoji Picker -->
            <div>
                <button type="button" @click="toggleEmojiPicker"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    aria-label="Toggle emoji picker">
                    <SmileIcon class="w-5 h-5 mr-2" aria-hidden="true" />
                    Add Emoji
                </button>
                <div v-if="showEmojiPicker" class="mt-2" role="dialog" aria-modal="true"
                    aria-labelledby="emoji-picker-heading">
                    <h3 id="emoji-picker-heading" class="text-sm font-medium text-gray-900 mb-2">Select an Emoji</h3>
                    <div class="flex flex-wrap">
                        <button v-for="emoji in emojis" :key="emoji" @click="insertEmoji(emoji)"
                            class="inline-flex items-center justify-center w-8 h-8 m-1 text-lg hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            :aria-label="`Insert ${emoji} emoji`">
                            {{ emoji }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Submit Button -->
            <button type="button" @click="submitPost" :disabled="isLoading || !isFormValid"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 ease-in-out"
                :aria-busy="isLoading ? 'true' : 'false'">
                <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                {{ isLoading ? 'Posting...' : 'Create Post' }}
            </button>
        </div>

        <!-- Success and Error Messages -->
        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md flex items-start" role="status"
            aria-live="polite">
            <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p class="text-green-700">{{ successMessage }}</p>
        </div>

        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md flex items-start" role="alert">
            <XCircleIcon class="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p class="text-red-700">{{ errorMessage }}</p>
        </div>

        <!-- Upload Progress -->
        <transition name="fade">
            <div v-if="showUploadProgress" class="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-md" role="status"
                aria-live="polite">
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
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import UnsavedChangesModal from '../shared/UnsavedChangesModal.vue';
import { usePostStore } from '../../stores/postStore';
import { PencilIcon, LoaderIcon, CheckCircleIcon, XCircleIcon, SmileIcon } from 'lucide-vue-next';
import FileUpload from '../shared/FileUpload.vue';
import logger from '../../services/logging';
import { sanitizeInput } from '../../utils/sanitize';
import { useFormValidation } from '../../composables/useFormValidation';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { debounce } from '../../utils/debounce';

const router = useRouter();
const postStore = usePostStore();
const { handleError } = useErrorHandler();

const showUnsavedChangesModal = ref(false);
const pendingNavigation = ref(null);

const description = ref('');
const status = ref('');
const files = ref([]);
const isLoading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const showEmojiPicker = ref(false);
const showUploadProgress = ref(false);
const uploadProgress = ref(0);

const { descriptionError, statusError, fileError, validateDescription, validateStatus, validateFiles } =
    useFormValidation();

const isFormValid = computed(() => {
    const isDescriptionValid = validateDescription(description.value);
    const isStatusValid = validateStatus(status.value);
    const areFilesValid = validateFiles(files.value);

    return (isDescriptionValid || files.value.length > 0) && isStatusValid && areFilesValid && !fileError.value;
});

const statusOptions = [
    { value: 'happy', label: 'Happy' },
    { value: 'sad', label: 'Sad' },
    { value: 'excited', label: 'Excited' },
    { value: 'angry', label: 'Angry' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'loved', label: 'Loved' },
];

const emojis = ['😀', '😂', '😍', '🥳', '😎', '🤔', '😊', '👍', '❤️', '🎉'];

const insertEmoji = (emoji) => {
    description.value += emoji;
    showEmojiPicker.value = false;
};

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
            files: files.value,
        });

        if (response.code === '1000') {
            successMessage.value = 'Post created successfully!';
            logger.info('Post created successfully', { postId: response.data.id });
            resetForm();
            router.push('/'); // Navigate to home page after successful post
        } else {
            errorMessage.value = response.message || 'An error occurred while creating the post';
            logger.warn('Failed to create post', { responseCode: response.code, message: response.message });
        }
    } catch (error) {
        logger.error('Error in submitPost', error);
        errorMessage.value = 'An error occurred while creating the post. Please try again.';
        // Delegate to global error handler
        handleError(error);
    } finally {
        isLoading.value = false;
        showUploadProgress.value = false;
        uploadProgress.value = 0;
    }
};

const resetForm = () => {
    description.value = '';
    status.value = '';
    files.value = [];
    showEmojiPicker.value = false;
    localStorage.removeItem('postDraft');
};

// Handle unsaved changes and navigation guards
const hasUnsavedChanges = computed(() => {
    return description.value.trim() !== '' || status.value !== '' || files.value.length > 0;
});

const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges.value) {
        e.preventDefault();
        e.returnValue = '';
    }
};

const handleRouteChange = (to, from, next) => {
    if (hasUnsavedChanges.value) {
        showUnsavedChangesModal.value = true;
        pendingNavigation.value = { to, from, next };
    } else {
        next();
    }
};

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

// Save draft to localStorage with debouncing
const debouncedSaveDraft = debounce(() => {
    const draft = {
        description: description.value,
        status: status.value,
        files: files.value,
    };
    localStorage.setItem('postDraft', JSON.stringify(draft));
    logger.debug('Draft saved to localStorage');
}, 1000);

// Load draft from localStorage on mount
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

onMounted(() => {
    loadDraft();
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.beforeEach(handleRouteChange);
});

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
    opacity: 0;
}
</style>