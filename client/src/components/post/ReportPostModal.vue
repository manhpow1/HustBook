<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeModal"
        @keydown.esc="closeModal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
        <div class="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h2 id="modal-title" class="text-xl font-bold mb-4">{{ t('reportPost') }}</h2>
            <form @submit.prevent="submitReport" novalidate>
                <div class="mb-4">
                    <label for="reason" class="block text-gray-700 mb-2">{{ t('selectReason') }}</label>
                    <select id="reason" v-model="reason"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :aria-invalid="reasonError ? 'true' : 'false'"
                        :aria-describedby="reasonError ? 'reason-error' : undefined">
                        <option disabled value="">{{ t('selectReasonPlaceholder') }}</option>
                        <option v-for="reasonOption in reasonOptions" :key="reasonOption" :value="reasonOption">
                            {{ t(`reasonOptions.${reasonOption}`) }}
                        </option>
                    </select>
                    <p v-if="reasonError" id="reason-error" class="text-red-500 text-sm mt-1">{{ reasonError }}</p>
                </div>
                <div v-if="reason === 'Other'" class="mb-4">
                    <label for="details" class="block text-gray-700 mb-2">{{ t('details') }}</label>
                    <textarea id="details" v-model="details"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="4" :placeholder="t('provideDetails')" :maxlength="maxDetailsLength"
                        :aria-invalid="detailsError ? 'true' : 'false'"
                        :aria-describedby="detailsError ? 'details-error' : undefined"></textarea>
                    <p v-if="detailsError" id="details-error" class="text-red-500 text-sm mt-1">{{ detailsError }}</p>
                    <p class="text-sm text-gray-500 mt-1">{{ t('charactersRemaining', { count: remainingCharacters }) }}
                    </p>
                </div>
                <div class="flex justify-end space-x-4">
                    <button type="submit" :disabled="isSubmitting || !isFormValid"
                        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {{ isSubmitting ? t('submitting') : t('submitReport') }}
                        <span v-if="isSubmitting" class="absolute right-3">
                            <LoaderIcon class="animate-spin h-5 w-5" />
                        </span>
                    </button>
                    <button type="button" @click="closeModal"
                        class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                        {{ t('cancel') }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import apiService from '../../services/api';
import logger from '../../services/logging';
import { sanitizeInput } from '../../utils/sanitize';
import { handleError } from '../../utils/errorHandler';
import { LoaderIcon } from 'lucide-vue-next';

// Define props and emits
const props = defineProps({
    postId: {
        type: String,
        required: true,
    },
});
const emit = defineEmits(['close', 'report-submitted']);

// Use router
const router = useRouter(); // Declare router once

// Other setup code
const { t } = useI18n();
const reason = ref('');
const details = ref('');
const isSubmitting = ref(false);
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

const isFormValid = computed(() => {
    return reason.value && (reason.value !== 'Other' || details.value.trim().length > 0);
});

watch(reason, () => {
    reasonError.value = '';
    if (reason.value !== 'Other') {
        details.value = '';
        detailsError.value = '';
    }
});

watch(details, () => {
    detailsError.value = '';
});

const validateForm = () => {
    let isValid = true;

    if (!reason.value) {
        reasonError.value = t('pleaseSelectReason');
        isValid = false;
    }

    if (reason.value === 'Other' && !details.value.trim()) {
        detailsError.value = t('pleaseProvideDetails');
        isValid = false;
    }

    return isValid;
};

const submitReport = async () => {
    if (!validateForm()) return;

    isSubmitting.value = true;

    try {
        const sanitizedDetails = sanitizeInput(details.value);

        await apiService.reportPost(props.postId, reason.value, sanitizedDetails);
        notificationStore.showNotification(t('reportSubmittedSuccess'), 'success');
        emit('report-submitted');
        closeModal();
    } catch (error) {
        logger.error('Failed to report post', { postId: props.postId, error });

        const responseCode = error.response?.data?.code;

        if (responseCode === '9992' || responseCode === '1010') {
            // Specific handling for post not found or action already performed
            notificationStore.showNotification(errorMessages[responseCode], 'error');
            emit('post-removed');
            closeModal();
        } else {
            handleError(error, router);
        }
    } finally {
        isSubmitting.value = false;
    }
};


const closeModal = () => {
    emit('close');
};

const handleEscapeKey = (event) => {
    if (event.key === 'Escape') {
        closeModal();
    }
};

const preventBackgroundScroll = () => {
    document.body.style.overflow = 'hidden';
};

const restoreBackgroundScroll = () => {
    document.body.style.overflow = '';
};

onMounted(() => {
    document.addEventListener('keydown', handleEscapeKey);
    preventBackgroundScroll();
    // Focus the first focusable element in the modal
    setTimeout(() => {
        const firstInput = document.querySelector('select, textarea, button');
        if (firstInput) firstInput.focus();
    }, 100);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleEscapeKey);
    restoreBackgroundScroll();
});
</script>