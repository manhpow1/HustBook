<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
      <div>
        <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Welcome back</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <router-link to="/signup"
            class="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
            create a new account
          </router-link>
        </p>
      </div>
      <form @submit.prevent="handleSubmit" class="mt-8 space-y-6">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="phonenumber" class="sr-only">Phone Number</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <PhoneIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input v-model.trim="phonenumber" id="phonenumber" name="phonenumber" type="tel" autocomplete="tel"
                required autofocus @input="validatePhoneRealTime"
                class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm transition-colors duration-200"
                :class="{ 'border-red-500': phoneError, 'border-green-500': phonenumber && !phoneError }"
                placeholder="Phone number" :aria-describedby="phoneError ? 'phone-error' : undefined" />
            </div>
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input v-model.trim="password" id="password" :type="showPassword ? 'text' : 'password'" name="password"
                autocomplete="current-password" required @input="validatePasswordRealTime"
                class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm transition-colors duration-200"
                :class="{ 'border-red-500': passwordError, 'border-green-500': password && !passwordError }"
                placeholder="Password" :aria-describedby="passwordError ? 'password-error' : undefined" />
              <button type="button" @click="togglePasswordVisibility"
                class="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none"
                :aria-label="showPassword ? 'Hide password' : 'Show password'">
                <EyeIcon v-if="showPassword"
                  class="h-5 w-5 text-gray-400 hover:text-gray-500 transition-colors duration-200" />
                <EyeOffIcon v-else class="h-5 w-5 text-gray-400 hover:text-gray-500 transition-colors duration-200" />
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input v-model="rememberMe" id="remember-me" name="remember-me" type="checkbox"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors duration-200" />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div class="text-sm">
            <router-link to="/forgot-password"
              class="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
              Forgot your password?
            </router-link>
          </div>
        </div>

        <div>
          <button type="submit" :disabled="userStore.loading || !isFormValid || isRateLimited"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <LockIcon class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
            </span>
            <span v-if="userStore.loading" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg>
              Signing in...
            </span>
            <span v-else-if="isRateLimited">
              Try again in {{ rateLimitRemaining }}s
            </span>
            <span v-else>Sign in</span>
          </button>
        </div>
      </form>

      <!-- Success message -->
      <div v-if="loginSuccess" class="mt-4 p-4 bg-green-100 rounded-md" aria-live="polite">
        <p class="text-green-700 flex items-center">
          <CheckCircleIcon class="h-5 w-5 mr-2" />
          Login successful! Redirecting...
        </p>
      </div>

      <!-- Error message -->
      <div v-if="userStore.error" class="mt-4 p-4 bg-red-100 rounded-md" aria-live="polite">
        <p class="text-red-700 flex items-center">
          <AlertCircleIcon class="h-5 w-5 mr-2" />
          {{ userStore.error }}
        </p>
        <button v-if="canRetry" @click="handleSubmit"
          class="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
          Retry
        </button>
      </div>

      <!-- Field-specific error messages -->
      <p v-if="phoneError" id="phone-error" class="mt-2 text-sm text-red-600">{{ phoneError }}</p>
      <p v-if="passwordError" id="password-error" class="mt-2 text-sm text-red-600">{{ passwordError }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import { useFormValidation } from '../../composables/useFormValidation'
import { useRateLimiter } from '../../composables/useRateLimiter'
import { PhoneIcon, LockIcon, CheckCircleIcon, AlertCircleIcon, EyeIcon, EyeOffIcon } from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()

const phonenumber = ref("")
const password = ref("")
const rememberMe = ref(false)
const showPassword = ref(false)
const canRetry = ref(false)
const loginSuccess = ref(false)

const { phoneError, passwordError, validatePhone, validatePassword } = useFormValidation()

const isFormValid = computed(() => {
  return phonenumber.value && password.value && !phoneError.value && !passwordError.value
})

const { isRateLimited, rateLimitRemaining, incrementAttempts } = useRateLimiter(5, 60000) // 5 attempts per minute

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const validatePhoneRealTime = () => {
  validatePhone(phonenumber.value)
}

const validatePasswordRealTime = () => {
  validatePassword(password.value)
}

const handleSubmit = async () => {
  if (isRateLimited.value) return

  incrementAttempts()

  if (validatePhone(phonenumber.value) && validatePassword(password.value)) {
    canRetry.value = false
    const success = await userStore.login(phonenumber.value, password.value)
    if (success) {
      loginSuccess.value = true
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } else {
      canRetry.value = true
    }
  }
}

// Keyboard accessibility
const handleKeyDown = (event) => {
  if (event.key === 'Enter' && isFormValid.value && !userStore.loading && !isRateLimited.value) {
    handleSubmit()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.bg-gradient-to-r {
  background-size: 200% 200%;
  animation: gradient 15s ease infinite;
}
</style>