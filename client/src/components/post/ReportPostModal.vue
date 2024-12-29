<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeModal"
        role="dialog" aria-labelledby="report-post-title" aria-modal="true" data-testid="report-post-modal">
        <div class="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h2 id="report-post-title" class="text-xl font-bold mb-4">Report Post</h2>
            <form @submit.prevent="submitReport" novalidate>
                <!-- Reason Selection -->
                <div class="mb-4">
                    <label for="reason" class="block text-gray-700 mb-2">Select Reason</label>
                    <select id="reason" v-model="reason"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :aria-invalid="reasonError ? 'true' : 'false'"
                        :aria-describedby="reasonError ? 'reason-error' : undefined" data-testid="report-reason-select">
                        <option disabled value="">Select a reason</option>
                        <option v-for="reasonOption in reasonOptions" :key="reasonOption" :value="reasonOption">
                            {{ getReasonLabel(reasonOption) }}
                        </option>
                    </select>
                    <p v-if="reasonError" id="reason-error" class="text-red-500 text-sm mt-1">
                        {{ reasonError }}
                    </p>
                </div>

                <!-- Additional Details for 'Other' Reason -->
                <div v-if="reason === 'Other'" class="mb-4">
                    <label for="details" class="block text-gray-700 mb-2">Details</label>
                    <textarea id="details" v-model="details"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="4" placeholder="Provide additional details..." maxlength="500"
                        :aria-invalid="detailsError ? 'true' : 'false'"
                        :aria-describedby="detailsError ? 'details-error' : undefined"
                        data-testid="report-details-textarea"></textarea>
                    <p v-if="detailsError" id="details-error" class="text-red-500 text-sm mt-1">
                        {{ detailsError }}
                    </p>
                    <p class="text-sm text-gray-500 mt-1">
                        {{ remainingCharacters }} characters remaining
                    </p>
                </div>

                <!-- Form Buttons -->
                <div class="flex justify-end space-x-4">
                    <button type="submit" :disabled="isSubmitting || !isFormValid"
                        class="relative px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Submit Report" data-testid="submit-report-button">
                        <span v-if="isSubmitting" class="flex items-center">
                            <LoaderIcon class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                            Submitting...
                        </span>
                        <span v-else>Submit Report</span>
                    </button>
                    <button type="button" @click="closeModal"
                        class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        aria-label="Cancel Report" data-testid="cancel-report-button">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { LoaderIcon } from 'lucide-vue-next';
import { useFormValidation } from '../../composables/useFormValidation';
import { useApi } from '../../composables/useAPI';
import { useToast } from '../ui/toast';
import { sanitizeInput } from '../../utils/sanitize';

// Define component props
const props = defineProps({
    postId: {
        type: String,
        required: true,
    },
});

// Define component emits
const emit = defineEmits(['close', 'report-submitted', 'post-removed']);

// Composables and utilities
const { validateField, validators } = useFormValidation();
const { request } = useApi(submitSuccess);
const { toast } = useToast();

// Reactive state for form fields
const reason = ref('');
const details = ref('');

// Reactive state for errors
const reasonError = ref('');
const detailsError = ref('');

// Reason options
const reasonOptions = [
    'spam',
    'inappropriateContent',
    'harassment',
    'hateSpeech',
    'violence',
    'other',
];

// Computed property for remaining characters
const maxDetailsLength = 500;
const remainingCharacters = computed(() => maxDetailsLength - details.value.length);

// Computed property to determine form validity
const isFormValid = computed(() => {
    if (!reason.value) return false;
    if (reason.value === 'other' && !details.value.trim()) return false;
    return true;
});

// Method to get reason labels
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

// Watchers for form fields to validate in real-time
watch(reason, (newVal) => {
    validateField('reason', newVal, validators.status);
    if (newVal !== 'other') {
        details.value = '';
        detailsError.value = '';
    }
});

watch(details, (newVal) => {
    if (reason.value === 'other') {
        validateField('details', newVal, validators.comment);
    }
});

// Function to handle successful report submission
function submitSuccess(responseData) {
    toast({ type: 'success', message: 'Report submitted successfully!' });
    emit('report-submitted');
    closeModal();
}

// Function to submit the report
const submitReport = async () => {
    // Validate form fields
    const isReasonValid = await validateField('reason', reason.value, validators.status);
    let isDetailsValid = true;
    if (reason.value === 'other') {
        isDetailsValid = await validateField('details', details.value, validators.comment);
    }

    if (!isReasonValid || !isDetailsValid) {
        return;
    }

    // Prepare sanitized inputs
    const sanitizedDetails = sanitizeInput(details.value);

    // Make API request to report the post
    await request({
        method: 'POST',
        url: `/api/posts/${props.postId}/report`,
        data: {
            reason: reason.value,
            details: sanitizedDetails,
        },
    });
};

// Method to close the modal
const closeModal = () => {
    emit('close');
};

// Handle escape key press to close modal
const handleEscapeKey = (event) => {
    if (event.key === 'Escape') closeModal();
};

// Focus on the first input when modal is opened
onMounted(() => {
    document.addEventListener('keydown', handleEscapeKey);
    nextTick(() => document.getElementById('reason')?.focus());
});

// Cleanup event listeners on unmount
onUnmounted(() => {
    document.removeEventListener('keydown', handleEscapeKey);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

button:disabled {
    pointer-events: none;
}

textarea:focus,
select:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.6);
}
</style>