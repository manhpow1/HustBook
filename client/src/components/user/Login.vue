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

      <!-- Session Expiry Warning -->
      <div v-if="showSessionWarning" class="rounded-md bg-yellow-50 p-4 mb-4" role="alert">
        <div class="flex">
          <AlertCircleIcon class="h-5 w-5 text-yellow-400" />
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">
              Session Expiring Soon
            </h3>
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
              :disabled="isFormDisabled" @input="validatePhoneNumber"
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
                autocomplete="current-password" required :disabled="isFormDisabled" @input="validatePassword"
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
import { useUserStore } from '../../stores/userStore';
import { LockIcon, LoaderIcon, CheckCircleIcon, AlertCircleIcon, EyeIcon, EyeOffIcon } from 'lucide-vue-next';
import { useFormValidation } from '../../composables/useFormValidation';
import { useToast } from '../../composables/useToast';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { storeToRefs } from 'pinia';
import { useAuthForm } from '../../composables/useAuthForm';
import { useAuthValidation } from '../../composables/useAuthValidation';
import Cookies from 'js-cookie';

const router = useRouter();
const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

// Form state management
const {
  phoneNumber,
  password,
  rememberMe,
  showPassword,
  remainingAttempts,
  togglePasswordVisibility,
  clearForm
} = useAuthForm();

// Form validation
const {
  validatePhoneNumber,
  validatePassword,
  isValidForm,
  validationErrors
} = useAuthValidation(phoneNumber, password);

// Rate limiting state
const loginAttempts = ref(0);
const lockoutEndTime = ref(null);
const isLockedOut = computed(() => {
  if (!lockoutEndTime.value) return false;
  return Date.now() < lockoutEndTime.value;
});
const lockoutTimeRemaining = computed(() => {
  if (!isLockedOut.value) return 0;
  return Math.ceil((lockoutEndTime.value - Date.now()) / 1000);
});

// Session management
const sessionTimeout = ref(null);
const showSessionWarning = ref(false);

// Store references
const { isLoading, successMessage, error, isSessionExpired } = storeToRefs(userStore);

// Reset rate limiting
const resetRateLimiting = () => {
  loginAttempts.value = 0;
  lockoutEndTime.value = null;
};

// Handle login attempt rate limiting
const handleLoginAttempt = () => {
  loginAttempts.value++;
  if (loginAttempts.value >= 5) {
    lockoutEndTime.value = Date.now() + (5 * 60 * 1000); // 5 minutes lockout
    showToast('Too many login attempts. Please try again later.', 'error');
  }
};

// Session timeout warning
const showSessionTimeoutWarning = () => {
  showSessionWarning.value = true;
  showToast('Your session will expire soon. Please re-login.', 'warning');
};

// Generate captcha token if needed
const generateCaptchaToken = async () => {
  // Implement captcha token generation logic here
  return 'captcha-token';
};

// Computed properties
const loginButtonText = computed(() => {
  if (isLoading.value) return 'Signing in...';
  if (isLockedOut.value) return `Try again in ${lockoutTimeRemaining.value}s`;
  return 'Sign in';
});

const isFormDisabled = computed(() => {
  return isLoading.value || isLockedOut.value || !isValidForm.value;
});

const loginSuccess = computed(() => successMessage.value !== '');

const formErrors = computed(() => ({
  phone: validationErrors.value.phone || error.value,
  password: validationErrors.value.password,
  session: isSessionExpired.value ? 'Your session has expired. Please login again.' : null
}));

// Form submission handler
const handleSubmit = async () => {
  if (!isValidForm.value || isLockedOut.value) return;

  try {
    const success = await userStore.login(
      phoneNumber.value,
      password.value,
      rememberMe.value,
      remainingAttempts.value <= 2 ? await generateCaptchaToken() : null
    );

    if (success) {
      resetRateLimiting();
      clearForm();
      showToast('Login successful!', 'success');
    } else {
      handleLoginAttempt();
      showToast(error.value || 'Login failed. Please try again.', 'error');
    }
  } catch (err) {
    handleLoginAttempt();
    handleError(err);
    showToast('An unexpected error occurred. Please try again.', 'error');
  }
};

// Watch for successful login to redirect
watch(loginSuccess, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      router.push({ name: 'Home' });
    }, 1500);
  }
});

// Lifecycle hooks
onMounted(() => {
  if (isSessionExpired.value) {
    showToast('Your previous session has expired. Please login again.', 'warning');
  }

  // Set up session timeout warning
  const token = Cookies.get('accessToken');
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000;
    const warningTime = expiryTime - (5 * 60 * 1000); // 5 minutes before expiry

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

/* Ensure accessibility for focus states */
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
