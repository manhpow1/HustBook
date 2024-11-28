<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <ShieldCheckIcon class="w-6 h-6 mr-2 text-indigo-600" />
            Verify Code
        </h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Phone Number Field -->
            <div>
                <label for="phonenumber" class="block text-sm font-medium text-gray-700">Phone Number</label>
                <div class="mt-1 relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <PhoneIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input v-model="phonenumber" type="tel" id="phonenumber" required
                        class="block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        :class="{ 'border-red-500': phoneError }" placeholder="0123456789" @input="validatePhone" />
                </div>
                <p v-if="phoneError" class="mt-2 text-sm text-red-600">{{ phoneError }}</p>
            </div>
            <!-- Verification Code Fields -->
            <div>
                <label class="block text-sm font-medium text-gray-700">Verification Code</label>
                <div class="mt-1 flex justify-between">
                    <input v-for="(digit, index) in codeDigits" :key="index" v-model="codeDigits[index]" type="text"
                        maxlength="1"
                        class="w-12 h-12 text-center text-2xl border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        :class="{ 'border-red-500': codeError }" @input="onCodeInput(index)"
                        @keydown="onCodeKeydown($event, index)" ref="codeInputs" />
                </div>
                <p v-if="codeError" class="mt-2 text-sm text-red-600">{{ codeError }}</p>
            </div>
            <!-- Submit Button -->
            <button type="submit" :disabled="isLoading || !isFormValid"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                {{ isLoading ? "Verifying..." : "Verify Code" }}
            </button>
        </form>
        <!-- Success Message -->
        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md flex items-start">
            <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p class="text-green-700">{{ successMessage }}</p>
        </div>
        <!-- Error Message -->
        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md flex items-start">
            <XCircleIcon class="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p class="text-red-700">{{ errorMessage }}</p>
        </div>
        <!-- Resend Code Button -->
        <div class="mt-4 text-center">
            <button @click="resendCode"
                class="text-sm text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
                :disabled="cooldownTime > 0">
                {{ cooldownTime > 0 ? `Resend code in ${formattedCooldownTime}` : 'Resend code' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { ShieldCheckIcon, PhoneIcon, LoaderIcon, CheckCircleIcon, XCircleIcon } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { useFormValidation } from '../../composables/useFormValidation';

const props = defineProps({
    initialPhoneNumber: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['verification-success', 'verification-error']);

const userStore = useUserStore();
const { isLoading, error, successMessage, cooldownTime } = storeToRefs(userStore);

const phonenumber = ref(props.initialPhoneNumber);
const codeDigits = ref(['', '', '', '', '', '']);
const codeError = ref('');
const codeInputs = ref([]);

const { phoneError, validatePhone } = useFormValidation();

const isFormValid = computed(() => {
    return validatePhone(phonenumber.value) && validateCode();
});

const formattedCooldownTime = computed(() => {
    const minutes = Math.floor(cooldownTime.value / 60);
    const seconds = cooldownTime.value % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

watch(() => props.initialPhoneNumber, (newValue) => {
    phonenumber.value = newValue;
});

onMounted(() => {
    codeInputs.value[0]?.focus();
});

function validateCode() {
    if (codeDigits.value.some((digit) => !/^\d$/.test(digit))) {
        codeError.value = 'Verification code must be 6 digits';
        return false;
    }
    codeError.value = '';
    return true;
}

function onCodeInput(index) {
    if (codeDigits.value[index].length > 1) {
        codeDigits.value[index] = codeDigits.value[index].slice(-1);
    }
    if (index < 5 && codeDigits.value[index]) {
        codeInputs.value[index + 1]?.focus();
    }
}

function onCodeKeydown(event, index) {
    if (event.key === 'Backspace' && index > 0 && !codeDigits.value[index]) {
        codeDigits.value[index - 1] = '';
        codeInputs.value[index - 1]?.focus();
    }
}

const handleSubmit = async () => {
    if (!isFormValid.value) return;

    try {
        const success = await userStore.verifyCode(phonenumber.value, codeDigits.value.join(''));
        if (success) {
            // Handle success (e.g., emit an event)
        }
    } catch (err) {
        // Error is handled in userStore
    }
};

async function resendCode() {
    try {
        await userStore.getVerifyCode(phonenumber.value);
    } catch (err) {
        // Error handling is managed by userStore
    }
}
</script>