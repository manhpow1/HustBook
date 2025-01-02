<template>
  <div class="flex items-center justify-center min-h-screen bg-background">
    <Card class="w-full max-w-md mx-auto">
      <CardHeader>
        <img class="mx-auto h-12 w-auto mb-6" src="../../assets/logo.svg" alt="HUSTBOOK" />
        <CardTitle class="text-2xl text-center">Sign in to your account</CardTitle>
        <CardDescription class="text-center">
          Or
          <router-link to="/signup" class="font-medium text-primary hover:text-primary/90">
            create a new account
          </router-link>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Alert v-if="showSessionWarning" variant="warning" class="mb-4">
          <AlertCircle class="h-4 w-4" />
          <AlertTitle>Session Expiring Soon</AlertTitle>
          <AlertDescription>
            Your session will expire soon. Please save your work and re-login.
          </AlertDescription>
        </Alert>

        <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
          <FormField v-slot="{ messages }" name="phoneNumber">
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input v-model="phoneNumber" type="tel" maxlength="10" pattern="[0-9]*" :disabled="isFormDisabled"
                  placeholder="Phone number (10 digits)">
                <template #prefix>
                  <Phone class="h-4 w-4 text-muted-foreground" />
                </template>
                </Input>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ messages }" name="password">
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input v-model="password" :type="showPassword ? 'text' : 'password'" :disabled="isFormDisabled"
                  placeholder="Enter your password">
                <template #prefix>
                  <Lock class="h-4 w-4 text-muted-foreground" />
                </template>
                <template #suffix>
                  <button type="button" @click="togglePasswordVisibility"
                    class="text-muted-foreground hover:text-foreground">
                    <EyeIcon v-if="showPassword" class="h-4 w-4" />
                    <EyeOffIcon v-else class="h-4 w-4" />
                  </button>
                </template>
                </Input>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <Alert v-if="remainingAttempts <= 2 && remainingAttempts > 0" variant="warning">
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>
              {{ remainingAttempts }} login attempts remaining before temporary lockout
            </AlertDescription>
          </Alert>

          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <Checkbox v-model="rememberMe" id="remember-me" :disabled="isFormDisabled" />
              <label for="remember-me"
                class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Remember me
              </label>
            </div>
            <router-link :to="{ name: 'ForgotPassword' }"
              class="text-sm font-medium text-primary hover:text-primary/90">
              Forgot your password?
            </router-link>
          </div>

          <Button type="submit" class="w-full" :disabled="isFormDisabled" :loading="isLoading">
            {{ loginButtonText }}
          </Button>

          <Alert v-if="loginSuccess" variant="success">
            <CheckCircle class="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Login successful! Redirecting...</AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import Cookies from 'js-cookie';
import { Lock, Phone, CheckCircle, AlertCircle, EyeIcon, EyeOffIcon } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useUserStore } from '../../stores/userStore';
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '../ui/toast';

const router = useRouter();
const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { toast } = useToast();

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
      toast({
        type: 'success',
        title: 'Success',
        description: 'Login successful!'
      });
      // Server already verified the user, no need to fetch profile again
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
    toast({
      type: 'error',
      title: 'Error',
      description: 'An unexpected error occurred. Please try again.'
    });
  }
};

const togglePasswordVisibility = () => showPassword.value = !showPassword.value;

const showSessionTimeoutWarning = () => {
  showSessionWarning.value = true;
  toast({
    type: 'warning',
    title: 'Warning',
    description: 'Your session will expire soon. Please re-login.'
  });
};

watch(
  () => successMessage.value,
  (val) => {
    if (val) {
      setTimeout(async () => {
        if (userStore.isLoggedIn) {
          await userStore.fetchUserProfile();
          router.push({ name: 'Home' });
        }
      }, 1500);
    }
  }
);

onMounted(() => {
  if (isSessionExpired.value) {
    toast({
      type: 'warning',
      title: 'Warning',
      description: 'Your previous session has expired. Please login again.'
    });
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
