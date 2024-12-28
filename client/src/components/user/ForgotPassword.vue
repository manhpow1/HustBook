<template>
  <div class="flex flex-col items-center justify-center p-4 min-h-screen">
    <Card class="w-full max-w-md p-8">
      <h2 class="text-2xl font-bold mb-6 text-center">Reset Password</h2>

      <!-- Step 1: Phone Number Form -->
      <form v-if="step === 1" @submit.prevent="handlePhoneSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <Input v-model="phoneNumber" type="tel" placeholder="Enter your phone number"
            :error="submitted && errors.phoneNumber" @input="clearErrors" />
          <p v-if="submitted && errors.phoneNumber" class="mt-1 text-sm text-red-600">
            {{ errors.phoneNumber }}
          </p>
          <p v-if="cooldownTime > 0" class="mt-1 text-sm text-gray-600">
            Please wait {{ cooldownTime }} seconds before requesting a new code
          </p>
        </div>

        <div v-if="verificationCode" class="mt-2 p-4 bg-blue-50 border border-blue-200 rounded">
          <div class="flex items-center justify-between">
            <p class="text-sm text-blue-600">
              Verification Code: <span class="font-mono font-bold">{{ verificationCode }}</span>
            </p>
            <Button type="button" @click="copyToClipboard(verificationCode)"
              class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none">
              Copy
            </Button>
          </div>
          <div class="mt-4 flex justify-end">
            <Button type="button" @click="proceedToVerification"
              class="text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md">
              Continue to Reset
            </Button>
          </div>
        </div>

        <Button type="submit" :loading="isLoading" class="w-full" :disabled="!!verificationCode">
          Get Verification Code
        </Button>
        <div class="text-center mt-4">
          <router-link to="/login" class="text-blue-600 hover:text-blue-800">
            Back to Login
          </router-link>
        </div>
      </form>

      <!-- Step 2: Verification and New Password Form -->
      <form v-if="step === 2" @submit.prevent="handleResetSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
          <Input v-model="code" type="text" placeholder="Enter verification code" :error="submitted && errors.code"
            @input="clearErrors" maxlength="6" />
          <div v-if="submitted && errors.code" class="mt-1 text-sm text-red-600">
            {{ errors.code }}
          </div>
          <div v-if="remainingAttempts < 5" class="mt-1 text-sm text-gray-600">
            {{ remainingAttempts }} attempts remaining
          </div>
          <div v-if="cooldown > 0" class="mt-2 text-sm text-gray-600">
            Resend code in {{ cooldown }}s
          </div>
          <Button v-else type="button" @click="resendCode" class="mt-2 text-sm text-blue-600 hover:text-blue-800">
            Resend verification code
          </Button>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <Input v-model="newPassword" type="password" placeholder="Enter new password"
            :error="submitted && errors.newPassword" @input="clearErrors" />
          <div v-if="submitted && errors.newPassword" class="mt-1 text-sm text-red-600">
            {{ errors.newPassword }}
          </div>
          <p class="mt-1 text-sm text-gray-500">
            Password must be at least 8 characters long and include uppercase, lowercase, and numbers
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <Input v-model="confirmPassword" type="password" placeholder="Confirm new password"
            :error="submitted && errors.confirmPassword" @input="clearErrors" />
          <div v-if="submitted && errors.confirmPassword" class="mt-1 text-sm text-red-600">
            {{ errors.confirmPassword }}
          </div>
        </div>

        <Button type="submit" :loading="isLoading" class="w-full" :disabled="isSubmitDisabled">
          Reset Password
        </Button>
        <div class="text-center mt-4">
          <a href="#" @click.prevent="resendCode" class="text-blue-600 hover:text-blue-800"
            :class="{ 'opacity-50 cursor-not-allowed': cooldown > 0 }">
            {{ cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code' }}
          </a>
        </div>
      </form>
    </Card>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useToast } from '../../composables/useToast';
import { storeToRefs } from 'pinia';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import logger from '@/services/logging';

const router = useRouter();
const userStore = useUserStore();
const { showToast } = useToast();

const { isLoading } = storeToRefs(userStore);

const step = ref(1);
const verificationCode = ref('');
const phoneNumber = ref('');
const code = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const cooldown = ref(0);
const cooldownTimer = ref(null);
const submitted = ref(false);

const errors = ref({
  phoneNumber: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
});

// Computed property to control form submission
const isSubmitDisabled = computed(() => {
  if (step.value === 2) {
    return !code.value || !newPassword.value || !confirmPassword.value || isLoading.value;
  }
  return !phoneNumber.value || isLoading.value;
});

const validatePhoneNumber = () => {
  const value = phoneNumber.value;
  if (!value) {
    errors.value.phoneNumber = 'Phone number is required';
  } else if (!/^0\d{9}$/.test(value)) {
    errors.value.phoneNumber = 'Invalid phone number format';
  } else {
    errors.value.phoneNumber = '';
  }
};

const validateCode = () => {
  const value = code.value;
  if (!value) {
    errors.value.code = 'Verification code is required';
  } else if (!/^\d{6}$/.test(value)) {
    errors.value.code = 'Code must be 6 digits';
  } else {
    errors.value.code = '';
  }
};

const validatePassword = () => {
  const value = newPassword.value;
  if (!value) {
    errors.value.newPassword = 'Password is required';
  } else if (value.length < 8) {
    errors.value.newPassword = 'Password must be at least 8 characters';
  } else if (value.length > 30) {
    errors.value.newPassword = 'Password must be less than 30 characters';
  } else {
    errors.value.newPassword = '';
  }
};

const validateConfirmPassword = () => {
  if (newPassword.value !== confirmPassword.value) {
    errors.value.confirmPassword = 'Passwords do not match';
  } else {
    errors.value.confirmPassword = '';
  }
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Verification code copied to clipboard', 'success');
  } catch (err) {
    showToast('Failed to copy to clipboard', 'error');
  }
};

const proceedToVerification = () => {
  if (verificationCode.value) {
    step.value = 2;
    startCooldown();
    showToast('Please enter the verification code', 'info');
  }
};

const handlePhoneSubmit = async () => {
  submitted.value = true;
  validatePhoneNumber();
  if (errors.value.phoneNumber) return;

  try {
    const response = await userStore.forgotPassword({ phoneNumber: phoneNumber.value });
    if (response?.success) {
      verificationCode.value = response.verifyCode;
      // Store verification code in localStorage for step 2
      localStorage.setItem('resetVerificationCode', response.verifyCode);
      localStorage.setItem('resetPhoneNumber', phoneNumber.value);
      showToast('Verification code generated successfully', 'success');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
};

const handleResetSubmit = async () => {
  submitted.value = true;
  validateCode();
  validatePassword();
  validateConfirmPassword();

  if (errors.value.code || errors.value.newPassword || errors.value.confirmPassword) return;

  // Retrieve stored verification data
  const storedCode = localStorage.getItem('resetVerificationCode');
  const storedPhone = localStorage.getItem('resetPhoneNumber');

  if (!storedPhone || !storedCode || !code.value || !newPassword.value) {
    showToast('Verification code and new password are required', 'error');
    return;
  }

  if (code.value !== storedCode) {
    showToast('Invalid verification code', 'error');
    return;
  }

  logger.info('Sending reset request with:', {
    phoneNumber: storedPhone,
    code: code.value,
    newPassword: 'hidden'
  });

  try {
    const response = await userStore.forgotPassword({
      phoneNumber: storedPhone,
      code: code.value,
      newPassword: newPassword.value,
    });
    if (response?.success) {
      // Clear stored verification data
      localStorage.removeItem('resetVerificationCode');
      localStorage.removeItem('resetPhoneNumber');
      showToast('Password reset successfully', 'success');
      router.push('/login');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
};

const resendCode = async () => {
  if (cooldown.value > 0) return;

  try {
    const response = await userStore.forgotPassword({ phoneNumber: phoneNumber.value });
    if (response) {
      startCooldown();
      showToast('Verification code resent', 'success');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
};

const startCooldown = () => {
  cooldown.value = 60;
  cooldownTimer.value = setInterval(() => {
    if (cooldown.value > 0) {
      cooldown.value--;
    } else {
      clearInterval(cooldownTimer.value);
    }
  }, 1000);
};

onBeforeUnmount(() => {
  if (cooldownTimer.value) {
    clearInterval(cooldownTimer.value);
  }
  // Clean up stored verification data when component unmounts
  localStorage.removeItem('resetVerificationCode');
  localStorage.removeItem('resetPhoneNumber');
});
</script>
