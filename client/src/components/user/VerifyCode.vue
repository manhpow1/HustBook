<template>
    <div class="max-w-md mx-auto mt-8 bg-white shadow-md rounded-lg p-6">
        <div class="text-center">
            <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK Logo" />
            <h2 class="mt-6 text-3xl font-extrabold text-gray-900 flex items-center justify-center">
                <ShieldCheck class="w-8 h-8 mr-2 text-indigo-600" aria-hidden="true" />
                Verify Your Account
            </h2>
            <p class="mt-2 text-sm text-gray-600">
                Please enter the verification code
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
                <label for="code" class="block text-sm font-medium text-gray-700">Verification Code</label>
                <input v-model="code" id="code" type="text" name="code" placeholder="Enter verification code" :class="[ 
                    'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500', 
                    { 'border-red-500': errors.code }, 
                    { 'border-gray-300': !errors.code } 
                ]" :disabled="isLoading" required />
                <p v-if="errors.code" class="text-red-500 text-xs mt-1">{{ errors.code[0] }}</p>
            </div>

            <!-- Submit and Resend Buttons -->
            <div class="space-y-4">
                <button type="submit" :disabled="isLoading" :class="[ 
                    'w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500', 
                    { 'opacity-50 cursor-not-allowed': isLoading } 
                ]">
                    <ShieldCheck class="h-5 w-5 mr-2" aria-hidden="true" />
                    Verify Code
                </button>

                <button type="button" @click="handleResendCode" :disabled="isLoading || cooldownRemaining > 0"
                    class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <RefreshCw class="h-5 w-5 mr-2" aria-hidden="true" />
                    <span v-if="cooldownRemaining > 0">
                        Resend code in {{ cooldownRemaining }}s
                    </span>
                    <span v-else>Resend Code</span>
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ShieldCheck, RefreshCw } from 'lucide-vue-next';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useFormValidation } from '../../composables/useFormValidation';
import { storeToRefs } from 'pinia';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { errors, validateVerificationCode, clearErrors } = useFormValidation();
const { cooldownRemaining, isLoading, verificationAttempts } = storeToRefs(userStore);

const code = ref('');
const phoneNumber = ref(route.query.phoneNumber || '');

const handleSubmit = async () => {
    clearErrors();

    // Validate verification code
    if (!validateVerificationCode(code.value)) {
        return;
    }

    try {
        const success = await userStore.verifyCode(phoneNumber.value, code.value);
        if (success) {
            router.push({ name: 'ChangeInfoAfterSignUp' });
        }
    } catch (error) {
        console.error('Error verifying code:', error);
    }
};

const handleResendCode = async () => {
    try {
        await userStore.getVerifyCode(phoneNumber.value);
        code.value = ''; // Clear the input field
    } catch (error) {
        console.error('Error resending code:', error);
    }
};

onMounted(() => {
    if (!phoneNumber.value) {
        router.push('/get-verify-code');
    }
});
</script>
