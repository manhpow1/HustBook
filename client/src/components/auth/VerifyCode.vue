<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <ShieldCheckIcon class="w-6 h-6 mr-2 text-indigo-600" aria-hidden="true" />
            Verify Code
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

            <!-- Verification Code Fields -->
            <div>
                <label class="block text-sm font-medium text-gray-700">Verification Code</label>
                <div class="mt-1 flex justify-between">
                    <input v-for="(digit, index) in codeDigits" :key="index" v-model="codeDigits[index]" type="text"
                        maxlength="1" inputmode="numeric" pattern="[0-9]"
                        class="w-12 h-12 text-center text-2xl border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        :class="{ 'border-red-500': codeError }" @input="onCodeInput(index)"
                        @keydown="onCodeKeydown($event, index)" ref="codeInputs" aria-label="Verification Code Digit" />
                </div>
                <p v-if="codeError" class="mt-2 text-sm text-red-600">
                    {{ codeError }}
                </p>
            </div>

            <!-- Submit Button -->
            <button type="submit" :disabled="isLoading || !isFormValid"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                :aria-disabled="isLoading || !isFormValid">
                <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                {{ isLoading ? "Verifying..." : "Verify Code" }}
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
            <div>
                <p class="text-red-700">{{ errorMessage }}</p>
                <div v-if="errorMessage.includes('File upload failed')" class="mt-2 flex space-x-2">
                    <button @click="continueWithoutAvatar" class="bg-blue-500 text-white px-4 py-2 rounded text-sm">
                        Continue without avatar
                    </button>
                    <button @click="retryUpload" class="bg-green-500 text-white px-4 py-2 rounded text-sm">
                        Try again
                    </button>
                </div>
            </div>
        </div>

        <!-- Resend Code Button -->
        <div class="mt-4 text-center">
            <button @click="resendCode"
                class="text-sm text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
                :disabled="cooldownTime > 0" aria-disabled="cooldownTime > 0">
                {{ cooldownTime > 0 ? `Resend code in ${formattedCooldownTime}` : 'Resend code' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { ShieldCheckIcon, PhoneIcon, LoaderIcon, CheckCircleIcon, XCircleIcon } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { useFormValidation } from '../../composables/useFormValidation';
import { useToast } from '../../composables/useToast';
import { useErrorHandler } from '../../composables/useErrorHandler';

const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

const phonenumber = ref('');
const codeDigits = ref(['', '', '', '', '', '']);
const codeError = ref('');
const codeInputs = ref([]);
const { phoneError, validatePhone } = useFormValidation();

// Get reactive references from the store
const { isLoading, error, successMessage, cooldownTime } = storeToRefs(userStore);

const errorMessage = computed(() => userStore.error || '');

// Computed property to validate the form
const isFormValid = computed(() => {
    return validatePhone(phonenumber.value) && validateCode();
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
        const success = await userStore.verifyCode(phonenumber.value, codeDigits.value.join(''));
        if (success) {
            showToast('Verification successful!', 'success');
            emit('verification-success');
        } else {
            showToast(userStore.error || 'Verification failed. Please try again.', 'error');
            emit('verification-error', userStore.error);
        }
    } catch (err) {
        handleError(err);
        showToast('An unexpected error occurred. Please try again.', 'error');
        emit('verification-error', 'An unexpected error occurred.');
    }
};

// Handle code input
const onCodeInput = (index) => {
    if (codeDigits.value[index].length > 1) {
        codeDigits.value[index] = codeDigits.value[index].slice(-1);
    }
    if (index < 5 && codeDigits.value[index]) {
        codeInputs.value[index + 1]?.focus();
    }
};

// Handle keydown for backspacing
const onCodeKeydown = (event, index) => {
    if (event.key === 'Backspace' && index > 0 && !codeDigits.value[index]) {
        codeDigits.value[index - 1] = '';
        codeInputs.value[index - 1]?.focus();
    }
};

// Validate the verification code
const validateCode = () => {
    if (codeDigits.value.some((digit) => !/^\d$/.test(digit))) {
        codeError.value = 'Verification code must be 6 digits';
        return false;
    }
    codeError.value = '';
    return true;
};

// Resend verification code
const resendCode = async () => {
    if (cooldownTime.value > 0) return;

    try {
        const success = await userStore.getVerifyCode(phonenumber.value);
        if (success) {
            showToast('Verification code resent successfully!', 'success');
        } else {
            showToast(userStore.error || 'Failed to resend verification code.', 'error');
        }
    } catch (err) {
        handleError(err);
        showToast('An unexpected error occurred. Please try again.', 'error');
    }
};

// Continue without avatar (if applicable)
const continueWithoutAvatar = () => {
    // Implement logic to proceed without avatar if needed
    showToast('Continuing without avatar.', 'info');
    // Example: Proceed to complete profile or next step
};

// Retry upload (if applicable)
const retryUpload = () => {
    // Implement logic to retry upload if needed
    showToast('Retrying upload...', 'info');
    // Example: Re-initiate upload process
};

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