<template>
    <div class="max-w-md mx-auto mt-8 bg-white shadow-md rounded-lg p-6">
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
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { ShieldCheck } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useFormValidation } from '../../composables/useFormValidation';
import { storeToRefs } from 'pinia';

const router = useRouter();
const userStore = useUserStore();
const { errors, validatePhoneNumber, clearErrors } = useFormValidation();
const { cooldownRemaining, isLoading, verificationAttempts } = storeToRefs(userStore);

const phoneNumber = ref('');

const handleSubmit = async () => {
    clearErrors();

    // Validate phone number
    if (!validatePhoneNumber(phoneNumber.value)) {
        return;
    }

    // Request verification code
    try {
        await userStore.getVerifyCode(phoneNumber.value);
        router.push({
            name: 'VerifyCode',
            query: { phoneNumber: phoneNumber.value }
        });
    } catch (error) {
        console.error('Error requesting verification code:', error);
    }
};
</script>
