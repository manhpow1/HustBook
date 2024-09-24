<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <img class="mx-auto h-12 w-auto" src="../assets/logo.svg" alt="HUSTBOOK" />
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <router-link to="/signup" class="font-medium text-indigo-600 hover:text-indigo-500">
            create a new account
          </router-link>
        </p>
      </div>
      <form @submit.prevent="handleSubmit" class="mt-8 space-y-6">
        <input type="hidden" name="remember" value="true" />
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="phonenumber" class="sr-only">Phone Number</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <PhoneIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input v-model="phonenumber" id="phonenumber" name="phonenumber" type="tel" autocomplete="tel" required
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
              <input v-model="password" id="password" name="password" type="password" autocomplete="current-password"
                required
                class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                :class="{ 'border-red-500': passwordError }" placeholder="Password" />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input id="remember-me" name="remember-me" type="checkbox"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div class="text-sm">
            <a href="#" class="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot your password?
            </a>
          </div>
        </div>

        <div>
          <button type="submit" :disabled="isLoading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <LockIcon class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
            </span>
            {{ isLoading ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>
      </form>

      <!-- Success message -->
      <div v-if="loginSuccess" class="mt-4 p-4 bg-green-100 rounded-md">
        <p class="text-green-700 flex items-center">
          <CheckCircleIcon class="h-5 w-5 mr-2" />
          Login successful! Redirecting...
        </p>
      </div>

      <!-- Error message -->
      <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md">
        <p class="text-red-700 flex items-center">
          <AlertCircleIcon class="h-5 w-5 mr-2" />
          {{ errorMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserState } from '../store/user-state'
import { API_ENDPOINTS } from '../config/api'
import axios from "axios"
import { PhoneIcon, LockIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-vue-next'

export default {
  components: {
    PhoneIcon,
    LockIcon,
    CheckCircleIcon,
    AlertCircleIcon,
  },
  setup() {
    const router = useRouter()
    const { login } = useUserState()

    const phonenumber = ref("")
    const password = ref("")
    const phoneError = ref("")
    const passwordError = ref("")
    const isLoading = ref(false)
    const loginSuccess = ref(false)
    const errorMessage = ref("")
    const sendDeviceId = ref(true)
    const rememberMe = ref(false)

    const validatePhone = () => {
      if (!phonenumber.value) {
        phoneError.value = "Phone number is required"
        return false
      }
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
        return false
      }
      if (password.value.length < 6 || password.value.length > 10) {
        passwordError.value = "Password must be 6-10 characters long"
        return false
      }
      if (password.value === phonenumber.value) {
        passwordError.value = "Password must not match the phone number"
        return false
      }
      passwordError.value = ""
      return true
    }

    const handleSubmit = async () => {
      phoneError.value = ""
      passwordError.value = ""
      errorMessage.value = ""
      loginSuccess.value = false

      const phoneValid = validatePhone()
      const passwordValid = validatePassword()

      if (!phoneValid || !passwordValid) {
        return
      }

      isLoading.value = true
      try {
        const response = await axios.post(
          API_ENDPOINTS.LOGIN,
          {
            phonenumber: phonenumber.value,
            password: password.value,
            deviceId: sendDeviceId.value ? "device-uuid" : undefined,
            rememberMe: rememberMe.value
          }
        )

        if (response.data.code === "1000") {
          loginSuccess.value = true
          login(response.data.data.token, response.data.data.deviceToken) // Pass both token and deviceToken
          setTimeout(() => {
            router.push('/')
          }, 2000)
        } else {
          errorMessage.value = response.data.message
        }
      } catch (error) {
        console.error("Login error:", error)
        if (error.response) {
          errorMessage.value = error.response.data.message
        } else if (error.request) {
          errorMessage.value = "Unable to connect to the Internet"
        } else {
          errorMessage.value = "An unexpected error occurred. Please try again."
        }
      } finally {
        isLoading.value = false
      }
    }

    const handleForgotPassword = () => {
      router.push('/forgot-password') // Adjust the route as needed
    }

    return {
      phonenumber,
      password,
      phoneError,
      passwordError,
      isLoading,
      loginSuccess,
      errorMessage,
      sendDeviceId,
      rememberMe,
      handleSubmit,
      handleForgotPassword,
    }
  },
}
</script>