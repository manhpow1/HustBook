<template>
  <div class="flex items-center justify-center overflow-hidden bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
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

      <!-- Sign Up Form -->
      <div v-if="currentStep === 'signup'">
        <form @submit.prevent="handleSignup" class="mt-8 space-y-6">
          <div class="rounded-md shadow-sm -space-y-px">
            <!-- Phone Number Field -->
            <div>
              <label for="phonenumber" class="sr-only">Phone Number</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PhoneIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input v-model="phonenumber" id="phonenumber" name="phonenumber" type="tel" required
                  class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  :class="{ 'border-red-500': phoneError }" placeholder="Phone number" @input="validatePhone" />
              </div>
              <p v-if="phoneError" class="text-sm text-red-600 mt-1">{{ phoneError }}</p>
            </div>

            <!-- Password Field -->
            <div>
              <label for="password" class="sr-only">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input v-model="password" id="password" name="password" type="password" required
                  class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  :class="{ 'border-red-500': passwordError }" placeholder="Password" @input="validatePassword" />
              </div>
              <p v-if="passwordError" class="text-sm text-red-600 mt-1">{{ passwordError }}</p>
            </div>
          </div>

          <!-- Remember Me Checkbox -->
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input v-model="rememberMe" id="remember-me" name="remember-me" type="checkbox"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
              <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
          </div>

          <!-- Submit Button -->
          <div>
            <button type="submit" :disabled="isLoading || !isFormValid"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                <LockIcon class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
              </span>
              <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
              <span v-if="isLoading">Signing up...</span>
              <span v-else>Sign Up</span>
            </button>
          </div>
        </form>

        <!-- Password Strength Indicator -->
        <div v-if="password" class="mt-4">
          <p class="text-sm font-medium text-gray-700">Password strength: {{ passwordStrengthText }}</p>
          <div class="mt-1 h-2 w-full bg-gray-200 rounded-full">
            <div class="h-full rounded-full transition-all duration-300" :class="passwordStrengthClass"
              :style="{ width: `${passwordStrength}%` }"></div>
          </div>
        </div>

        <!-- Verify Code Component -->
        <div v-else-if="currentStep === 'verify'">
          <VerifyCode :initialPhoneNumber="phonenumber" @verification-success="handleVerificationSuccess"
            @verification-error="handleVerificationError" />
        </div>

        <!-- Complete Profile Prompt -->
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

        <!-- Error Message Display -->
        <div v-if="errorMessage" class="mt-4 rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <XCircleIcon class="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">
                Error
              </h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{{ errorMessage }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { PhoneIcon, LockIcon, CheckCircleIcon, XCircleIcon, LoaderIcon } from 'lucide-vue-next';
import VerifyCode from './VerifyCode.vue';
import { useFormValidation } from '../../composables/useFormValidation';

const router = useRouter();
const userStore = useUserStore();

const currentStep = ref('signup');
const phonenumber = ref('');
const password = ref('');
const rememberMe = ref(false);

const isLoading = computed(() => userStore.isLoading);
const errorMessage = computed(() => userStore.error);

const { phoneError, passwordError, validatePhone, validatePassword } = useFormValidation();


const isFormValid = computed(() => {
  return validatePhone(phonenumber.value) && validatePassword(password.value, phonenumber.value);
});

const passwordStrength = computed(() => {
  let strength = 0;

  if (password.value.length >= 6 && password.value.length <= 10) {
    strength += 20;
  }
  if (/[a-z]/.test(password.value)) {
    strength += 20;
  }
  if (/[A-Z]/.test(password.value)) {
    strength += 20;
  }
  if (/\d/.test(password.value)) {
    strength += 20;
  }
  if (/[^a-zA-Z0-9]/.test(password.value)) {
    strength += 20;
  }
  return strength;
});

const passwordStrengthText = computed(() => {
  const strength = passwordStrength.value;
  if (strength <= 40) return 'Weak';
  if (strength <= 60) return 'Moderate';
  if (strength <= 80) return 'Strong';
  return 'Very Strong';
});

const passwordStrengthClass = computed(() => {
  const strength = passwordStrength.value;
  if (strength <= 40) return 'bg-red-500';
  if (strength <= 60) return 'bg-yellow-500';
  if (strength <= 80) return 'bg-blue-500';
  return 'bg-green-500';
});

const handleSignup = async () => {
  if (!isFormValid.value) return;

  try {
    const success = await userStore.register(phonenumber.value, password.value);
    if (success) {
      currentStep.value = 'verify';
    }
  } catch (err) {
    // Error is handled in userStore
  }
};

function handleVerificationSuccess() {
  currentStep.value = 'complete';
}

function handleVerificationError(errorMsg) {
  errorMessage.value = errorMsg;
}

function proceedToCompleteProfile() {
  router.push('/complete-profile');
}
</script>