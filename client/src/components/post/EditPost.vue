<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <EditIcon class="w-6 h-6 mr-2 text-primary" />
            Edit Post
        </h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <FileUpload v-model:files="files" :initialFiles="initialFiles" />
            <p v-if="fileError" class="text-red-500 text-sm">{{ fileError }}</p>

            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea id="description" v-model="description" rows="3" maxlength="500" :class="[
                    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 transition duration-300 ease-in-out',
                    { 'border-red-500': descriptionError },
                ]" placeholder="What's on your mind?"></textarea>
                <p v-if="descriptionError" class="text-red-500 text-sm mt-1">{{ descriptionError }}</p>
                <p class="mt-2 text-sm text-gray-500">{{ description.length }}/500 characters</p>
            </div>

            <div>
                <label for="status-select" class="block text-sm font-medium text-gray-700 mb-2">
                    How are you feeling?
                </label>
                <select id="status-select" v-model="status" :class="[
                    'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md',
                    { 'border-red-500': statusError },
                ]">
                    <option value="">Select a status</option>
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                <p v-if="statusError" class="text-red-500 text-sm mt-1">{{ statusError }}</p>
            </div>

            <div>
                <button type="button" @click="toggleEmojiPicker"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    aria-label="Toggle emoji picker">
                    <SmileIcon class="w-5 h-5 mr-2" />
                    Add Emoji
                </button>
                <div v-if="showEmojiPicker" class="mt-2">
                    <button v-for="emoji in emojis" :key="emoji" @click="insertEmoji(emoji)"
                        class="inline-flex items-center justify-center w-8 h-8 m-1 text-lg hover:bg-gray-200 rounded"
                        aria-label="Insert emoji">
                        {{ emoji }}
                    </button>
                </div>
            </div>

            <div class="flex justify-between">
                <button type="button" @click="cancelEdit"
                    class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    Cancel
                </button>
                <button type="submit" :disabled="isLoading || !isFormValid"
                    class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ isLoading ? 'Updating...' : 'Update Post' }}
                </button>
            </div>
        </form>

        <!-- Unsaved Changes Modal -->
        <div v-if="showUnsavedChangesModal"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Unsaved Changes</h3>
                <p class="text-sm text-gray-500 mb-4">
                    You have unsaved changes. Are you sure you want to leave this page?
                </p>
                <div class="flex justify-end space-x-2">
                    <button @click="cancelNavigation"
                        class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                        Cancel
                    </button>
                    <button @click="discardChanges"
                        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                        Discard Changes
                    </button>
                    <button @click="saveChanges"
                        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <p class="font-bold">Success</p>
            <p>{{ successMessage }}</p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p class="font-bold">Error</p>
            <p>{{ errorMessage }}</p>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePostStore } from '../../stores/postStore';
import logger from '../../services/logging';
import FileUpload from '../shared/FileUpload.vue';
import { useFormValidation } from '../../composables/useFormValidation';
import { sanitizeInput } from '../../utils/sanitize';

const route = useRoute();
const router = useRouter();
const postStore = usePostStore();

const postId = ref(route.params.id);
const description = ref('');
const status = ref('');
const files = ref([]);
const initialFiles = ref([]);
const isLoading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const showEmojiPicker = ref(false);
const showUnsavedChangesModal = ref(false);

const { descriptionError, statusError, fileError, validateDescription, validateStatus, validateFiles } =
    useFormValidation();

const isFormValid = computed(() => {
    const isDescriptionValid = validateDescription(description.value);
    const isStatusValid = validateStatus(status.value);
    return isDescriptionValid && isStatusValid;
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

const initialDescription = ref('');
const initialStatus = ref('');

const hasUnsavedChanges = computed(() => {
    return description.value !== initialDescription.value || status.value !== initialStatus.value || files.value.length !== initialFiles.value.length;
});

const insertEmoji = (emoji) => {
    description.value += emoji;
};

onMounted(async () => {
    try {
        const postData = await postStore.fetchPost(postId.value);
        description.value = postData.described;
        status.value = postData.status;
        initialDescription.value = postData.described;
        initialStatus.value = postData.status;
        initialFiles.value = postData.media.map((url) => ({ url }));
        files.value = [...initialFiles.value];
    } catch (error) {
        logger.error('Failed to load post data', error);
        errorMessage.value = 'Failed to load post data';
    }
});

const handleSubmit = async () => {
    if (!isFormValid.value) {
        errorMessage.value = 'Please fix the errors before submitting.';
        return;
    }

    isLoading.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
        const updatedPostData = {
            described: sanitizeInput(description.value),
            status: status.value,
            files: files.value.filter((file) => file instanceof File),
        };

        const response = await postStore.updatePost(postId.value, updatedPostData);

        if (response.code === '1000') {
            successMessage.value = 'Post updated successfully!';
            logger.info('Post updated successfully', { postId: postId.value });
            router.push({ name: 'PostDetail', params: { id: postId.value } });
        } else {
            errorMessage.value = response.message || 'An error occurred while updating the post';
            logger.warn('Failed to update post', { responseCode: response.code, message: response.message });
        }
    } catch (error) {
        logger.error('Error in handleSubmit', error);
        errorMessage.value = 'Failed to update post';
    } finally {
        isLoading.value = false;
    }
};

const cancelEdit = () => {
    if (hasUnsavedChanges.value) {
        showUnsavedChangesModal.value = true;
    } else {
        router.back();
    }
};

const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges.value) {
        e.preventDefault();
        e.returnValue = '';
    }
};

const handleRouteChange = (to, from, next) => {
    if (hasUnsavedChanges.value) {
        showUnsavedChangesModal.value = true;
        next(false);
    } else {
        next();
    }
};

const saveChanges = async () => {
    await handleSubmit();
    showUnsavedChangesModal.value = false;
};

const discardChanges = () => {
    description.value = initialDescription.value;
    status.value = initialStatus.value;
    files.value = [...initialFiles.value];
    showUnsavedChangesModal.value = false;
    router.back();
};

const cancelNavigation = () => {
    showUnsavedChangesModal.value = false;
};

onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.beforeEach(handleRouteChange);
});

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
});

watch([description, status, files], () => {
    // Perform any necessary actions when form data changes
}, { deep: true });
</script>