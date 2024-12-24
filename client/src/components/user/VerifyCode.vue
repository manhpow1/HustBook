<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <!-- Header -->
            <div>
                <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 flex items-center justify-center">
                    <ShieldCheck class="w-8 h-8 mr-2 text-indigo-600" aria-hidden="true" />
                    Verify Your Account
                </h2>
                <p class="mt-2 text-center text-sm text-gray-600">
                    Please enter the verification code sent to your phone
                </p>
            </div>

            <!-- Verification Attempts Warning -->
            <div v-if="attemptsRemaining <= 2 && attemptsRemaining > 0" class="rounded-md bg-yellow-50 p-4"
                role="alert">
                <div class="flex">
                    <AlertCircleIcon class="h-5 w-5 text-yellow-400" />
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-yellow-800">
                            Limited Attempts Remaining
                        </h3>
                        <div class="mt-2 text-sm text-yellow-700">
                            <p>{{ attemptsRemaining }} verification attempts remaining before timeout</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleSubmit" class="mt-8 space-y-6" novalidate>
                <!-- Phone Number Field -->
                <div class="rounded-md shadow-sm">
                    <div class="relative">
                        <label for="phoneNumber" class="sr-only">Phone Number</label>
                        <div class="flex relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone class="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input v-model="phoneNumber" type="tel" id="phoneNumber" name="phoneNumber" required
                                :disabled="isFormDisabled" @input="validatePhoneNumber"
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

                <!-- Verification Code Fields -->
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700">
                        Verification Code
                    </label>
                    <div class="flex justify-between gap-2">
                        <template v-for="(digit, index) in codeDigits" :key="index">
                            <input v-model="codeDigits[index]" type="text" inputmode="numeric" pattern="[0-9]"
                                maxlength="1" :disabled="isFormDisabled" @input="onCodeInput(index)"
                                @keydown="onCodeKeydown($event, index)" @paste="onCodePaste($event)" ref="codeInputs"
                                :aria-label="`Verification code digit ${index + 1}`"
                                class="w-12 h-12 text-center text-2xl border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                :class="{ 'border-red-500': formErrors.code }" />
                        </template>
                    </div>
                    <transition name="fade">
                        <p v-if="formErrors.code" class="mt-2 text-sm text-red-600" role="alert">
                            {{ formErrors.code }}
                        </p>
                    </transition>
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

                <!-- Resend Code Section -->
                <div class="text-center space-y-4">
                    <div v-if="cooldownTime > 0"
                        class="flex justify-center items-center space-x-2 text-sm text-gray-500" role="timer"
                        aria-live="polite">
                        <Clock class="h-4 w-4" aria-hidden="true" />
                        <span>Request new code in {{ formattedCooldownTime }}</span>
                    </div>
                    <button v-else type="button" @click="resendCode"
                        class="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
                        :disabled="isLoading">
                        Resend verification code
                    </button>
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
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { ShieldCheck, Phone, Loader, CheckCircleIcon, AlertCircleIcon, Clock } from 'lucide-vue-next';
import { useToast } from '../../composables/useToast';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { storeToRefs } from 'pinia';

const router = useRouter();
const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

// Form state
const phoneNumber = ref('');
const attemptsRemaining = ref(3);
const codeDigits = ref(['', '', '', '', '', '']);
const codeInputs = ref([]);

// Store state
const { isLoading, error, successMessage, cooldownTime } = storeToRefs(userStore);

// Validation
const validationErrors = ref({
    phone: '',
    code: ''
});

const validatePhoneNumber = () => {
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneNumber.value) {
        validationErrors.value.phone = 'Phone number is required';
    } else if (!phoneRegex.test(phoneNumber.value)) {
        validationErrors.value.phone = 'Invalid phone number format';
    } else {
        validationErrors.value.phone = '';
    }
};

const isValidForm = computed(() => {
    return phoneNumber.value && !validationErrors.value.phone;
});

// Computed properties
const errorMessage = computed(() => error.value || '');

const isFormDisabled = computed(() => {
    return isLoading.value || cooldownTime.value > 0 || !isValidForm.value;
});

const buttonText = computed(() => {
    if (isLoading.value) return 'Verifying...';
    return 'Verify Code';
});

const formattedCooldownTime = computed(() => {
    const minutes = Math.floor(cooldownTime.value / 60);
    const seconds = cooldownTime.value % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const formErrors = computed(() => ({
    phone: validationErrors.value.phone || error.value,
    code: validationErrors.value.code,
}));

// Code input handlers
const onCodeInput = (index) => {
    const val = codeDigits.value[index];
    if (!val) return;

    if (!/^\d$/.test(val)) {
        codeDigits.value[index] = '';
        return;
    }

    if (index < 5) {
        codeInputs.value[index + 1]?.focus();
    }
};

const onCodeKeydown = (event, index) => {
    if (event.key === 'Backspace') {
        if (!codeDigits.value[index] && index > 0) {
            codeDigits.value[index - 1] = '';
            codeInputs.value[index - 1]?.focus();
        }
    }
    else if (event.key === 'ArrowLeft' && index > 0) {
        codeInputs.value[index - 1]?.focus();
    }
    else if (event.key === 'ArrowRight' && index < 5) {
        codeInputs.value[index + 1]?.focus();
    }
};

const onCodePaste = (event) => {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const numbers = pastedText.replace(/\D/g, '').split('').slice(0, 6);

    numbers.forEach((num, index) => {
        if (index < 6) {
            codeDigits.value[index] = num;
        }
    });

    const lastIndex = Math.min(numbers.length - 1, 5);
    codeInputs.value[lastIndex]?.focus();
};

const resetAttempts = () => {
    attemptsRemaining.value = 3;
};

const clearForm = () => {
    phoneNumber.value = '';
    codeDigits.value = ['', '', '', '', '', ''];
    validationErrors.value = { phone: '', code: '' };
};

// Form submission
const handleSubmit = async () => {
    const code = codeDigits.value.join('');
    if (!isValidForm.value || code.length !== 6) {
        showToast('Please fill in all fields correctly', 'error');
        return;
    }

    try {
        const success = await userStore.verifyCode(phoneNumber.value, code);
        if (success) {
            resetAttempts();
            clearForm();
            showToast('Verification successful!', 'success');
            setTimeout(() => {
                router.push('/home');
            }, 1500);
        } else {
            showToast(error.value || 'Verification failed. Please try again.', 'error');
        }
    } catch (err) {
        handleError(err);
        showToast('An unexpected error occurred. Please try again.', 'error');
    }
};

// Resend code
const resendCode = async () => {
    if (cooldownTime.value > 0) return;

    try {
        const success = await userStore.getVerifyCode(phoneNumber.value);
        if (success) {
            codeDigits.value = ['', '', '', '', '', ''];
            codeInputs.value[0]?.focus();
            showToast('Verification code resent successfully!', 'success');
        } else {
            showToast(error.value || 'Failed to resend code.', 'error');
        }
    } catch (err) {
        handleError(err);
        showToast('An unexpected error occurred. Please try again.', 'error');
    }
};

onMounted(() => {
    codeInputs.value[0]?.focus();
});

// Watch for success/error messages
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

input[type="text"] {
    caret-color: theme('colors.indigo.600');
}

button:focus,
input:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

input:disabled,
button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
</style>