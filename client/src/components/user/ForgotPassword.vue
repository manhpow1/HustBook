<template>
  <div class="flex items-center justify-center min-h-screen bg-background">
    <Card class="w-full max-w-md mx-auto">
      <CardHeader class="space-y-2">
        <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
        <CardTitle class="text-2xl text-center flex items-center justify-center">
          <KeyIcon class="w-6 h-6 mr-2 text-primary" />
          Reset Password
        </CardTitle>
        <CardDescription class="text-center">
          Reset your password using phone verification
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-4">
        <Alert v-if="verificationCode" variant="info" class="mb-4">
          <AlertTitle>Verification Code</AlertTitle>
          <AlertDescription class="flex items-center justify-between">
            <span>Your code is: <strong>{{ verificationCode }}</strong></span>
            <Button variant="outline" size="sm" class="flex items-center gap-2" @click="copyCode">
              <Copy v-if="!copied" class="h-4 w-4" />
              <CheckIcon v-else class="h-4 w-4" />
              {{ copied ? 'Copied!' : 'Copy' }}
            </Button>
          </AlertDescription>
        </Alert>

        <!-- Step 1: Phone Number Form -->
        <form v-if="step === 1" @submit.prevent="handlePhoneSubmit" class="space-y-6">
          <FormField v-slot="{ messages }" name="phoneNumber">
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input v-model="phoneNumber" type="tel" placeholder="Enter your phone number" :disabled="isLoading"
                  @input="handlePhoneInput">
                <template #prefix>
                  <Phone class="h-4 w-4 text-muted-foreground" />
                </template>
                <template #suffix>
                  <XCircle v-if="errors.phoneNumber" class="h-4 w-4 text-destructive cursor-pointer"
                    @click="phoneNumber = ''" />
                  <CheckCircle v-else-if="isValidPhone" class="h-4 w-4 text-success" />
                </template>
                </Input>
              </FormControl>
              <FormMessage>{{ errors.phoneNumber }}</FormMessage>
            </FormItem>
          </FormField>

          <Button type="submit" :loading="isLoading" class="w-full" :disabled="!isValidPhone || isLoading">
            <KeyIcon v-if="!isLoading" class="h-4 w-4 mr-2" />
            Get Verification Code
          </Button>

          <div class="text-center">
            <Button variant="link" @click="router.push('/login')">
              Back to Login
            </Button>
          </div>
        </form>

        <!-- Step 2: Verification and New Password Form -->
        <form v-if="step === 2" @submit.prevent="handleResetSubmit" class="space-y-6">
          <FormField v-slot="{ messages }" name="verificationCode">
            <FormItem>
              <FormLabel>Verification Code</FormLabel>
              <FormControl>
                <Input v-model="code" type="text" placeholder="Enter verification code" maxlength="6"
                  :disabled="isLoading" @input="handleCodeInput">
                <template #prefix>
                  <ShieldCheck class="h-4 w-4 text-muted-foreground" />
                </template>
                </Input>
              </FormControl>
              <FormMessage>{{ errors.code }}</FormMessage>
              <FormDescription v-if="remainingAttempts < 5">
                {{ remainingAttempts }} attempts remaining
              </FormDescription>
            </FormItem>
          </FormField>

          <FormField v-slot="{ messages }" name="newPassword">
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input v-model="newPassword" type="password" placeholder="Enter new password" :disabled="isLoading"
                  @input="() => validatePassword()">
                <template #prefix>
                  <Lock class="h-4 w-4 text-muted-foreground" />
                </template>
                </Input>
              </FormControl>
              <FormMessage>{{ errors.newPassword }}</FormMessage>
              <FormDescription>
                Password must be at least 8 characters with uppercase, lowercase, and numbers
              </FormDescription>
            </FormItem>
          </FormField>

          <FormField v-slot="{ messages }" name="confirmPassword">
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input v-model="confirmPassword" type="password" placeholder="Confirm new password"
                  :disabled="isLoading" @input="() => validateConfirmPassword()">
                <template #prefix>
                  <Lock class="h-4 w-4 text-muted-foreground" />
                </template>
                </Input>
              </FormControl>
              <FormMessage>{{ errors.confirmPassword }}</FormMessage>
            </FormItem>
          </FormField>

          <div class="space-y-4">
            <Button type="submit" :loading="isLoading" class="w-full" :disabled="!isFormValid || isLoading">
              <KeyIcon v-if="!isLoading" class="h-4 w-4 mr-2" />
              Reset Password
            </Button>

            <Button type="button" variant="outline" @click="resendCode" :disabled="cooldown > 0 || isLoading"
              class="w-full">
              <RefreshCw v-if="!cooldown" class="h-4 w-4 mr-2" />
              {{ cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code' }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '../ui/toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { KeyIcon, Copy, CheckIcon, AlertCircle, AlertTriangle, Phone, Lock, XCircle, CheckCircle, ShieldCheck, RefreshCw } from 'lucide-vue-next';
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
    toast({
      type: 'success',
      title: 'Success',
      description: 'Verification code copied to clipboard'
    });
  } catch (error) {
    toast({
      type: 'error',
      title: 'Error',
      description: 'Failed to copy verification code'
    });
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
      toast({
        type: 'success',
        description: 'Verification code sent successfully',
        duration: 4000
      });

      // Store verification code in localStorage for step 2
      localStorage.setItem('resetPhoneNumber', phoneNumber.value);
    }
  } catch (error) {
    toast({
      type: 'error',
      description: error.message || 'Failed to send verification code',
      duration: 5000
    });
    logger.error('Phone submission error:', error);
  }
};

const handleResetSubmit = async () => {
  submitted.value = true;
  if (!validateCode() || !validatePassword() || !validateConfirmPassword()) return;

  const storedPhone = localStorage.getItem('resetPhoneNumber');
  if (!storedPhone || !code.value || !newPassword.value) {
    toast({
      type: 'error',
      title: 'Validation Error',
      description: 'Verification code and new password are required'
    });
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
      toast({
        type: 'success',
        title: 'Success',
        description: 'Your password has been reset successfully'
      });
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
      toast({
        type: 'success',
        title: 'Success',
        description: 'New verification code sent successfully'
      });
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
