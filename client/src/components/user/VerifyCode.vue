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
                                :disabled="isFormDisabled" aria-describedby="phone-error"
                                class="appearance-none rounded-md relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                :class="{ 'border-red-500': formErrors.phone }" placeholder="0123456789"
                                :aria-invalid="!!formErrors.phone"
                                :aria-errormessage="formErrors.phone ? 'phone-error' : undefined" />
                        </div>
                        <transition name="fade">
                            <p v-if="formErrors.phone" id="phone-error" class="mt-2 text-sm text-red-600" role="alert">
                                {{ formErrors.phone }}
                            </p>
                        </transition>
                    </div>
                </div>

                <!-- Verification Code Fields -->
                <div class="space-y-2">
                    <label for="verification-code" class="block text-sm font-medium text-gray-700">
                        Verification Code
                    </label>
                    <div class="flex justify-between gap-2">
                        <template v-for="(digit, index) in codeDigits" :key="index">
                            <input v-model="codeDigits[index]" type="text" inputmode="numeric" pattern="[0-9]"
                                maxlength="1" :disabled="isFormDisabled" @input="onCodeInput(index)"
                                @keydown="onCodeKeydown($event, index)" @paste="onCodePaste($event)" ref="codeInputs"
                                :id="`code-digit-${index}`" :name="`code-digit-${index}`"
                                :aria-label="`Verification code digit ${index + 1}`"
                                :aria-describedby="formErrors.code ? 'code-error' : undefined"
                                :aria-invalid="!!formErrors.code"
                                class="w-12 h-12 text-center text-2xl border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                :class="{ 'border-red-500': formErrors.code }" />
                        </template>
                    </div>
                    <transition name="fade">
                        <p v-if="formErrors.code" id="code-error" class="mt-2 text-sm text-red-600" role="alert">
                            {{ formErrors.code }}
                        </p>
                    </transition>
                </div>

                <!-- Submit Button -->
                <div><button type="submit" :disabled="isFormDisabled"
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
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ShieldCheck, AlertCircleIcon, CheckCircleIcon, Clock, Phone, Loader } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useToast } from '../../composables/useToast';

const router = useRouter();
const userStore = useUserStore();
const { showToast } = useToast();

const phoneNumber = ref('');
const codeDigits = ref(Array(6).fill(''));
const codeInputs = ref([]);
const isLoading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const cooldownTime = ref(0);
const attemptsRemaining = ref(3);
const formErrors = ref({
    phone: '',
    code: ''
});

// Computed properties
const isFormDisabled = computed(() => isLoading.value);
const buttonText = computed(() => isLoading.value ? 'Verifying...' : 'Verify Account');
const formattedCooldownTime = computed(() => {
    const minutes = Math.floor(cooldownTime.value / 60);
    const seconds = cooldownTime.value % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Methods
const validatePhoneNumber = () => {
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneNumber.value) {
        formErrors.value.phone = 'Phone number is required';
    } else if (!phoneRegex.test(phoneNumber.value)) {
        formErrors.value.phone = 'Please enter a valid 10-digit phone number';
    } else {
        formErrors.value.phone = '';
    }
};

const onCodeInput = (index) => {
    const value = codeDigits.value[index];
    if (value.length > 1) {
        codeDigits.value[index] = value.slice(0, 1);
    }
    if (value && index < codeDigits.value.length - 1) {
        codeInputs.value[index + 1]?.focus();
    }
    validateCode();
};

const onCodeKeydown = (event, index) => {
    if (event.key === 'Backspace' && !codeDigits.value[index] && index > 0) {
        codeInputs.value[index - 1]?.focus();
    }
};

const onCodePaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text');
    const numbers = pastedData.replace(/\D/g, '').split('').slice(0, 6);
    numbers.forEach((num, index) => {
        if (index < codeDigits.value.length) {
            codeDigits.value[index] = num;
        }
    });
    validateCode();
};

const validateCode = () => {
    const code = codeDigits.value.join('');
    if (!code) {
        formErrors.value.code = 'Verification code is required';
    } else if (code.length !== 6) {
        formErrors.value.code = 'Please enter all 6 digits';
    } else if (!/^\d{6}$/.test(code)) {
        formErrors.value.code = 'Code must contain only numbers';
    } else {
        formErrors.value.code = '';
    }
};

const handleSubmit = async () => {
    validatePhoneNumber();
    validateCode();

    if (formErrors.value.phone || formErrors.value.code) {
        return;
    }

    try {
        isLoading.value = true;
        errorMessage.value = '';

        const code = codeDigits.value.join('');
        await userStore.verifyCode(phoneNumber.value, code);
        successMessage.value = 'Phone number verified successfully!';
        setTimeout(() => {
            router.push('/complete-profile');
        }, 2000);
    } catch (error) {
        errorMessage.value = error.message || 'Failed to verify code. Please try again.';
        attemptsRemaining.value--;

        if (attemptsRemaining.value <= 0) {
            startCooldown();
        }
    } finally {
        isLoading.value = false;
    }
};

const startCooldown = () => {
    cooldownTime.value = 300; // 5 minutes
    const timer = setInterval(() => {
        if (cooldownTime.value > 0) {
            cooldownTime.value--;
        } else {
            clearInterval(timer);
            attemptsRemaining.value = 3;
        }
    }, 1000);
};

const resendCode = async () => {
    try {
        isLoading.value = true;
        errorMessage.value = '';

        await userStore.resendVerificationCode(phoneNumber.value);
        showToast('Verification code resent successfully', 'success');
        startCooldown();
    } catch (error) {
        errorMessage.value = error.message || 'Failed to resend code. Please try again.';
    } finally {
        isLoading.value = false;
    }
};

// Watch for success/error messages
watch([successMessage, errorMessage], ([newSuccess, newError]) => {
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