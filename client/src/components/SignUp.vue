<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <img class="mx-auto h-12 w-auto" src="../assets/logo.svg" alt="HUSTBOOK" />
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
            sign in to your existing account
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
            <input id="remember-me" name="remember-me" type="checkbox"
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
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import axios from "axios"
import { useRouter } from 'vue-router'
import { useUserState } from '../store/user-state'
import { API_ENDPOINTS } from '../config/api'
import { PhoneIcon, LockIcon } from 'lucide-vue-next'

export default {
  components: {
    PhoneIcon,
    LockIcon,
  },
  emits: ['signup-success', 'signup-error'],
  setup(props, { emit }) {
    const router = useRouter()
    const { login } = useUserState()

    const phonenumber = ref("")
    const password = ref("")
    const phoneError = ref("")
    const passwordError = ref("")
    const isLoading = ref(false)
    const rememberMe = ref(false)

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
        return false
      }

      passwordError.value = ""
      return true
    }


    const handleSignupSuccess = (data) => {
      emit('signup-success', data.verificationCode)
      login(data.token, data.deviceToken)
    }

    const handleSubmit = async () => {
      phoneError.value = ""
      passwordError.value = ""

      validatePhone()
      validatePassword()

      if (phoneError.value || passwordError.value) {
        return
      }

      isLoading.value = true

      try {
        const response = await axios.post(
          API_ENDPOINTS.SIGNUP,
          {
            phonenumber: phonenumber.value,
            password: password.value,
            uuid: "device-uuid",
            rememberMe: rememberMe.value
          }
        )

        if (response.data.code === "1000") {
          handleSignupSuccess(response.data.data)
        } else {
          emit('signup-error', response.data.message || "An error occurred during signup")
        }
      } catch (error) {
        console.error("Error occurred:", error)
        let errorMessage = "An unexpected error occurred. Please try again."
        if (error.response) {
          errorMessage = error.response.data.message || "Server error occurred"
        } else if (error.request) {
          errorMessage = "Unable to connect to the server. Please check your internet connection."
        }
        emit('signup-error', errorMessage)
      } finally {
        isLoading.value = false
      }
    }

    return {
      phonenumber,
      password,
      phoneError,
      passwordError,
      isLoading,
      rememberMe,
      passwordStrength,
      passwordStrengthClass,
      handleSubmit,
    }
  },
}
</script>