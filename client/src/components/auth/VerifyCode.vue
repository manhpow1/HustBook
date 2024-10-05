<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <ShieldCheckIcon class="w-6 h-6 mr-2 text-indigo-600" />
            Verify Code
        </h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
                <label for="phonenumber" class="block text-sm font-medium text-gray-700">Phone Number</label>
                <div class="mt-1 relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <PhoneIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input v-model="phonenumber" type="tel" id="phonenumber" required
                        class="block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        :class="{ 'border-red-500': phoneError }" placeholder="0123456789" />
                </div>
                <p v-if="phoneError" class="mt-2 text-sm text-red-600">{{ phoneError }}</p>
            </div>
            <div>
                <label for="verification-code" class="block text-sm font-medium text-gray-700">Verification Code</label>
                <input type="text" id="verification-code" class="sr-only" :value="codeDigits.join('')"
                    @paste="handlePaste" aria-hidden="true" />
                <div class="mt-1 flex justify-between">
                    <input v-for="(digit, index) in codeDigits" :key="index" v-model="codeDigits[index]" type="text"
                        :id="`code-${index}`" :aria-label="`Digit ${index + 1} of verification code`" maxlength="1"
                        class="w-12 h-12 text-center text-2xl border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        :class="{ 'border-red-500': codeError }" @input="onCodeInput(index)"
                        @keydown="onCodeKeydown($event, index)" ref="codeInputs" />
                </div>
                <p v-if="codeError" class="mt-2 text-sm text-red-600">{{ codeError }}</p>
            </div>
            <button type="submit" :disabled="isLoading || !isFormValid"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                {{ isLoading ? "Verifying..." : "Verify Code" }}
            </button>
        </form>
        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md flex items-start">
            <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p class="text-green-700">{{ successMessage }}</p>
        </div>
        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md flex items-start">
            <XCircleIcon class="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p class="text-red-700">{{ errorMessage }}</p>
        </div>
        <div class="mt-4 text-center">
            <button @click="resendCode"
                class="text-sm text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
                :disabled="resendCooldown > 0">
                {{ resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { ShieldCheckIcon, PhoneIcon, LoaderIcon, CheckCircleIcon, XCircleIcon } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'

const props = defineProps({
    initialPhoneNumber: {
        type: String,
        default: ''
    }
})

const emit = defineEmits(['verification-success', 'verification-error'])
const authStore = useAuthStore()
const { isLoading, errorMessage, successMessage, resendCooldown } = storeToRefs(authStore)

const phonenumber = ref(props.initialPhoneNumber)
const codeDigits = ref(['', '', '', '', '', ''])
const phoneError = ref('')
const codeError = ref('')
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const resendCooldown = ref(0)
const codeInputs = ref([])

const isFormValid = computed(() => {
    return /^0\d{9}$/.test(phonenumber.value) && codeDigits.value.every(digit => /^\d$/.test(digit))
})

watch(() => props.initialPhoneNumber, (newValue) => {
    phonenumber.value = newValue
})

onMounted(() => {
    codeInputs.value[0]?.focus()
})

const validatePhone = () => {
    if (!/^0\d{9}$/.test(phonenumber.value)) {
        phoneError.value = 'Invalid phone number format'
        return false
    }
    phoneError.value = ''
    return true
}

const validateCode = () => {
    if (codeDigits.value.some(digit => !/^\d$/.test(digit))) {
        codeError.value = 'Verification code must be 6 digits'
        return false
    }
    codeError.value = ''
    return true
}

const onCodeInput = (index) => {
    if (index < 5 && codeDigits.value[index]) {
        codeInputs.value[index + 1]?.focus()
    }
}

const onCodeKeydown = (event, index) => {
    if (event.key === 'Backspace' && index > 0 && !codeDigits.value[index]) {
        codeDigits.value[index - 1] = ''
        codeInputs.value[index - 1]?.focus()
    }
}

const handlePaste = (event) => {
    event.preventDefault()
    const pastedText = event.clipboardData.getData('text')
    const digits = pastedText.replace(/\D/g, '').slice(0, 6).split('')
    codeDigits.value = [...digits, ...Array(6 - digits.length).fill('')]
    codeInputs.value[digits.length]?.focus()
}

const handleSubmit = async () => {
    errorMessage.value = ''
    successMessage.value = ''
    phoneError.value = ''
    codeError.value = ''

    if (!validatePhone() || !validateCode()) return

    isLoading.value = true

    try {
        await authStore.verifyCode(phonenumber.value, codeDigits.value.join(''))
        emit('verification-success', authStore.token, authStore.deviceToken)
    } catch (error) {
        emit('verification-error', authStore.errorMessage)
    }
}

const handleErrorResponse = (data) => {
    switch (data.code) {
        case '9995':
            errorMessage.value = 'User is not validated'
            break
        case '9996':
            errorMessage.value = 'User already verified'
            break
        case '1004':
            errorMessage.value = 'Invalid verification code'
            break
        case '1002':
            errorMessage.value = 'Missing required parameters'
            break
        default:
            errorMessage.value = data.message || 'An error occurred'
    }
}

const resendCode = async () => {
    authStore.resendVerificationCode(phonenumber.value)
}

const startResendCooldown = () => {
    resendCooldown.value = 60
    const timer = setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0) {
            clearInterval(timer)
        }
    }, 1000)
}
</script>