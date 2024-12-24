<template>
  <div class="flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Or
          <router-link to="/signup" class="font-medium text-indigo-600 hover:text-indigo-500">
            create a new account
          </router-link>
        </p>
      </div>

      <div v-if="showSessionWarning" class="rounded-md bg-yellow-50 p-4 mb-4" role="alert">
        <div class="flex">
          <AlertCircleIcon class="h-5 w-5 text-yellow-400" />
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">Session Expiring Soon</h3>
            <p class="mt-2 text-sm text-yellow-700">Your session will expire soon. Please save your work and re-login.
            </p>
          </div>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="mt-8 space-y-6" novalidate>
        <div class="rounded-md shadow-sm -space-y-px">
          <div class="relative">
            <label for="phoneNumber" class="sr-only">Phone Number</label>
            <input v-model="phoneNumber" id="phoneNumber" name="phoneNumber" type="tel" autocomplete="tel" required
              :disabled="isFormDisabled"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              :class="{ 'border-red-500': errors.phone }" placeholder="Phone number" />
            <transition name="fade">
              <p v-if="errors.phone" class="mt-2 text-sm text-red-600" role="alert">{{ errors.phone }}</p>
            </transition>
          </div>

          <div class="relative">
            <label for="password" class="sr-only">Password</label>
            <div class="flex relative">
              <input v-model="password" :type="showPassword ? 'text' : 'password'" id="password" name="password"
                autocomplete="current-password" required :disabled="isFormDisabled"
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                :class="{ 'border-red-500': errors.password }" placeholder="Password" />
              <button type="button" @click="togglePasswordVisibility"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                :aria-label="showPassword ? 'Hide password' : 'Show password'">
                <EyeIcon v-if="showPassword" class="h-5 w-5 text-gray-400" />
                <EyeOffIcon v-else class="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <transition name="fade">
              <p v-if="errors.password" class="mt-2 text-sm text-red-600" role="alert">{{ errors.password }}</p>
            </transition>
          </div>
        </div>

        <div v-if="remainingAttempts <= 2 && remainingAttempts > 0" class="text-sm text-yellow-600">
          {{ remainingAttempts }} login attempts remaining before temporary lockout
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input v-model="rememberMe" id="remember-me" name="remember-me" type="checkbox" :disabled="isFormDisabled"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900">Remember me</label>
          </div>
          <div class="text-sm">
            <router-link to="/forgot-password" class="font-medium text-indigo-600 hover:text-indigo-500">
              Forgot your password?
            </router-link>
          </div>
        </div>

        <div>
          <button type="submit" :disabled="isFormDisabled"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :aria-busy="isLoading">
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <Lock class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
            </span>
            <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
            <span>{{ loginButtonText }}</span>
          </button>
        </div>

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
import { Lock, LoaderIcon, CheckCircleIcon, AlertCircleIcon, EyeIcon, EyeOffIcon } from 'lucide-vue-next';
import { useUserStore } from '../../stores/userStore';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { useToast } from '../../composables/useToast';

const router = useRouter();
const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

const phoneNumber = ref('');
const password = ref('');
const rememberMe = ref(false);
const showPassword = ref(false);
const errors = ref({});
const sessionTimeout = ref(null);
const showSessionWarning = ref(false);
const remainingAttempts = ref(5);

const { isLoading, successMessage, error, isSessionExpired } = storeToRefs(userStore);

const validateForm = () => {
  errors.value = {};
  if (!phoneNumber.value) {
    errors.value.phone = 'Phone number is required';
  } else if (!/^0\d{9}$/.test(phoneNumber.value)) {
    errors.value.phone = 'Invalid phone number format';
  }

  if (!password.value) {
    errors.value.password = 'Password is required';
  } else if (password.value.length < 6) {
    errors.value.password = 'Password must be at least 6 characters';
  }

  return Object.keys(errors.value).length === 0;
};

const loginButtonText = computed(() => {
  if (isLoading.value) return 'Signing in...';
  if (remainingAttempts.value === 0) {
    return `Try again in 5:00`;
  }
  return 'Sign in';
});

const isFormDisabled = computed(() => {
  return isLoading.value || remainingAttempts.value === 0;
});

const loginSuccess = computed(() => successMessage.value !== '');

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    const success = await userStore.login(phoneNumber.value, password.value, rememberMe.value);
    if (success) {
      showToast('Login successful!', 'success');
      router.push({ name: 'Home' });
    } else {
      remainingAttempts.value--;
      if (remainingAttempts.value === 0) {
        setTimeout(() => {
          remainingAttempts.value = 5;
        }, 5 * 60 * 1000);
      }
    }
  } catch (err) {
    handleError(err);
    showToast('An unexpected error occurred. Please try again.', 'error');
  }
};

const togglePasswordVisibility = () => showPassword.value = !showPassword.value;

const showSessionTimeoutWarning = () => {
  showSessionWarning.value = true;
  showToast('Your session will expire soon. Please re-login.', 'warning');
};

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

onMounted(() => {
  if (isSessionExpired.value) {
    showToast('Your previous session has expired. Please login again.', 'warning');
  }

  const token = Cookies.get('accessToken');
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    const expiryTime = payload.exp ? payload.exp * 1000 : 0;
    const warningTime = expiryTime - 5 * 60 * 1000;

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