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

        <!-- Lockout Warning -->
        <div v-if="isLocked" class="bg-red-100 text-red-700 p-4 rounded-md mt-4">
            <XCircleIcon class="h-5 w-5 inline mr-2" />
            Temporarily locked due to too many incorrect attempts
            <br />Please try again after 5 minutes
        </div>

        <!-- Remaining Attempts Warning -->
        <div v-else-if="remainingAttempts < 5" class="bg-yellow-100 text-yellow-700 p-4 rounded-md mt-4">
            <AlertTriangle class="h-5 w-5 inline mr-2" />
            {{ remainingAttempts }} attempts remaining
        </div>

        <!-- Verification Code Form -->
        <form @submit.prevent="handleSubmit" class="mt-8 space-y-6" novalidate>
            <div>
                <label class="block text-sm font-medium text-gray-700">
                    Verification Code
                </label>
                <div class="mt-1 flex justify-between gap-2">
                    <input v-for="(digit, index) in 6" :key="index" v-model="codeDigits[index]" type="text"
                        maxlength="1"
                        class="w-12 h-12 text-center border-2 rounded-lg text-lg font-semibold focus:border-blue-500 focus:ring-blue-500"
                        :class="{
                            'border-red-500': verifyCodeError,
                            'border-gray-300': !verifyCodeError
                        }" @input="handleDigitInput($event, index)" @keydown="handleKeyDown($event, index)"
                        @paste="handlePaste" ref="digitInputs" />
                </div>
                <p v-if="verifyCodeError" class="mt-2 text-sm text-red-600">
                    {{ verifyCodeError }}
                </p>
            </div>

            <!-- Submit Button -->
            <div class="space-y-4">
                <button v-if="!verificationSuccess" type="submit" :disabled="!isCodeComplete || isLoading"
                    class="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Loader2 v-if="isLoading" class="animate-spin h-5 w-5 mr-2" />
                    <span>Verify Code</span>
                </button>

                <router-link v-if="verificationSuccess" :to="{ name: 'CompleteProfile', query: { phoneNumber } }"
                    class="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                    <UserPlus class="h-5 w-5 mr-2" />
                    <span>Complete Your Profile</span>
                </router-link>

                <!-- Resend Code Button -->
                <button type="button" @click="handleResendCode" :disabled="cooldownRemaining > 0 || isLoading"
                    class="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    <RefreshCw v-if="!cooldownRemaining" class="h-5 w-5 mr-2" />
                    <span v-if="cooldownRemaining > 0">
                        Resend code in {{ cooldownRemaining }}s
                    </span>
                    <span v-else>Resend Code</span>
                </button>
            </div>
        </form>

        <!-- Back Button -->
        <div class="mt-4">
            <button @click="goBack"
                class="w-full flex justify-center items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft class="h-4 w-4 mr-2" />
                Go back
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ShieldCheck, RefreshCw, Loader2, XCircleIcon, AlertTriangle, ArrowLeft, UserPlus } from 'lucide-vue-next';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { storeToRefs } from 'pinia';
import { useToast } from '../ui/toast';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const toast = useToast();
const { isLoading, cooldownRemaining, isLocked, remainingAttempts, verifyCodeError, isVerifyCodeExpired } = storeToRefs(userStore);

const phoneNumber = ref(route.query.phoneNumber);
const codeDigits = ref(Array(6).fill(''));
const digitInputs = ref([]);
const verificationSuccess = ref(false);

const isCodeComplete = computed(() => {
    return codeDigits.value.every(digit => digit !== '');
});

const handleDigitInput = (event, index) => {
    const input = event.target;
    const value = input.value;

    if (!/^\d*$/.test(value)) {
        input.value = '';
        return;
    }

    codeDigits.value[index] = value;

    if (value !== '' && index < 5) {
        digitInputs.value[index + 1].focus();
    }
};

const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !codeDigits.value[index] && index > 0) {
        codeDigits.value[index - 1] = '';
        digitInputs.value[index - 1].focus();
    }
};

const handlePaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text');
    const numbers = pastedData.replace(/\D/g, '').slice(0, 6);

    numbers.split('').forEach((number, index) => {
        if (index < 6) {
            codeDigits.value[index] = number;
        }
    });
};

const handleSubmit = async () => {
    if (!isCodeComplete.value || isLoading.value) return;

    const verifyCode = codeDigits.value.join('');
    const result = await userStore.verifyCode(phoneNumber.value, verifyCode);

    if (result.success) {
        verificationSuccess.value = true;
        if (result.exists) {
            const token = result.token;
            if (token) {
                localStorage.setItem('user', JSON.stringify({ isVerified: true }));
                Cookies.set('accessToken', token, { expires: 1 / 96 });
            }
        }
    } else if (isVerifyCodeExpired.value) {
        codeDigits.value = Array(6).fill('');
        digitInputs.value[0]?.focus();
    }
};


const handleResendCode = async () => {
    const response = await userStore.getVerifyCode(phoneNumber.value);
    if (response.success) {
        toast('success', 'New verification code sent successfully');
        codeDigits.value = Array(6).fill('');
        digitInputs.value[0]?.focus();
    } else {
        toast('error', 'Failed to send new verification code');
    }
};

const goBack = () => {
    router.push({
        name: 'GetVerifyCode',
        query: { phoneNumber: phoneNumber.value }
    });
};

onMounted(() => {
    if (!phoneNumber.value) {
        router.push('/get-verify-code');
        return;
    }
    digitInputs.value[0]?.focus();
});

watch(isVerifyCodeExpired, (newValue) => {
    if (newValue) {
        codeDigits.value = Array(6).fill('');
    }
});
</script>
