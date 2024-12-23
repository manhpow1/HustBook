<template>
  <div class="flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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

      <!-- Session Expiry Warning -->
      <div v-if="showSessionWarning" class="rounded-md bg-yellow-50 p-4 mb-4" role="alert">
        <div class="flex">
          <AlertCircleIcon class="h-5 w-5 text-yellow-400" />
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">Session Expiring Soon</h3>
            <div class="mt-2 text-sm text-yellow-700">
              <p>Your session will expire soon. Please save your work and re-login.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleSubmit" class="mt-8 space-y-6" novalidate>
        <div class="rounded-md shadow-sm -space-y-px">
          <!-- Phone Number Field -->
          <div class="relative">
            <label for="phoneNumber" class="sr-only">Phone Number</label>
            <input v-model="phoneNumber" id="phoneNumber" name="phoneNumber" type="tel" autocomplete="tel" required
              @blur="validation.markFieldVisited('phoneNumber'); validation.validatePhoneNumber(phoneNumber)"
              :disabled="isFormDisabled"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              :class="{ 'border-red-500': formErrors.phone }" placeholder="Phone number" />
            <transition name="fade">
              <p v-if="formErrors.phone" class="mt-2 text-sm text-red-600" role="alert">
                {{ formErrors.phone }}
              </p>
            </transition>
          </div>

          <!-- Password Field -->
          <div class="relative">
            <label for="password" class="sr-only">Password</label>
            <div class="flex relative">
              <input v-model="password" :type="showPassword ? 'text' : 'password'" id="password" name="password"
                @blur="validation.markFieldVisited('password'); validation.validatePassword(password)"
                autocomplete="current-password" required :disabled="isFormDisabled"
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                :class="{ 'border-red-500': formErrors.password }" placeholder="Password" />
              <button type="button" @click="togglePasswordVisibility"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                :aria-label="showPassword ? 'Hide password' : 'Show password'">
                <EyeIcon v-if="showPassword" class="h-5 w-5 text-gray-400" />
                <EyeOffIcon v-else class="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <transition name="fade">
              <p v-if="formErrors.password" class="mt-2 text-sm text-red-600" role="alert">
                {{ formErrors.password }}
              </p>
            </transition>
          </div>
        </div>

        <!-- Rate Limit Warning -->
        <div v-if="remainingAttempts <= 2 && remainingAttempts > 0" class="text-sm text-yellow-600">
          {{ remainingAttempts }} login attempts remaining before temporary lockout
        </div>

        <!-- Remember Me and Forgot Password -->
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input v-model="rememberMe" id="remember-me" name="remember-me" type="checkbox" :disabled="isFormDisabled"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>
          <div class="text-sm">
            <router-link to="/forgot-password" class="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot your password?
            </router-link>
          </div>
        </div>

        <!-- Submit Button -->
        <div>
          <button type="submit" :disabled="isFormDisabled"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :aria-busy="isLoading">
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <LockIcon class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
            </span>
            <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
            <span>{{ loginButtonText }}</span>
          </button>
        </div>

        <!-- Login Success Message -->
        <transition name="fade">
          <div v-if="loginSuccess" class="mt-4 p-4 bg-green-100 rounded-md flex items-center" role="alert">
            <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2" aria-hidden="true" />
            <p class="text-green-700">Login successful! Redirecting...</p>
          </div>
        </transition>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import Cookies from 'js-cookie';

import {
  LockIcon,
  LoaderIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon
} from 'lucide-vue-next';

import { useUserStore } from '../../stores/userStore';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { useToast } from '../../composables/useToast';
import { useAuthForm } from '../../composables/useAuthForm';

const router = useRouter();
const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

const {
  state,
  validation,
  isFormBusy,
  isFormValid,
  handleSubmit: authSubmit
} = useAuthForm('login');

// Computed fields with two-way binding
// Form fields with two-way binding
const phoneNumber = computed({
  get: () => validation.fields.value.phoneNumber,
  set: (value) => validation.fields.value.phoneNumber = value
});

const password = computed({
  get: () => validation.fields.value.password,
  set: (value) => validation.fields.value.password = value
});

const rememberMe = computed({
  get: () => state.rememberMe,
  set: (value) => state.rememberMe = value
});

// UI State
const showPassword = ref(false);
const togglePasswordVisibility = () => showPassword.value = !showPassword.value;

// Session timeout handling
const sessionTimeout = ref(null);
const showSessionWarning = ref(false);

// Store refs
const { isLoading, successMessage, error, isSessionExpired } = storeToRefs(userStore);

// Computed properties
const remainingAttempts = computed(() => state.attemptsRemaining);

const loginButtonText = computed(() => {
  if (isLoading.value) return 'Signing in...';
  if (state.lockoutEndTime) {
    const remaining = Math.ceil((state.lockoutEndTime - Date.now()) / 1000);
    return `Try again in ${remaining}s`;
  }
  return 'Sign in';
});

const isFormDisabled = computed(() => {
  return isLoading.value || Object.keys(errors.value).length > 0;
});

const loginSuccess = computed(() => successMessage.value !== '');

const formErrors = computed(() => ({
  phone: validation.errors.value?.phone || error.value,
  password: validation.errors.value?.password
}));

// Handle form submission
async function handleSubmit() {
  try {
    const success = await authSubmit();
    if (success) {
      showToast('Login successful!', 'success');
      router.push({ name: 'Home' });
    }
  } catch (err) {
    handleError(err);
    showToast('An unexpected error occurred. Please try again.', 'error');
  }
}

function showSessionTimeoutWarning() {
  showSessionWarning.value = true;
  showToast('Your session will expire soon. Please re-login.', 'warning');
}

// Watch for successful login
watch(
  () => successMessage.value,
  (val) => {
    if (val) {
      setTimeout(() => {
        router.push({ name: 'Home' });
      }, 1500);
    }
  }
);

// Lifecycle hooks
onMounted(() => {
  if (isSessionExpired.value) {
    showToast('Your previous session has expired. Please login again.', 'warning');
  }

  // Check token expiration
  const token = Cookies.get('accessToken');
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    const expiryTime = payload.exp ? payload.exp * 1000 : 0;
    const warningTime = expiryTime - 5 * 60 * 1000; // 5 min before expiry

    if (warningTime > Date.now()) {
      sessionTimeout.value = setTimeout(showSessionTimeoutWarning, warningTime - Date.now());
    }
  }
});

onUnmounted(() => {
  clearTimeout(sessionTimeout.value);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

input:disabled,
button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
