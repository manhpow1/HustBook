<template>
  <div class="flex items-center justify-center bg-background">
    <Card class="w-full max-w-md mx-auto">
      <CardHeader>
        <img class="mx-auto h-12 w-auto mb-6" src="../../assets/logo.svg" alt="HUSTBOOK" />
        <CardTitle class="text-2xl text-center">
          {{ currentStep === 'signup' ? 'Create your account' : 'Verify your account' }}
        </CardTitle>
        <CardDescription class="text-center">
          Or
          <router-link to="/login" class="font-medium text-primary hover:text-primary/90">
            sign in to your existing account
          </router-link>
        </CardDescription>
      </CardHeader>
      <CardContent>

        <div v-if="currentStep === 'signup'">
          <form @submit.prevent="handleSignup" class="space-y-6" novalidate>
            <FormField v-slot="{ messages }" name="phoneNumber">
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input v-model="phoneNumber" type="tel" maxlength="10" pattern="[0-9]*" :disabled="isLoading"
                    @input="formatPhoneNumber" @blur="handlePhoneBlur" placeholder="Phone number (10 digits)">
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
                  <Input v-model="password" type="password" :disabled="isLoading" @input="handlePasswordInput"
                    @blur="handlePasswordBlur" placeholder="Enter your password">
                  <template #prefix>
                    <Lock class="h-4 w-4 text-muted-foreground" />
                  </template>
                  </Input>
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <div class="flex items-center space-x-2">
              <Checkbox v-model="rememberMe" id="rememberMe" />
              <label for="rememberMe"
                class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Remember me
              </label>
            </div>

            <Button type="submit" class="w-full" :disabled="isLoading || !isValid" :loading="isLoading">
              {{ isLoading ? 'Signing up...' : 'Sign Up' }}
            </Button>
          </form>

          <div v-if="password" class="space-y-2">
            <p class="text-sm font-medium">Password strength: {{ passwordStrength.text }}</p>
            <Progress :value="passwordStrength.score" :class="passwordStrength.colorClass" />
          </div>

        </div>

        <VerifyCode v-else-if="currentStep === 'verify'" :phoneNumber="phoneNumber"
          @verification-success="handleVerificationSuccess" @verification-error="handleVerificationError" />

        <Alert v-if="currentStep === 'complete'" variant="success">
          <CheckCircle class="h-4 w-4" />
          <AlertTitle>Account created successfully</AlertTitle>
          <AlertDescription>Complete your profile to continue.</AlertDescription>
          <Button class="w-full mt-4" @click="router.push('/complete-profile')">
            Complete Profile
          </Button>
        </Alert>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import logger from '@/services/logging'
import { toast } from '../ui/toast/use-toast'
import { useFormValidation } from '../../composables/useFormValidation'
import { storeToRefs } from 'pinia'
import { CheckCircle, Lock, Phone } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { Progress } from '../ui/progress'
import { Alert, AlertTitle, AlertDescription } from '../ui/alert'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '../ui/form'
import VerifyCode from './VerifyCode.vue'

const router = useRouter()
const userStore = useUserStore()
const { errors, validatePassword, validatePhoneNumber, clearErrors } = useFormValidation()
const { isLoading } = storeToRefs(userStore)

const currentStep = ref('signup')
const phoneNumber = ref('')
const password = ref('')
const rememberMe = ref(false)

const touched = ref({
  phoneNumber: false,
  password: false,
})

const formatPhoneNumber = (event) => {
  // Remove any non-digit characters
  let value = event.target.value.replace(/\D/g, '')

  // Ensure it starts with 0
  if (value && value[0] !== '0') {
    value = '0' + value
  }

  // Limit to 10 digits
  value = value.slice(0, 10)

  // Update the input value
  phoneNumber.value = value

  // Only validate if field has been touched before
  if (touched.value.phoneNumber) {
    validatePhoneNumber(value)
  }
}

const handlePhoneBlur = () => {
  validatePhoneNumber(phoneNumber.value)
  touched.value.phoneNumber = true
}

const handlePasswordInput = () => {
  validatePassword(password.value, phoneNumber.value)
  touched.value.password = true
}

const handlePasswordBlur = () => {
  validatePassword(password.value, phoneNumber.value)
  touched.value.password = true
}

const isValid = computed(() => {
  if (!phoneNumber.value || !password.value) {
    return false
  }
  validatePhoneNumber(phoneNumber.value)
  validatePassword(password.value, phoneNumber.value)

  // Check if any field has errors (non-empty error arrays)
  return !Object.values(errors.value).some(fieldErrors => fieldErrors.length > 0)
})

const handleSignup = async () => {
  clearErrors()
  validatePhoneNumber(phoneNumber.value)
  validatePassword(password.value, phoneNumber.value)

  if (!isValid.value) {
    logger.warn('Form validation failed', { errors: errors.value })
    return
  }

  try {
    const success = await userStore.register(phoneNumber.value, password.value)
    if (success) {
      toast({
        type: 'success',
        title: 'Success',
        description: 'Registration successful!'
      })
      router.push({ name: 'GetVerifyCode', query: { phoneNumber: phoneNumber.value } })
      // After navigating to GetVerifyCode, we will handle the verification process there
    }
  } catch (error) {
    logger.error('Registration failed', { error })
    toast({
      type: 'error',
      title: 'Error',
      description: error.message || 'Registration failed'
    });
  }
}

const handleVerificationSuccess = () => {
  toast({
    type: 'success',
    title: 'Success',
    description: 'Verification successful!'
  })
  currentStep.value = 'complete'
}

const handleVerificationError = (error) => {
  toast({
    type: 'error',
    title: 'Error',
    description: error.message || 'Verification failed'
  });
}

const passwordStrength = computed(() => {
  if (!password.value) return { score: 0, text: '', colorClass: '' }

  let score = 0
  if (password.value.length >= 8) score += 20
  if (/[A-Z]/.test(password.value)) score += 20
  if (/[a-z]/.test(password.value)) score += 20
  if (/\d/.test(password.value)) score += 20
  if (!/[^a-zA-Z0-9]/.test(password.value)) score += 20 // Only letters and numbers

  // Deductions
  if (/(.)\1{2,}/.test(password.value)) score -= 20 // Repeated characters
  if (/^(?:abc|123|password|admin|user|login|welcome|qwerty|asdfgh|zxcvbn)/i.test(password.value)) score -= 20 // Common patterns
  if (password.value === phoneNumber.value) score = 0 // Matches phone number

  score = Math.max(0, Math.min(100, score)) // Ensure score is between 0 and 100

  let text = 'Weak'
  let colorClass = 'bg-red-500'

  if (score >= 80) {
    text = 'Very Strong'
    colorClass = 'bg-green-500'
  } else if (score >= 60) {
    text = 'Strong'
    colorClass = 'bg-blue-500'
  } else if (score >= 40) {
    text = 'Medium'
    colorClass = 'bg-yellow-500'
  }

  return { score, text, colorClass }
})
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
