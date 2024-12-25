<template>
    <div class="max-w-md mx-auto mt-8 bg-white shadow-md rounded-lg p-6 space-y-6">
        <div class="text-center">
            <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK Logo" />
            <h2 class="mt-6 text-3xl font-extrabold text-gray-900 flex items-center justify-center">
                <ShieldCheck class="w-8 h-8 mr-2 text-indigo-600" aria-hidden="true" />
                Get Verification Code
            </h2>
            <p class="mt-2 text-sm text-gray-600">
                Please enter your phone number to receive a verification code.
            </p>
        </div>

        <!-- Error and Warning Alerts -->
        <div v-if="verificationAttempts >= 3" class="bg-red-100 text-red-700 p-4 rounded-md mt-4">
            Too many attempts. Please try again later.
        </div>

        <div v-else-if="verificationAttempts > 0" class="bg-yellow-100 text-yellow-700 p-4 rounded-md mt-4">
            {{ 5 - verificationAttempts }} verification attempts remaining.
        </div>

        <!-- Input Form -->
        <form @submit.prevent="handleSubmit" class="mt-8 space-y-6" novalidate>
            <div class="space-y-1">
                <label for="phoneNumber" class="block text-sm font-medium text-gray-700">Phone Number</label>
                <input v-model="phoneNumber" id="phoneNumber" type="tel" name="phoneNumber"
                    placeholder="Enter your phone number" :class="[
                        'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                        { 'border-red-500': errors.phoneNumber },
                        { 'border-gray-300': !errors.phoneNumber }
                    ]" :disabled="isLoading || cooldownRemaining > 0" required />
                <p v-if="errors.phoneNumber" class="text-red-500 text-xs mt-1">{{ errors.phoneNumber[0] }}</p>
            </div>

            <!-- Submit Button -->
            <button type="submit" :disabled="isLoading || cooldownRemaining > 0" :class="[
                'w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                { 'opacity-50 cursor-not-allowed': isLoading || cooldownRemaining > 0 }
            ]">
                <ShieldCheck class="h-5 w-5 mr-2" aria-hidden="true" />
                <span v-if="cooldownRemaining > 0">
                    Resend code in {{ cooldownRemaining }}s
                </span>
                <span v-else>Get Verification Code</span>
            </button>
        </form>

        <!-- Verification Code Display -->
        <div v-if="verificationCode" class="mt-6 space-y-4">
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-medium text-gray-900">{{ verificationCode }}</span>
                    <button @click="copyToClipboard" class="text-indigo-600 hover:text-indigo-500 focus:outline-none">
                        <Copy v-if="!copied" class="h-5 w-5" />
                        <Check v-else class="h-5 w-5 text-green-500" />
                    </button>
                </div>
            </div>
            <button @click="proceedToVerification"
                class="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <ArrowRight class="h-5 w-5 mr-2" />
                Proceed to Verification
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { ShieldCheck, Copy, Check, ArrowRight } from 'lucide-vue-next';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useFormValidation } from '../../composables/useFormValidation';
import { storeToRefs } from 'pinia';
import { useToast } from '../../composables/useToast';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { showToast } = useToast();
const { errors, validatePhoneNumber, clearErrors } = useFormValidation();
const { cooldownRemaining, isLoading, verificationAttempts } = storeToRefs(userStore);

const phoneNumber = ref(route.query.phoneNumber || '');
const verificationCode = ref('');
const copied = ref(false);

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(verificationCode.value);
        copied.value = true;
        showToast('Code copied to clipboard', 'success');
        setTimeout(() => {
            copied.value = false;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy code', 'error');
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

    // Validate phone number
    if (!validatePhoneNumber(phoneNumber.value)) {
        return;
    }

    // Request verification code
    try {
        const response = await userStore.getVerifyCode(phoneNumber.value);
        verificationCode.value = response.code;
        showToast('Verification code sent successfully', 'success');
    } catch (error) {
        console.error('Error requesting verification code:', error);
        showToast(error.message || 'Failed to get verification code', 'error');
    }
};
</script>
