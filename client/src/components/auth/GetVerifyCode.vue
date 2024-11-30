<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <ShieldCheckIcon class="w-6 h-6 mr-2 text-indigo-600" aria-hidden="true" />
            Get Verification Code
        </h2>
        <form @submit.prevent="handleSubmit" class="space-y-4" novalidate>
            <!-- Phone Number Field -->
            <div>
                <label for="phonenumber" class="block text-sm font-medium text-gray-700">Phone Number</label>
                <div class="mt-1 relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <PhoneIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input v-model="phonenumber" type="tel" id="phonenumber" name="phonenumber" required
                        aria-describedby="phonenumber-error" @input="validatePhone"
                        class="block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        :class="{ 'border-red-500': phoneError }" placeholder="0123456789" />
                </div>
                <p v-if="phoneError" id="phonenumber-error" class="mt-2 text-sm text-red-600">
                    {{ phoneError }}
                </p>
            </div>

            <!-- Submit Button -->
            <button type="submit" :disabled="isButtonDisabled"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                :aria-disabled="isButtonDisabled">
                <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                {{ buttonText }}
            </button>
        </form>

        <!-- Success Message -->
        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md flex items-start" role="alert">
            <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p class="text-green-700">{{ successMessage }}</p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md flex items-start" role="alert">
            <XCircleIcon class="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p class="text-red-700">{{ errorMessage }}</p>
        </div>

        <!-- Cooldown Timer -->
        <div v-if="cooldownTime > 0" class="mt-4 text-sm text-gray-500 flex items-center justify-center"
            aria-live="polite">
            <ClockIcon class="h-4 w-4 mr-1" aria-hidden="true" />
            Resend available in {{ formattedCooldownTime }}
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ShieldCheckIcon, PhoneIcon, LoaderIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-vue-next';
import { useUserStore } from '../../stores/userStore';
import { useFormValidation } from '../../composables/useFormValidation';
import { useToast } from '../../composables/useToast';
import { useErrorHandler } from '../../composables/useErrorHandler';

const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

const phonenumber = ref('');
const { phoneError, validatePhone } = useFormValidation();

// Get reactive references from the store
const { isLoading, error, successMessage, cooldownTime } = storeToRefs(userStore);

const errorMessage = computed(() => userStore.error || '');
const isButtonDisabled = computed(() => isLoading.value || cooldownTime.value > 0 || !phonenumber.value || phoneError.value);

// Computed property for the button text based on state
const buttonText = computed(() => {
    if (isLoading.value) return 'Sending...';
    if (cooldownTime.value > 0) return `Resend in ${formattedCooldownTime.value}`;
    return 'Get Verification Code';
});

// Computed property to format the cooldown time as mm:ss
const formattedCooldownTime = computed(() => {
    const minutes = Math.floor(cooldownTime.value / 60);
    const seconds = cooldownTime.value % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Handle form submission
const handleSubmit = async () => {
    if (!isFormValid.value) {
        showToast('Please fix the errors before submitting.', 'error');
        return;
    }

    try {
        const success = await userStore.getVerifyCode(phonenumber.value);
        if (success) {
            showToast('Verification code sent successfully!', 'success');
        } else {
            showToast(userStore.error || 'Failed to send verification code.', 'error');
        }
    } catch (err) {
        handleError(err);
        showToast('An unexpected error occurred. Please try again.', 'error');
    }
};

// Computed property to validate the form
const isFormValid = computed(() => {
    return !phoneError.value && phonenumber.value;
});

// Watch for changes in success and error messages to display toasts
watch([successMessage, error], ([newSuccess, newError]) => {
    if (newSuccess) {
        showToast(newSuccess, 'success');
    }
    if (newError) {
        showToast(newError, 'error');
    }
});
</script>

<style scoped>
/* Ensure accessibility for focus states */
button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    /* Focus ring color */
}
</style>