<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
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
      <form @submit.prevent="handleSubmit" class="mt-8 space-y-6">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="phonenumber" class="sr-only">Phone Number</label>
            <input v-model="phonenumber" id="phonenumber" name="phonenumber" type="tel" autocomplete="tel" required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Phone number" @input="validatePhone" />
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input v-model="password" id="password" name="password" type="password" autocomplete="current-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Password" @input="validatePassword" />
          </div>
        </div>
        <div v-if="errorMessage" class="mt-2 text-sm text-red-600">
          {{ errorMessage }}
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input v-model="rememberMe" id="remember-me" name="remember-me" type="checkbox"
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
        <div>
          <button type="submit" :disabled="isLoading || !isFormValid"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <LockIcon class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
            </span>
            <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
            <span v-if="isLoading">Signing in...</span>
            <span v-else>Sign in</span>
          </button>
        </div>
      </form>
      <div v-if="loginSuccess" class="mt-4 p-4 bg-green-100 rounded-md">
        <p class="text-green-700 flex items-center">
          <CheckCircleIcon class="h-5 w-5 mr-2" />
          Login successful! Redirecting...
        </p>
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

const router = useRouter();
const userStore = useUserStore();

const phonenumber = ref('');
const password = ref('');
const rememberMe = ref(false);

const {validatePhone, validatePassword } = useFormValidation();

const errorMessage = ref('');
const isLoading = ref(false);
const loginSuccess = ref(false);

const isFormValid = computed(() => {
  return validatePhone(phonenumber.value) && validatePassword(password.value, phonenumber.value);
});


const handleSubmit = async () => {
  if (!isFormValid.value) return;

  try {
    const success = await userStore.login(phonenumber.value, password.value);
    if (success) {
      router.push('/');
    }
  } catch (err) {
    // Error is handled in userStore
  }
};

watch(() => userStore.error, (newError) => {
  if (newError) {
    errorMessage.value = newError;
  }
});
</script>
