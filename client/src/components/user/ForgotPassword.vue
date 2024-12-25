<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4">
    <Card class="w-full max-w-md p-8">
      <h2 class="text-2xl font-bold mb-6 text-center">Reset Password</h2>

      <form v-if="step === 1" @submit.prevent="handlePhoneSubmit" class="space-y-4">
        <div>
          <Input v-model="phoneNumber" type="tel" placeholder="Enter your phone number" :error="errors.phoneNumber"
            @input="validatePhoneNumber" />
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
import { useFormValidation } from '../../composables/useFormValidation';
import { useUserStore } from '../../stores/userStore';
import { useToast } from '../../composables/useToast';
import { storeToRefs } from 'pinia';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const router = useRouter();
const userStore = useUserStore();
const { validateField } = useFormValidation();
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

const validatePhoneNumber = async () => {
  errors.value.phoneNumber = await validateField('phoneNumber', phoneNumber.value, [
    value => !value && 'Phone number is required',
    value => !/^0\d{9}$/.test(value) && 'Invalid phone number format'
  ]);
};

const validateCode = async () => {
  errors.value.code = await validateField('code', code.value, [
    value => !value && 'Verification code is required',
    value => !/^\d{6}$/.test(value) && 'Code must be 6 digits'
  ]);
};

const validatePassword = async () => {
  errors.value.newPassword = await validateField('password', newPassword.value, [
    value => !value && 'Password is required',
    value => value.length < 6 && 'Password must be at least 6 characters',
    value => value.length > 20 && 'Password must be less than 20 characters'
  ]);
};

const validateConfirmPassword = async () => {
  errors.value.confirmPassword = newPassword.value !== confirmPassword.value ? 'Passwords do not match' : '';
};

const handlePhoneSubmit = async () => {
  await validatePhoneNumber();
  if (errors.value.phoneNumber) return;

  try {
    const success = await userStore.forgotPassword(phoneNumber.value);
    if (success) {
      step.value = 2;
      startCooldown();
      showToast('Verification code sent successfully', 'success');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
};

const handleResetSubmit = async () => {
  await validateCode();
  await validatePassword();
  await validateConfirmPassword();

  if (errors.value.code || errors.value.newPassword || errors.value.confirmPassword) return;

  try {
    const success = await userStore.forgotPassword(phoneNumber.value, code.value, newPassword.value);
    if (success) {
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
    const success = await userStore.forgotPassword(phoneNumber.value);
    if (success) {
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