<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4">
    <Card class="w-full max-w-md p-8">
      <h2 class="text-2xl font-bold mb-6 text-center">Reset Password</h2>

      <form v-if="step === 1" @submit.prevent="handlePhoneSubmit" class="space-y-4">
        <div>
          <Input v-model="phoneNumber" type="tel" placeholder="Enter your phone number" :error="errors.phoneNumber"
            @input="validatePhoneNumber" />
          <div v-if="verificationCode" class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <p class="text-sm text-blue-600">
              Verification Code: <span class="font-mono font-bold">{{ verificationCode }}</span>
            </p>
          </div>
        </div>
        <Button type="submit" :loading="isLoading" class="w-full">
          Send Verification Code
        </Button>
        <div class="text-center mt-4">
          <router-link to="/login" class="text-blue-600 hover:text-blue-800">
            Back to Login
          </router-link>
        </div>
      </form>

      <form v-if="step === 2" @submit.prevent="handleResetSubmit" class="space-y-4">
        <div>
          <Input v-model="code" type="text" maxlength="6" placeholder="Enter verification code" :error="errors.code"
            @input="validateCode" />
        </div>
        <div>
          <Input v-model="newPassword" type="password" placeholder="Enter new password" :error="errors.newPassword"
            @input="validatePassword" />
        </div>
        <div>
          <Input v-model="confirmPassword" type="password" placeholder="Confirm new password"
            :error="errors.confirmPassword" @input="validateConfirmPassword" />
        </div>
        <Button type="submit" :loading="isLoading" class="w-full">
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
import { ref, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useToast } from '../../composables/useToast';
import { storeToRefs } from 'pinia';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const router = useRouter();
const userStore = useUserStore();
const { showToast } = useToast();

const { isLoading } = storeToRefs(userStore);

const step = ref(1);
const phoneNumber = ref('');
const code = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const cooldown = ref(0);
const cooldownTimer = ref(null);

const errors = ref({
  phoneNumber: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
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

const handlePhoneSubmit = async () => {
  validatePhoneNumber();
  if (errors.value.phoneNumber) return;

  try {
    const response = await userStore.forgotPassword({ phoneNumber: phoneNumber.value });
    if (response) {
      step.value = 2;
      startCooldown();
      showToast('Verification code sent successfully', 'success');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
};

const handleResetSubmit = async () => {
  validateCode();
  validatePassword();
  validateConfirmPassword();

  if (errors.value.code || errors.value.newPassword || errors.value.confirmPassword) return;

  try {
    const response = await userStore.forgotPassword({
      phoneNumber: phoneNumber.value,
      code: code.value,
      newPassword: newPassword.value,
    });
    if (response) {
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
});
</script>