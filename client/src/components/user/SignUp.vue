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

      <div v-if="currentStep === 'signup'">
        <form @submit.prevent="handleSignup" class="mt-8 space-y-6" novalidate>
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="phoneNumber" class="sr-only">Phone Number</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input v-model="phoneNumber" id="phoneNumber" name="phoneNumber" type="tel" required
                  @input="validateFields" :disabled="isLoading"
                  class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  :class="{ 'border-red-500': errors.phoneNumber }" placeholder="Phone number" />
              </div>
              <p v-if="errors.phoneNumber" class="text-sm text-red-600 mt-1">{{ errors.phoneNumber }}</p>
            </div>

            <div>
              <label for="password" class="sr-only">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input v-model="password" id="password" name="password" type="password" required @input="validateFields"
                  :disabled="isLoading"
                  class="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  :class="{ 'border-red-500': errors.password }" placeholder="Password" />
              </div>
              <p v-if="errors.password" class="text-sm text-red-600 mt-1">{{ errors.password }}</p>
            </div>
          </div>

          <div class="flex items-center">
            <input v-model="rememberMe" id="rememberMe" name="rememberMe" type="checkbox"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label for="rememberMe" class="ml-2 block text-sm text-gray-900">Remember me</label>
          </div>

          <button type="submit" :disabled="isLoading || !isValid"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <Lock class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
            </span>
            <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
            {{ isLoading ? 'Signing up...' : 'Sign Up' }}
          </button>
        </form>

        <div v-if="password" class="mt-4">
          <p class="text-sm font-medium text-gray-700">Password strength: {{ passwordStrength.text }}</p>
          <div class="mt-1 h-2 w-full bg-gray-200 rounded-full">
            <div class="h-full rounded-full transition-all duration-300" :class="passwordStrength.colorClass"
              :style="{ width: `${passwordStrength.score}%` }">
            </div>
          </div>
        </div>
      </div>

      <VerifyCode v-else-if="currentStep === 'verify'" :phoneNumber="phoneNumber"
        @verification-success="handleVerificationSuccess" @verification-error="handleVerificationError" />

      <div v-if="currentStep === 'complete'" class="rounded-md bg-green-50 p-4">
        <div class="flex">
          <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2" aria-hidden="true" />
          <div>
            <h3 class="text-sm font-medium text-green-800">Account created successfully</h3>
            <p class="mt-2 text-sm text-green-700">Complete your profile to continue.</p>
          </div>
        </div>
        <button @click="router.push('/complete-profile')"
          class="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Complete Profile
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useToast } from '../../composables/useToast';
import { useFormValidation } from '../../composables/useFormValidation';
import { storeToRefs } from 'pinia';
import { CheckCircleIcon, Lock, LoaderIcon, Phone } from 'lucide-vue-next';
import VerifyCode from './VerifyCode.vue';

const router = useRouter();
const userStore = useUserStore();
const { showToast } = useToast();
const { validateField } = useFormValidation();

const { isLoading } = storeToRefs(userStore);

const currentStep = ref('signup');
const phoneNumber = ref('');
const password = ref('');
const rememberMe = ref(false);
const errors = ref({
  phoneNumber: null,
  password: null,
});

const validateFields = async () => {
  errors.value.phoneNumber = await validateField('phoneNumber', phoneNumber.value, [
    (value) => !value && 'Phone number is required',
    (value) => !/^0\d{9}$/.test(value) && 'Phone number must be 10 digits and start with 0',
  ]);

  errors.value.password = await validateField('password', password.value, [
    (value) => !value && 'Password is required',
    (value) => value.length < 6 && 'Password must be at least 6 characters',
    (value) => value.length > 20 && 'Password must be less than 20 characters',
    (value) => !/[A-Z]/.test(value) && 'Password must contain an uppercase letter',
    (value) => !/[a-z]/.test(value) && 'Password must contain a lowercase letter',
    (value) => !/\d/.test(value) && 'Password must contain a number',
  ]);

  console.log('Validation errors:', errors.value);
};

const isValid = computed(() => {
  return (
    phoneNumber.value &&
    password.value &&
    !errors.value.phoneNumber &&
    !errors.value.password
  );
});

const passwordStrength = computed(() => {
  if (!password.value) return { score: 0, text: '', colorClass: '' };

  let score = 0;
  if (password.value.length >= 6) score += 20;
  if (/[A-Z]/.test(password.value)) score += 20;
  if (/[a-z]/.test(password.value)) score += 20;
  if (/\d/.test(password.value)) score += 20;
  if (/[^A-Za-z0-9]/.test(password.value)) score += 20;

  let text = 'Weak';
  let colorClass = 'bg-red-500';

  if (score > 80) {
    text = 'Very Strong';
    colorClass = 'bg-green-500';
  } else if (score > 60) {
    text = 'Strong';
    colorClass = 'bg-blue-500';
  } else if (score > 40) {
    text = 'Medium';
    colorClass = 'bg-yellow-500';
  }

  return { score, text, colorClass };
});

const handleSignup = async () => {
  await validateFields();
  if (!isValid.value) {
    console.log('Form is invalid:', errors.value);
    return;
  }

  try {
    const success = await userStore.register(phoneNumber.value, password.value);
    if (success) {
      showToast('Registration successful', 'success');
      currentStep.value = 'verify';
    }
  } catch (error) {
    console.error('Registration failed:', error);
    showToast(error.message || 'Registration failed', 'error');
  }
};

const handleVerificationSuccess = () => {
  showToast('Verification successful', 'success');
  currentStep.value = 'complete';
};

const handleVerificationError = (error) => {
  showToast(error || 'Verification failed', 'error');
};
</script>

<style scoped>
button:focus,
input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>