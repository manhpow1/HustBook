<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <img class="mx-auto h-12 w-auto" src="../assets/logo.svg" alt="HUSTBOOK" />
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ currentStep === 'signup' ? 'Create your account' : 'Verify your account' }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
            sign in to your existing account
          </router-link>
        </p>
      </div>

      <div v-if="currentStep === 'signup'">
        <form @submit.prevent="handleSignup" class="mt-8 space-y-6">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="phonenumber" class="sr-only">Phone Number</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PhoneIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input v-model="phonenumber" id="phonenumber" name="phonenumber" type="tel" required
                  class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  :class="{ 'border-red-500': phoneError }" placeholder="Phone number" />
              </div>
            </div>
            <div>
              <label for="password" class="sr-only">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input v-model="password" id="password" name="password" type="password" required
                  class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  :class="{ 'border-red-500': passwordError }" placeholder="Password" />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input v-model="rememberMe" id="remember-me" name="remember-me" type="checkbox"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
              <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
          </div>

          <div>
            <button type="submit" :disabled="isLoading"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                <LockIcon class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
              </span>
              {{ isLoading ? "Signing up..." : "Sign Up" }}
            </button>
          </div>
        </form>

        <div class="mt-4">
          <p v-if="phoneError" class="text-sm text-red-600">
            {{ phoneError }}
          </p>
          <p v-if="passwordError" class="text-sm text-red-600">
            {{ passwordError }}
          </p>
        </div>

        <div v-if="password" class="mt-4">
          <p class="text-sm font-medium text-gray-700">Password strength:</p>
          <div class="mt-1 h-2 w-full bg-gray-200 rounded-full">
            <div class="h-full rounded-full transition-all duration-300" :class="passwordStrengthClass"
              :style="{ width: `${passwordStrength}%` }"></div>
          </div>
        </div>
      </div>

      <div v-else-if="currentStep === 'verify'">
        <VerifyCode :initialPhoneNumber="phonenumber" @verification-success="handleVerificationSuccess"
          @verification-error="handleVerificationError" />
      </div>

      <div v-else-if="currentStep === 'complete'">
        <div class="rounded-md bg-green-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <CheckCircleIcon class="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">
                Account created and verified successfully
              </h3>
              <div class="mt-2 text-sm text-green-700">
                <p>You can now proceed to complete your profile.</p>
              </div>
            </div>
          </div>
        </div>
        <button @click="proceedToCompleteProfile"
          class="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Complete Profile
        </button>
      </div>

      <div v-if="error" class="mt-4 rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <XCircleIcon class="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">
              Error
            </h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserState } from '../store/user-state'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'
import { PhoneIcon, LockIcon, CheckCircleIcon, XCircleIcon } from 'lucide-vue-next'
import VerifyCode from './VerifyCode.vue'

const emit = defineEmits(['signup-success', 'signup-error'])

const router = useRouter()
const { login } = useUserState()

const currentStep = ref('signup')
const phonenumber = ref('')
const password = ref('')
const phoneError = ref('')
const passwordError = ref('')
const isLoading = ref(false)
const rememberMe = ref(false)
const error = ref('')

const passwordStrength = computed(() => {
  if (password.value.length === 0) return 0
  let strength = 0
  // Check length
  if (password.value.length >= 6 && password.value.length <= 10) {
    strength += 25
  } else {
    return password.value.length > 10 ? 50 : 25
  }
  // Check for alphanumeric characters only
  if (!/[^a-zA-Z0-9]/.test(password.value)) strength += 25
  // Check if password doesn't match phone number
  if (password.value !== phonenumber.value) strength += 25
  // Check for uppercase letters
  if (/[A-Z]/.test(password.value)) strength += 12.5
  // Check for numbers
  if (/[0-9]/.test(password.value)) strength += 12.5
  return Math.min(Math.round(strength), 100)
})

const passwordStrengthClass = computed(() => {
  if (passwordStrength.value <= 25) return 'bg-red-500'
  if (passwordStrength.value <= 50) return 'bg-yellow-500'
  if (passwordStrength.value <= 75) return 'bg-orange-500'
  return 'bg-green-500'
})

const validatePhone = () => {
  if (!/^0\d{9}$/.test(phonenumber.value)) {
    phoneError.value = "Invalid phone number format"
    return false
  }
  phoneError.value = ""
  return true
}

const validatePassword = () => {
  if (!password.value) {
    passwordError.value = "Password is required"
    console.log("Password is required")
    return false
  }

  let errors = []
  if (password.value.length < 6 || password.value.length > 10) {
    errors.push("be 6-10 characters long")
  }
  if (/[^a-zA-Z0-9]/.test(password.value)) {
    errors.push("contain only letters and numbers")
  }
  if (password.value === phonenumber.value) {
    errors.push("not match the phone number")
  }

  if (errors.length > 0) {
    passwordError.value = `Password must ${errors.join(', and ')}`
    console.log(`Password must ${errors.join(', and ')}`)
    return false
  }

  passwordError.value = ""
  return true
}

const handleSignup = async () => {
  phoneError.value = ""
  passwordError.value = ""
  error.value = ""

  console.log("Handling signup")
  const isPhoneValid = validatePhone()
  const isPasswordValid = validatePassword()
  if (!isPhoneValid || !isPasswordValid) {
    console.log("Validation failed", { phoneError: phoneError.value, passwordError: passwordError.value })
    return
  }

  isLoading.value = true

  try {
    const response = await axios.post(API_ENDPOINTS.SIGNUP, {
      phonenumber: phonenumber.value,
      password: password.value,
      uuid: "device-uuid",
      rememberMe: rememberMe.value
    })

    if (response.data.code === "1000") {
      currentStep.value = 'verify'
      emit('signup-success', response.data.data.verificationCode)
    } else {
      error.value = response.data.message || "An error occurred during signup"
      emit('signup-error', error.value)
    }
  } catch (err) {
    console.error("Error occurred:", err)
    error.value = err.response?.data?.message || "An unexpected error occurred. Please try again."
    emit('signup-error', error.value)
  } finally {
    isLoading.value = false
  }
}

const handleVerificationSuccess = (token, deviceToken) => {
  console.log("Verification successful. Token:", token);
  console.log("Device Token:", deviceToken);

  if (token && deviceToken) {
    login(token, deviceToken); // Make sure to pass both token and deviceToken
    currentStep.value = 'complete';
    error.value = '';
  } else {
    console.error("Token or deviceToken is missing");
    error.value = "Authentication failed. Please try again.";
  }
}

const handleVerificationError = (errorMessage) => {
  error.value = errorMessage
}

const proceedToCompleteProfile = () => {
  console.log("Attempting to navigate to complete profile");
  console.log("Current token:", localStorage.getItem('token'));
  console.log("Current device token:", localStorage.getItem('deviceToken'));
  router.push('/complete-profile');
}
</script>