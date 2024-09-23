<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <img class="mx-auto h-12 w-auto" src="../assets/logo.svg" alt="HUSTBOOK" />
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Create your account
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Or
        <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
          sign in to your existing account
        </router-link>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div v-if="!signupSuccess">
          <SignUp @signup-success="handleSignupSuccess" @signup-error="handleSignupError" />
        </div>
        <div v-else-if="!verificationComplete">
          <VerifyCode :initialPhoneNumber="phoneNumber" @verification-success="handleVerificationSuccess"
            @verification-error="handleVerificationError" />
        </div>
        <div v-else class="text-center">
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
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SignUp from './SignUp.vue'
import VerifyCode from './VerifyCode.vue'
import { CheckCircleIcon, XCircleIcon } from 'lucide-vue-next'

const router = useRouter()
const signupSuccess = ref(false)
const verificationComplete = ref(false)
const phoneNumber = ref('')
const error = ref('')

const handleSignupSuccess = (data) => {
  signupSuccess.value = true
  phoneNumber.value = data.phoneNumber
  error.value = ''
}

const handleSignupError = (errorMessage) => {
  error.value = errorMessage
}

const handleVerificationSuccess = () => {
  verificationComplete.value = true
  error.value = ''
}

const handleVerificationError = (errorMessage) => {
  error.value = errorMessage
}

const proceedToCompleteProfile = () => {
  router.push('/complete-profile')
}
</script>