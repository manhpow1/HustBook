<template>
    <div class="flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <!-- Header -->
            <div>
                <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 flex items-center justify-center">
                    <ShieldCheck class="w-8 h-8 mr-2 text-indigo-600" aria-hidden="true" />
                    Get Verification Code
                </h2>
                <p class="mt-2 text-center text-sm text-gray-600">
                    We'll send a verification code to your phone
                </p>
            </div>

            <!-- Rate Limit Warning -->
            <div v-if="attemptsRemaining <= 2 && attemptsRemaining > 0" class="rounded-md bg-yellow-50 p-4"
                role="alert">
                <div class="flex">
                    <AlertCircleIcon class="h-5 w-5 text-yellow-400" />
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-yellow-800">
                            Limited Attempts Remaining
                        </h3>
                        <div class="mt-2 text-sm text-yellow-700">
                            <p>{{ attemptsRemaining }} verification attempts remaining before temporary lockout</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleSubmit" class="mt-8 space-y-6" novalidate>
                <div class="rounded-md shadow-sm">
                    <!-- Phone Number Field -->
                    <div class="relative">
                        <label for="phoneNumber" class="sr-only">Phone Number</label>
                        <div class="flex relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone class="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input v-model="phoneNumber" type="tel" id="phoneNumber" name="phoneNumber" required
                                :disabled="isFormDisabled"
                                class="appearance-none rounded-md relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                :class="{ 'border-red-500': formErrors.phone }" placeholder="0123456789" />
                        </div>
                        <transition name="fade">
                            <p v-if="formErrors.phone" class="mt-2 text-sm text-red-600" role="alert">
                                {{ formErrors.phone }}
                            </p>
                        </transition>
                    </div>
                </div>

                <!-- Submit Button -->
                <div>
                    <button type="submit" :disabled="isFormDisabled"
                        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        :aria-busy="isLoading">
                        <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                            <ShieldCheck class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400"
                                aria-hidden="true" />
                        </span>
                        <Loader v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                            aria-hidden="true" />
                        <span>{{ buttonText }}</span>
                    </button>
                </div>

                <!-- Cooldown Timer -->
                <div v-if="cooldownTime > 0" class="flex justify-center items-center space-x-2 text-sm text-gray-500"
                    role="timer" aria-live="polite">
                    <Clock class="h-4 w-4" aria-hidden="true" />
                    <span>Next attempt available in {{ formattedCooldownTime }}</span>
                </div>

                <!-- Success Message -->
                <transition name="fade">
                    <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md flex items-center" role="alert">
                        <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2" aria-hidden="true" />
                        <p class="text-green-700">{{ successMessage }}</p>
                    </div>
                </transition>

                <!-- Error Message -->
                <transition name="fade">
                    <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md flex items-center" role="alert">
                        <AlertCircleIcon class="h-5 w-5 text-red-400 mr-2" aria-hidden="true" />
                        <p class="text-red-700">{{ errorMessage }}</p>
                    </div>
                </transition>
            </form>

            <!-- Back Button -->
            <div class="text-center">
                <router-link to="/login" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    ← Back to login
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { ShieldCheck, Phone, Loader, CheckCircleIcon, AlertCircleIcon, Clock } from 'lucide-vue-next';
import { useUserStore } from '../../stores/userStore';
import { useToast } from '../../composables/useToast';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { useAuthForm } from '../../composables/useAuthForm';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

// Form state and validation
const {
    state,
    validation,
    isFormValid,
    formattedCooldownTime,
    handleSubmit: authSubmit
} = useAuthForm('verify');

// Ensure validation fields are initialized
if (!validation.fields.value) {
    validation.fields.value = { phoneNumber: '' };
}

const phoneNumber = computed({
    get: () => validation.fields.value.phoneNumber || '',
    set: (value) => {
        validation.fields.value.phoneNumber = value;
        validation.validatePhoneNumber(value);
    }
});

// Store refs and computed
const { isLoading, error, successMessage } = storeToRefs(userStore);

const errorMessage = computed(() => error.value || '');
const isFormDisabled = computed(() => isLoading.value || !isFormValid.value);
const attemptsRemaining = computed(() => state.attemptsRemaining);
const cooldownTime = computed(() => state.cooldownTime);

const buttonText = computed(() => {
    if (isLoading.value) return 'Sending...';
    if (cooldownTime.value > 0) return `Resend in ${formattedCooldownTime.value}`;
    return 'Get Verification Code';
});

const formErrors = computed(() => ({
    phone: validation.errors.value?.phone || error.value
}));

// Form submission
const handleSubmit = async () => {
    if (!isFormValid.value || cooldownTime.value > 0) {
        return;
    }

    try {
        const success = await authSubmit();
        if (success) {
            showToast('Verification code sent successfully!', 'success');
        } else {
            showToast(error.value || 'Failed to send verification code.', 'error');
        }
    } catch (err) {
        handleError(err);
        showToast('An unexpected error occurred. Please try again.', 'error');
    }
};

// Watch for store state changes
watch([successMessage, error], ([newSuccess, newError]) => {
    if (newSuccess) showToast(newSuccess, 'success');
    if (newError) showToast(newError, 'error');
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

button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

input:disabled,
button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
</style>
