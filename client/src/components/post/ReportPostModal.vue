<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeModal"
        @keydown.esc="closeModal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
        <div class="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h2 id="modal-title" class="text-xl font-bold mb-4">Report Post</h2>
            <form @submit.prevent="submitReport" novalidate>
                <div class="mb-4">
                    <label for="reason" class="block text-gray-700 mb-2">Select Reason</label>
                    <select id="reason" v-model="reason"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :aria-invalid="reasonError ? 'true' : 'false'"
                        :aria-describedby="reasonError ? 'reason-error' : undefined">
                        <option disabled value="">Select a reason</option>
                        <option v-for="reasonOption in reasonOptions" :key="reasonOption" :value="reasonOption">
                            {{ getReasonLabel(reasonOption) }}
                        </option>
                    </select>
                    <p v-if="reasonError" id="reason-error" class="text-red-500 text-sm mt-1">{{ reasonError }}</p>
                </div>
                <div v-if="reason === 'Other'" class="mb-4">
                    <label for="details" class="block text-gray-700 mb-2">Details</label>
                    <textarea id="details" v-model="details"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="4" placeholder="Provide additional details..." maxlength="500"
                        :aria-invalid="detailsError ? 'true' : 'false'"
                        :aria-describedby="detailsError ? 'details-error' : undefined"></textarea>
                    <p v-if="detailsError" id="details-error" class="text-red-500 text-sm mt-1">{{ detailsError }}</p>
                    <p class="text-sm text-gray-500 mt-1">{{ remainingCharacters }} characters remaining</p>
                </div>
                <div class="flex justify-end space-x-4">
                    <button type="submit" :disabled="isSubmitting || !isFormValid"
                        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {{ isSubmitting ? 'Submitting...' : 'Submit Report' }}
                        <span v-if="isSubmitting" class="absolute right-3">
                            <LoaderIcon class="animate-spin h-5 w-5" />
                        </span>
                    </button>
                    <button type="button" @click="closeModal"
                        class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../../services/api';
import { sanitizeInput } from '../../utils/sanitize';
import { handleError } from '../../utils/errorHandler';
import { useNotificationStore } from '../../stores/notificationStore';
import { LoaderIcon } from 'lucide-vue-next';

const props = defineProps({
    postId: {
        type: String,
        required: true,
    },
});
const emit = defineEmits(['close', 'report-submitted', 'post-removed']);

const router = useRouter();
const notificationStore = useNotificationStore();

const isSubmitting = ref(false);
const details = ref('');
const reason = ref('');
const reasonError = ref('');
const detailsError = ref('');
const maxDetailsLength = 500;

const reasonOptions = [
    'spam',
    'inappropriateContent',
    'harassment',
    'hateSpeech',
    'violence',
    'other',
];

const remainingCharacters = computed(() => maxDetailsLength - details.value.length);
const isFormValid = computed(() => reason.value && (reason.value !== 'other' || details.value.trim().length > 0));

const getReasonLabel = (reasonOption) => {
    const reasonLabels = {
        spam: 'Spam',
        inappropriateContent: 'Inappropriate Content',
        harassment: 'Harassment',
        hateSpeech: 'Hate Speech',
        violence: 'Violence',
        other: 'Other',
    };
    return reasonLabels[reasonOption] || reasonOption;
};

// Watch for changes and reset errors if needed
watch(reason, (newVal) => {
    console.log(`[DEBUG] Reason changed: ${newVal}`);
    reasonError.value = '';
    if (newVal !== 'other') {
        details.value = '';
        detailsError.value = '';
    }
});

watch(details, (newVal) => {
    console.log(`[DEBUG] Details changed: ${newVal}`);
    detailsError.value = '';
});

// Validate the form before submitting
const validateForm = () => {
    console.log('[DEBUG] Validating form...');
    let isValid = true;
    if (!reason.value) {
        reasonError.value = 'Please select a reason.';
        isValid = false;
    }
    if (reason.value === 'other' && !details.value.trim()) {
        detailsError.value = 'Please provide details.';
        isValid = false;
    }
    console.log(`[DEBUG] Form valid: ${isValid}`);
    return isValid;
};

// Handle report submission
const submitReport = async () => {
    if (!validateForm()) return;
    isSubmitting.value = true;

    try {
        const sanitizedDetails = sanitizeInput(details.value);
        console.log('[DEBUG] Sending API request with:', { postId: props.postId, reason: reason.value });

        await apiService.reportPost(props.postId, reason.value, sanitizedDetails);

        notificationStore.showNotification('Report submitted successfully.', 'success');
        emit('report-submitted');
        closeModal();
    } catch (error) {
        console.error('[ERROR] API call failed:', error);

        const status = error.response?.status;
        const code = error.response?.data?.code;

        if (status === 423 && code === 1010) {
            console.log('[DEBUG] Post is locked. Emitting "post-removed".');
            emit('post-removed');
        } else if (status === 404 && code === 9992) {
            notificationStore.showNotification('Post not found.', 'error');
        } else if (status === 500 && code === 1001) {
            notificationStore.showNotification('Database error occurred.', 'error');
        } else if (error.message === 'Network Error') {
            notificationStore.showNotification('Network Error', 'error');
        }

        // Ensure handleError is always called
        console.log('[DEBUG] Calling handleError with:', error);
        await handleError(error, router);
    } finally {
        isSubmitting.value = false;
    }
};

// Close the modal
const closeModal = () => emit('close');

// Handle escape key press to close modal
const handleEscapeKey = (event) => {
    if (event.key === 'Escape') closeModal();
};

onMounted(() => {
    console.log('[DEBUG] Component mounted.');
    document.addEventListener('keydown', handleEscapeKey);
    document.body.style.overflow = 'hidden';
    nextTick(() => document.querySelector('select, textarea, button')?.focus());
});

onUnmounted(() => {
    console.log('[DEBUG] Component unmounted.');
    document.removeEventListener('keydown', handleEscapeKey);
    document.body.style.overflow = '';
});
</script>