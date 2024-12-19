<template>
  <div class="flex items-center justify-center overflow-hidden bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header Section -->
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
        <form @submit.prevent="handleSignup" class="mt-8 space-y-6" novalidate>
          <div class="rounded-md shadow-sm -space-y-px">
            <!-- Phone Number Field -->
            <div>
              <label for="phoneNumber" class="sr-only">Phone Number</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PhoneIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input v-model="phoneNumber" id="phoneNumber" name="phoneNumber" type="tel" autocomplete="tel" required
                  aria-describedby="phoneNumber-error" @input="validatePhone"
                  class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  :class="{ 'border-red-500': phoneError }" placeholder="Phone number" />
              </div>
              <p v-if="phoneError" id="phoneNumber-error" class="text-sm text-red-600 mt-1">
                {{ phoneError }}
              </p>
            </div>

            <!-- Password Field -->
            <div>
              <label for="password" class="sr-only">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input v-model="password" id="password" name="password" type="password" autocomplete="new-password"
                  required aria-describedby="password-error" @input="validatePassword"
                  class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  :class="{ 'border-red-500': passwordError }" placeholder="Password" />
              </div>
              <p v-if="passwordError" id="password-error" class="text-sm text-red-600 mt-1">
                {{ passwordError }}
              </p>
            </div>
          </div>

          <!-- Remember Me Checkbox -->
          <div class="flex items-center">
            <input v-model="rememberMe" id="remember-me" name="remember-me" type="checkbox"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <!-- Submit Button -->
          <div>
            <button type="submit" :disabled="isLoading || !isFormValid"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              :aria-disabled="isLoading || !isFormValid">
              <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                <LockIcon class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
              </span>
              <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
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
      </div>

      <!-- Verify Code Component -->
      <div v-if="currentStep === 'verify'">
        <VerifyCode :initialphoneNumber="phoneNumber" @verification-success="handleVerificationSuccess"
          @verification-error="handleVerificationError" />
      </div>

      <!-- Complete Profile Prompt -->
      <div v-if="currentStep === 'complete'" class="rounded-md bg-green-50 p-4">
        <div class="flex">
          <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2" aria-hidden="true" />
          <div>
            <h3 class="text-sm font-medium text-green-800">Account created and verified successfully</h3>
            <p class="mt-2 text-sm text-green-700">You can now proceed to complete your profile.</p>
          </div>
        </div>
        <button @click="proceedToCompleteProfile"
          class="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Complete Profile
        </button>
      </div>

      <!-- Error Message Display -->
      <div v-if="errorMessage" class="mt-4 rounded-md bg-red-100 p-4 flex items-start" role="alert">
        <XCircleIcon class="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div>
          <h3 class="text-sm font-medium text-red-800">Error</h3>
          <p class="mt-2 text-sm text-red-700">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { CheckCircleIcon, XCircleIcon, LockIcon, LoaderIcon, PhoneIcon } from 'lucide-vue-next';
import VerifyCode from './VerifyCode.vue';
import { useFormValidation } from '../../composables/useFormValidation';
import { useToast } from '../../composables/useToast';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { storeToRefs } from 'pinia';

const router = useRouter();
const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

const currentStep = ref('signup');
const phoneNumber = ref('');
const password = ref('');
const rememberMe = ref(false);

// Use form validation composable
const { errors, validateField, validators } = useFormValidation();

// Computed properties for phoneError and passwordError
const phoneError = computed(() => errors.value.phoneNumber || null);
const passwordError = computed(() => errors.value.password || null);

// Validation functions
const validatePhone = async () => {
  await validateField('phoneNumber', phoneNumber.value, validators.phoneNumber);
};

const validatePassword = async () => {
  // validators.password rules also depend on phoneNumber if needed
  // but for now, just pass password
  await validateField('password', password.value, validators.password);
};

// Watch phoneNumber and password and validate on change
watch(phoneNumber, () => validatePhone());
watch(password, () => validatePassword());

// Check if form is valid
const isFormValid = computed(() => {
  return !phoneError.value && !passwordError.value && phoneNumber.value && password.value;
});

// Password strength calculations
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

// Extract isLoading and error from userStore
const { isLoading, error } = storeToRefs(userStore);
const errorMessage = computed(() => userStore.error || '');

// Handle form submission
const handleSignup = async () => {
  if (!isFormValid.value) {
    showToast('Please fix the errors before submitting.', 'error');
    return;
  }

  try {
    const success = await userStore.register(phoneNumber.value, password.value, 'device-uuid');
    if (success) {
      showToast('Registration successful. Please verify your account.', 'success');
      currentStep.value = 'verify';
    } else {
      showToast(userStore.error || 'Registration failed. Please try again.', 'error');
    }
  } catch (err) {
    handleError(err);
    showToast('An unexpected error occurred. Please try again.', 'error');
  }
};

// Handle successful verification
const handleVerificationSuccess = () => {
  showToast('Verification successful!', 'success');
  currentStep.value = 'complete';
};

// Handle verification errors
const handleVerificationError = (errorMsg) => {
  showToast(errorMsg || 'Verification failed. Please try again.', 'error');
};

// Proceed to complete profile
const proceedToCompleteProfile = () => {
  router.push('/complete-profile');
};

// Watch for errors to display toast notifications
watch(error, (newError) => {
  if (newError) {
    showToast(newError, 'error');
  }
});
</script>

<style scoped>
/* Ensure accessibility for focus states */
button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  /* Focus ring color */
}
</style>