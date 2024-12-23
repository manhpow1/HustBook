<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4">
    <Card class="w-full max-w-md p-8">
      <h2 class="text-2xl font-bold mb-6 text-center">Reset Password</h2>

      <!-- Step 1: Phone Number -->
      <form v-if="step === 1" @submit.prevent="handlePhoneSubmit" class="space-y-4">
        <div>
          <Input v-model="phoneNumber" type="tel" placeholder="Enter your phone number" :error="errors.phoneNumber"
            @input="errors.phoneNumber = ''" />
        </div>
        <Button type="submit" :loading="loading" class="w-full">
          Send Verification Code
        </Button>
        <div class="text-center mt-4">
          <router-link to="/login" class="text-blue-600 hover:text-blue-800">
            Back to Login
          </router-link>
        </div>
      </form>

      <!-- Step 2: Verification Code and New Password -->
      <form v-if="step === 2" @submit.prevent="handleResetSubmit" class="space-y-4">
        <div>
          <Input v-model="code" type="text" maxlength="6" placeholder="Enter verification code" :error="errors.code"
            @input="errors.code = ''" />
        </div>
        <div>
          <Input v-model="newPassword" type="password" placeholder="Enter new password" :error="errors.newPassword"
            @input="errors.newPassword = ''" />
        </div>
        <div>
          <Input v-model="confirmPassword" type="password" placeholder="Confirm new password"
            :error="errors.confirmPassword" @input="errors.confirmPassword = ''" />
        </div>
        <Button type="submit" :loading="loading" class="w-full">
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
import { useAuth } from '../../composables/useAuth';
import Card from '../../components/ui/Card.vue';
import Input from '../../components/ui/Input.vue';
import Button from '../../components/ui/Button.vue';

const router = useRouter();
const { forgotPassword } = useAuth();

// Form state
const step = ref(1);
const phoneNumber = ref('');
const code = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const cooldown = ref(0);
const cooldownTimer = ref(null);

// Error handling
const errors = ref({
  phoneNumber: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
});

// Handle phone number submission
const handlePhoneSubmit = async () => {
  if (!phoneNumber.value) {
    errors.value.phoneNumber = 'Phone number is required';
    return;
  }

  loading.value = true;
  const success = await forgotPassword(phoneNumber.value);
  loading.value = false;

  if (success) {
    step.value = 2;
    startCooldown();
  }
};

// Handle password reset submission
const handleResetSubmit = async () => {
  // Validate inputs
  if (!code.value) {
    errors.value.code = 'Verification code is required';
    return;
  }
  if (!newPassword.value) {
    errors.value.newPassword = 'New password is required';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    errors.value.confirmPassword = 'Passwords do not match';
    return;
  }

  loading.value = true;
  const success = await forgotPassword(phoneNumber.value, code.value, newPassword.value);
  loading.value = false;

  if (success) {
    router.push('/login');
  }
};

// Resend verification code
const resendCode = async () => {
  if (cooldown.value > 0) return;

  loading.value = true;
  const success = await forgotPassword(phoneNumber.value);
  loading.value = false;

  if (success) {
    startCooldown();
  }
};

// Cooldown timer for resend code
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

// Cleanup
onBeforeUnmount(() => {
  if (cooldownTimer.value) {
    clearInterval(cooldownTimer.value);
  }
});
</script>
