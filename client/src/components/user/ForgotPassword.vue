<template>
  <div class="flex flex-col items-center justify-center p-4 min-h-screen">
    <Card class="w-full max-w-md p-8">
      <h2 class="text-2xl font-bold mb-6 text-center">Reset Password</h2>
      <Alert v-if="verificationCode" class="mb-4">
        <AlertDescription class="flex items-center justify-between">
          <span>Verification Code: <strong>{{ verificationCode }}</strong></span>
          <Button variant="outline" size="sm" class="flex items-center gap-2" @click="copyCode">
            <Copy class="h-4 w-4" />
            Copy
          </Button>
        </AlertDescription>
      </Alert>

      <!-- Step 1: Phone Number Form -->
      <form v-if="step === 1" @submit.prevent="handlePhoneSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <Input v-model="phoneNumber" type="tel" placeholder="Enter your phone number"
            :error="submitted && errors.phoneNumber" @input="clearErrors" />
          <p v-if="submitted && errors.phoneNumber" class="mt-1 text-sm text-red-600">
            {{ errors.phoneNumber }}
          </p>
        </div>

        <Button type="submit" :loading="isLoading" class="w-full" :disabled="isSubmitDisabled">
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
          <Button v-else type="button" variant="ghost" @click="resendCode"
            class="mt-2 text-sm text-blue-600 hover:text-blue-800">
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
          <div class="mt-1 text-sm text-gray-500">
            Password must be at least 8 characters long and include uppercase, lowercase, and numbers
          </div>
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
      </form>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '../ui/toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy } from 'lucide-vue-next';
import logger from '@/services/logging';

const router = useRouter();
const userStore = useUserStore();
const { toast } = useToast();

// State
const step = ref(1);
const phoneNumber = ref('');
const code = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const cooldown = ref(0);
const cooldownTimer = ref(null);
const submitted = ref(false);
const remainingAttempts = ref(5);
const verificationCode = ref('');

const errors = ref({
  phoneNumber: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
});

// Computed
const isSubmitDisabled = computed(() => {
  if (step.value === 1) {
    return !phoneNumber.value || userStore.isLoading;
  }
  return !code.value || !newPassword.value || !confirmPassword.value || userStore.isLoading;
});

// Methods
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(verificationCode.value);
    toast({ type: 'success', message: 'Code copied to clipboard' });
  } catch (error) {
    toast({ type: 'error', message: 'Failed to copy code' });
    logger.error('Copy code error:', error);
  }
};

const clearErrors = () => {
  errors.value = {
    phoneNumber: '',
    code: '',
    newPassword: '',
    confirmPassword: ''
  };
  submitted.value = false;
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

const validatePhoneNumber = () => {
  const value = phoneNumber.value;
  if (!value) {
    errors.value.phoneNumber = 'Phone number is required';
    return false;
  }
  if (!/^0[1-9][0-9]{8}$/.test(value)) {
    errors.value.phoneNumber = 'Invalid phone number format';
    return false;
  }
  errors.value.phoneNumber = '';
  return true;
};

const validateCode = () => {
  const value = code.value;
  if (!value) {
    errors.value.code = 'Verification code is required';
    return false;
  }
  if (!/^\d{6}$/.test(value)) {
    errors.value.code = 'Code must be 6 digits';
    return false;
  }
  errors.value.code = '';
  return true;
};

const validatePassword = () => {
  const value = newPassword.value;
  if (!value) {
    errors.value.newPassword = 'Password is required';
    return false;
  }
  if (value.length < 8) {
    errors.value.newPassword = 'Password must be at least 8 characters';
    return false;
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+$/.test(value)) {
    errors.value.newPassword = 'Password must include uppercase, lowercase, and numbers';
    return false;
  }
  errors.value.newPassword = '';
  return true;
};

const validateConfirmPassword = () => {
  if (newPassword.value !== confirmPassword.value) {
    errors.value.confirmPassword = 'Passwords do not match';
    return false;
  }
  errors.value.confirmPassword = '';
  return true;
};

const handlePhoneSubmit = async () => {
  submitted.value = true;
  if (!validatePhoneNumber()) return;

  try {
    const response = await userStore.forgotPassword({ phoneNumber: phoneNumber.value });
    if (response?.success) {
      verificationCode.value = response.verifyCode;
      step.value = 2;
      startCooldown();
      toast({ type: 'success', message: 'Verification code sent successfully' });

      // Store verification code in localStorage for step 2
      localStorage.setItem('resetPhoneNumber', phoneNumber.value);
    }
  } catch (error) {
    toast(error.message, 'error');
    logger.error('Phone submission error:', error);
  }
};

const handleResetSubmit = async () => {
  submitted.value = true;
  if (!validateCode() || !validatePassword() || !validateConfirmPassword()) return;

  const storedPhone = localStorage.getItem('resetPhoneNumber');
  if (!storedPhone || !code.value || !newPassword.value) {
    toast({ type: 'error', message: 'Verification code and new password are required' });
    return;
  }

  try {
    const response = await userStore.forgotPassword({
      phoneNumber: storedPhone,
      code: code.value,
      newPassword: newPassword.value,
    });

    if (response?.success) {
      localStorage.removeItem('resetPhoneNumber');
      toast({ type: 'success', message: 'Password reset successful!' });
      router.push('/login');
    }
  } catch (error) {
    remainingAttempts.value--;
    toast(error.message, 'error');
    logger.error('Reset submission error:', error);
  }
};

const resendCode = async () => {
  if (cooldown.value > 0) return;

  try {
    const response = await userStore.forgotPassword({ phoneNumber: phoneNumber.value });
    if (response?.success) {
      verificationCode.value = response.verifyCode;
      startCooldown();
      toast({ type: 'success', message: 'Verification code resent successfully!' });
    }
  } catch (error) {
    toast(error.message, 'error');
    logger.error('Resend code error:', error);
  }
};

// Cleanup
onBeforeUnmount(() => {
  if (cooldownTimer.value) {
    clearInterval(cooldownTimer.value);
  }
  localStorage.removeItem('resetPhoneNumber');
});
</script>