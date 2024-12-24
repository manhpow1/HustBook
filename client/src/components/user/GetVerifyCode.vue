<template>
    <div class="flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
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

            <div v-if="remainingAttempts <= 2 && remainingAttempts > 0" class="rounded-md bg-yellow-50 p-4"
                role="alert">
                <div class="flex">
                    <AlertCircleIcon class="h-5 w-5 text-yellow-400" />
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-yellow-800">Limited Attempts Remaining</h3>
                        <div class="mt-2 text-sm text-yellow-700">
                            <p>{{ remainingAttempts }} verification attempts remaining before temporary lockout</p>
                        </div>
                    </div>
                </div>
            </div>

            <form @submit.prevent="handleSubmit" class="mt-8 space-y-6" novalidate>
                <div class="rounded-md">
                    <div class="relative">
                        <label for="phoneNumber" class="sr-only">Phone Number</label>
                        <div class="flex relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone class="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input v-model="phoneNumber" type="tel" id="phoneNumber" name="phoneNumber" required
                                :disabled="isLoading || isLocked"
                                class="appearance-none rounded-md relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                :class="{ 'border-red-500': phoneNumberError }" placeholder="0123456789"
                                @input="validatePhoneNumber" />
                        </div>
                        <p v-if="phoneNumberError" class="mt-2 text-sm text-red-600" role="alert">
                            {{ phoneNumberError }}
                        </p>
                    </div>
                </div>

                <div>
                    <button type="submit" :disabled="isLoading || isLocked || !isValid"
                        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                            <ShieldCheck class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400"
                                aria-hidden="true" />
                        </span>
                        <Loader v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                            aria-hidden="true" />
                        <span>{{ buttonText }}</span>
                    </button>
                </div>

                <div v-if="cooldown > 0" class="flex justify-center items-center space-x-2 text-sm text-gray-500">
                    <Clock class="h-4 w-4" aria-hidden="true" />
                    <span>Next attempt available in {{ formattedCooldown }}</span>
                </div>

                <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md flex items-center" role="alert">
                    <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2" aria-hidden="true" />
                    <p class="text-green-700">{{ successMessage }}</p>
                </div>

                <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md flex items-center" role="alert">
                    <AlertCircleIcon class="h-5 w-5 text-red-400 mr-2" aria-hidden="true" />
                    <p class="text-red-700">{{ errorMessage }}</p>
                </div>
            </form>

            <div class="text-center">
                <router-link to="/login" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    ← Back to login
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ShieldCheck, Phone, Loader, CheckCircleIcon, AlertCircleIcon, Clock } from 'lucide-vue-next';
import { useUserStore } from '../../stores/userStore';
import { useToast } from '../../composables/useToast';
import { useFormValidation } from '../../composables/useFormValidation';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();
const { showToast } = useToast();
const { validateField } = useFormValidation();

const { isLoading } = storeToRefs(userStore);

const phoneNumber = ref('');
const phoneNumberError = ref('');
const remainingAttempts = ref(5);
const cooldown = ref(0);
const isLocked = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
let cooldownTimer;

const isValid = computed(() => phoneNumber.value && !phoneNumberError.value);

const formattedCooldown = computed(() => {
    const minutes = Math.floor(cooldown.value / 60);
    const seconds = cooldown.value % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const buttonText = computed(() => {
    if (isLoading.value) return 'Sending...';
    if (cooldown.value > 0) return `Resend in ${formattedCooldown.value}`;
    if (isLocked.value) return 'Temporarily Locked';
    return 'Get Verification Code';
});

const validatePhoneNumber = async () => {
    phoneNumberError.value = await validateField('phoneNumber', phoneNumber.value, [
        value => !value && 'Phone number is required',
        value => !/^0\d{9}$/.test(value) && 'Phone number must be 10 digits and start with 0'
    ]);
};

const startCooldown = () => {
    cooldown.value = 60;
    cooldownTimer = setInterval(() => {
        if (cooldown.value > 0) {
            cooldown.value--;
        } else {
            clearInterval(cooldownTimer);
        }
    }, 1000);
};

const handleLockout = () => {
    isLocked.value = true;
    setTimeout(() => {
        isLocked.value = false;
        remainingAttempts.value = 5;
    }, 5 * 60 * 1000);
};

const handleSubmit = async () => {
    if (isLoading.value || cooldown.value > 0 || isLocked.value) return;

    await validatePhoneNumber();
    if (phoneNumberError.value) return;

    try {
        const success = await userStore.getVerifyCode(phoneNumber.value);
        if (success) {
            successMessage.value = 'Verification code sent successfully!';
            errorMessage.value = '';
            startCooldown();
            showToast('Verification code sent', 'success');
        } else {
            remainingAttempts.value--;
            if (remainingAttempts.value <= 0) {
                handleLockout();
            }
            errorMessage.value = 'Failed to send verification code';
            successMessage.value = '';
            showToast('Failed to send code', 'error');
        }
    } catch (error) {
        errorMessage.value = error.message || 'An error occurred';
        successMessage.value = '';
        showToast(error.message, 'error');
    }
};
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

button:focus,
input:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
</style>