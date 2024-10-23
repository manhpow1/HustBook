<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <ShieldCheckIcon class="w-6 h-6 mr-2 text-indigo-600" />
            Get Verification Code
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
            <button type="submit" :disabled="isButtonDisabled"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                {{ buttonText }}
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
        <div v-if="cooldownTime > 0" class="mt-4 text-sm text-gray-500 flex items-center justify-center">
            <ClockIcon class="h-4 w-4 mr-1" aria-hidden="true" />
            Resend available in {{ formattedCooldownTime }}
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ShieldCheckIcon, PhoneIcon, LoaderIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-vue-next'
import { useAuthStore } from '../../stores/authStore'
import { storeToRefs } from 'pinia'
import apiService from '../../services/api'

const authStore = useAuthStore()
const { isLoading, errorMessage, successMessage, cooldownTime } = storeToRefs(authStore)

const phonenumber = ref('')
const phoneError = ref('')
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const cooldownTime = ref(0)

const isButtonDisabled = computed(() => isLoading.value || cooldownTime.value > 0)

const buttonText = computed(() => {
    if (isLoading.value) return 'Sending...'
    if (cooldownTime.value > 0) return `Resend in ${cooldownTime.value}s`
    return 'Get Verification Code'
})

const formattedCooldownTime = computed(() => {
    const minutes = Math.floor(cooldownTime.value / 60)
    const seconds = cooldownTime.value % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const validatePhone = () => {
    if (!phonenumber.value) {
        phoneError.value = 'Phone number is required'
        return false
    }
    if (!/^0\d{9}$/.test(phonenumber.value)) {
        phoneError.value = 'Invalid phone number format'
        return false
    }
    phoneError.value = ''
    return true
}

const handleSubmit = async () => {
    phoneError.value = ''
    errorMessage.value = ''
    successMessage.value = ''

    if (!validatePhone()) return

    await authStore.getVerifyCode(phonenumber.value)

    if (cooldownTime.value > 0) {
        errorMessage.value = `Please wait ${cooldownTime.value} seconds before requesting a new code.`
        return
    }

    isLoading.value = true
    try {
        const response = await apiService.post(API_ENDPOINTS.GET_VERIFY_CODE, { phonenumber: phonenumber.value })

        if (response.data.code === '1000') {
            successMessage.value = `Verification code sent successfully. (Code: ${response.data.data.verifyCode})`
            startCooldown()
        } else {
            errorMessage.value = response.data.message || 'Unknown error occurred'
        }
    } catch (error) {
        console.error('Error getting verification code:', error)
        if (error.response && error.response.data) {
            errorMessage.value = error.response.data.message || 'Server error occurred'
        } else if (error.request) {
            errorMessage.value = 'Unable to connect to the server'
        } else {
            errorMessage.value = 'An unexpected error occurred. Please try again.'
        }
    } finally {
        isLoading.value = false
    }
}

const startCooldown = () => {
    cooldownTime.value = 120
    const timer = setInterval(() => {
        cooldownTime.value--
        if (cooldownTime.value <= 0) {
            clearInterval(timer)
            cooldownTime.value = 0
        }
    }, 1000)
}
</script>