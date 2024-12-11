<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header Section -->
      <div>
        <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <router-link to="/signup" class="font-medium text-indigo-600 hover:text-indigo-500">
            create a new account
          </router-link>
        </p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleSubmit" class="mt-8 space-y-6" novalidate>
        <div class="rounded-md shadow-sm -space-y-px">
          <!-- Phone Number Field -->
          <div>
            <label for="phonenumber" class="sr-only">Phone Number</label>
            <input v-model="phonenumber" id="phonenumber" name="phonenumber" type="tel" autocomplete="tel" required
              aria-describedby="phonenumber-error" @input="validatePhone"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              :class="{ 'border-red-500': phoneError }" placeholder="Phone number" />
            <p v-if="phoneError" id="phonenumber-error" class="mt-2 text-sm text-red-600">
              {{ phoneError }}
            </p>
          </div>

          <!-- Password Field -->
          <div>
            <label for="password" class="sr-only">Password</label>
            <input v-model="password" id="password" name="password" type="password" autocomplete="current-password"
              required aria-describedby="password-error" @input="validatePassword"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              :class="{ 'border-red-500': passwordError }" placeholder="Password" />
            <p v-if="passwordError" id="password-error" class="mt-2 text-sm text-red-600">
              {{ passwordError }}
            </p>
          </div>
        </div>

        <!-- Remember Me and Forgot Password -->
        <div class="flex items-center justify-between">
          <!-- Remember Me -->
          <div class="flex items-center">
            <input v-model="rememberMe" id="remember-me" name="remember-me" type="checkbox"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>
          <!-- Forgot Password Link -->
          <div class="text-sm">
            <router-link to="/forgot-password" class="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot your password?
            </router-link>
          </div>
        </div>

        <!-- Submit Button -->
        <div>
          <button type="submit" :disabled="isLoading || !isFormValid"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :aria-disabled="isLoading || !isFormValid">
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <LockIcon class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
            </span>
            <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
            <span v-if="isLoading">Signing in...</span>
            <span v-else>Sign in</span>
          </button>
        </div>
      </form>

      <!-- Success Message -->
      <div v-if="loginSuccess" class="mt-4 p-4 bg-green-100 rounded-md flex items-center" role="alert">
        <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2" aria-hidden="true" />
        <p class="text-green-700">Login successful! Redirecting...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { LockIcon, LoaderIcon, CheckCircleIcon } from 'lucide-vue-next';
import { useFormValidation } from '../../composables/useFormValidation';
import { useToast } from '../../composables/useToast';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { storeToRefs } from 'pinia';

const router = useRouter();
const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

const phonenumber = ref('');
const password = ref('');
const rememberMe = ref(false);

const { errors, validateField, validators } = useFormValidation();

// Compute phoneError and passwordError from errors
const phoneError = computed(() => errors.value['phonenumber']);
const passwordError = computed(() => errors.value['password']);

// Define validation methods
function validatePhone() {
  validateField('phonenumber', phonenumber.value, validators.phonenumber);
}

function validatePassword() {
  validateField('password', password.value, validators.password);
}

const { isLoading, successMessage, error } = storeToRefs(userStore);

// Computed property to determine if the form is valid
const isFormValid = computed(() => {
  return !phoneError.value && !passwordError.value && phonenumber.value && password.value;
});

// Computed property to check if login was successful
const loginSuccess = computed(() => successMessage.value !== '');

// Handle form submission
const handleSubmit = async () => {
  if (!isFormValid.value) {
    showToast('Please fix the errors before submitting.', 'error');
    return;
  }
  try {
    const success = await userStore.login(phonenumber.value, password.value, rememberMe.value);
    if (success) {
      showToast('Login successful!', 'success');
    } else {
      showToast(userStore.error || 'Login failed. Please try again.', 'error');
    }
  } catch (err) {
    handleError(err);
    showToast('An unexpected error occurred. Please try again.', 'error');
  }
};

// Watch for successful login to redirect
watch(loginSuccess, (newVal) => {
  if (newVal) {
    // Redirect after a short delay to allow users to see the success message
    setTimeout(() => {
      router.push({ name: 'Home' });
    }, 2000);
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