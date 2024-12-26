<template>
    <div class="min-h-screen max-w-md mx-auto mt-8 bg-white shadow-md rounded-lg p-6">
        <div class="text-center">
            <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK Logo" />
            <h2 class="mt-6 text-3xl font-extrabold text-gray-900 flex items-center justify-center">
                <ShieldCheck class="w-8 h-8 mr-2 text-indigo-600" aria-hidden="true" />
                Get Verification Code
            </h2>
            <p class="mt-2 text-sm text-gray-600">
                Please enter your phone number to receive the verification code.
            </p>
        </div>

        <!-- Lockout Warning -->
        <div v-if="isLocked" class="bg-red-100 text-red-700 p-4 rounded-md mt-4">
            Temporarily locked due to too many attempts. Please try again after 5 minutes.
        </div>

        <form @submit.prevent="handleSubmit" class="mt-8 space-y-6" novalidate>
            <div class="space-y-1">
                <label for="phoneNumber" class="block text-sm font-medium text-gray-700">Phone Number</label>
                <div class="relative">
                    <input v-model="phoneNumber" id="phoneNumber" type="tel" name="phoneNumber"
                        placeholder="Enter your phone number" :class="[
                            'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                            { 'border-red-500': errors.phoneNumber },
                            { 'border-gray-300': !errors.phoneNumber }
                        ]" :disabled="isLoading || cooldownRemaining > 0" @input="handlePhoneNumberInput" required />
                    <div v-if="phoneNumber" class="absolute right-2 top-2">
                        <XCircle v-if="errors.phoneNumber" class="h-5 w-5 text-red-500" @click="phoneNumber = ''" />
                        <CheckCircle v-else-if="isValidPhone" class="h-5 w-5 text-green-500" />
                    </div>
                </div>
                <p v-if="errors.phoneNumber" class="text-red-500 text-xs mt-1">{{ errors.phoneNumber[0] }}</p>
            </div>

            <div class="space-y-4">
                <button type="submit" :disabled="isLoading || !isValidPhone || cooldownRemaining > 0" :class="[
                    'w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white',
                    isLoading || !isValidPhone || cooldownRemaining > 0
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                ]">
                    <Loader2 v-if="isLoading" class="h-5 w-5 mr-2 animate-spin" />
                    <ShieldCheck v-else class="h-5 w-5 mr-2" />
                    <span v-if="cooldownRemaining > 0">
                        Resend code in {{ cooldownRemaining }}s
                    </span>
                    <span v-else>
                        Get Verification Code
                    </span>
                </button>
            </div>
        </form>

        <!-- Verification Code Display -->
        <div v-if="verificationCode" class="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div class="flex justify-between items-start">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <CheckCircleIcon class="h-5 w-5 text-green-400" />
                    </div>
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-green-800">Verification Code</h3>
                        <div class="mt-2 text-sm text-green-700">
                            <p>Your verification code is: <span class="font-bold">{{ verificationCode }}</span></p>
                        </div>
                    </div>
                </div>
                <button @click="copyToClipboard"
                    class="ml-4 flex items-center text-sm text-blue-600 hover:text-blue-800">
                    <CopyIcon v-if="!copied" class="h-5 w-5 mr-1" />
                    <CheckIcon v-else class="h-5 w-5 mr-1 text-green-500" />
                    {{ copied ? 'Copied!' : 'Copy' }}
                </button>
            </div>

            <!-- Actions Buttons -->
            <div class="mt-4 space-y-2">
                <!-- Copy & Continue Button -->
                <button @click="copyAndProceed"
                    class="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <ArrowRightIcon class="h-5 w-5 mr-2" />
                    Copy & Continue to Verification
                </button>

                <!-- Skip Copy Button -->
                <button @click="proceedToVerification"
                    class="w-full flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <ArrowRightIcon class="h-5 w-5 mr-2" />
                    Skip Copy and Continue
                </button>
            </div>
        </div>

        <!-- Status Messages -->
        <div v-if="successMessage" class="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div class="flex">
                <CheckCircleIcon class="h-5 w-5 text-green-400" />
                <p class="ml-3 text-sm text-green-700">{{ successMessage }}</p>
            </div>
        </div>

        <div v-if="error" class="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div class="flex">
                <XCircleIcon class="h-5 w-5 text-red-400" />
                <p class="ml-3 text-sm text-red-700">{{ error }}</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ShieldCheck, CheckCircleIcon, XCircleIcon, CopyIcon, CheckIcon, ArrowRightIcon, Loader2, CheckCircle, XCircle } from 'lucide-vue-next';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useFormValidation } from '../../composables/useFormValidation';
import { useToast } from '../../composables/useToast';
import { storeToRefs } from 'pinia';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { showToast } = useToast();
const { errors, validatePhoneNumber, clearErrors } = useFormValidation();
const { cooldownRemaining, isLoading, isLocked } = storeToRefs(userStore);

const phoneNumber = ref(route.query.phoneNumber || '');
const verificationCode = ref('');
const successMessage = ref('');
const error = ref('');
const copied = ref(false);

const isValidPhone = computed(() => {
    return /^0\d{9}$/.test(phoneNumber.value);
});

const handlePhoneNumberInput = () => {
    phoneNumber.value = phoneNumber.value.replace(/\D/g, '').slice(0, 10);
    if (phoneNumber.value && phoneNumber.value[0] !== '0') {
        phoneNumber.value = '0' + phoneNumber.value;
    }
    clearErrors();
};

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(verificationCode.value);
        copied.value = true;
        showToast('success', 'Verification code copied');
        setTimeout(() => {
            copied.value = false;
        }, 2000);
        return true;
    } catch (err) {
        showToast('error', 'Unable to copy verification code');
        return false;
    }
};

const copyAndProceed = async () => {
    const copySuccess = await copyToClipboard();
    if (copySuccess) {
        setTimeout(() => {
            proceedToVerification();
        }, 500);
    }
};

const proceedToVerification = () => {
    router.push({
        name: 'VerifyCode',
        query: { phoneNumber: phoneNumber.value }
    });
};

const handleSubmit = async () => {
    clearErrors();
    if (!validatePhoneNumber(phoneNumber.value)) {
        return;
    }

    if (isLocked.value) {
        showToast('error', 'Account temporarily locked. Please try again later.');
        return;
    }

    try {
        const result = await userStore.getVerifyCode(phoneNumber.value);
        if (result.success) {
            successMessage.value = 'Verification code sent successfully!';
            if (result.verifyCode) {
                verificationCode.value = result.verifyCode;
            }
        } else {
            error.value = 'Unable to send verification code';
        }
    } catch (err) {
        error.value = err.message || 'An error occurred';
    }
};

// Watch for lock status
watch(() => isLocked.value, (newValue) => {
    if (newValue) {
        error.value = 'Temporarily locked due to too many attempts. Please try again after 5 minutes.';
    } else {
        error.value = '';
    }
});
</script>