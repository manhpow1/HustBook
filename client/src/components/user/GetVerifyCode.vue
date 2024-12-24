<template>
    <Card class="max-w-md mx-auto mt-8">
        <div class="text-center">
            <img class="mx-auto h-12 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
            <h2 class="mt-6 text-3xl font-extrabold text-gray-900 flex items-center justify-center">
                <ShieldCheck class="w-8 h-8 mr-2 text-indigo-600" aria-hidden="true" />
                Get Verification Code
            </h2>
            <p class="mt-2 text-sm text-gray-600">
                We'll send a verification code to your phone
            </p>
        </div>

        <Alert v-if="userStore.verificationAttempts >= 3" type="error">
            Too many attempts. Please try again later.
        </Alert>

        <Alert v-else-if="userStore.verificationAttempts > 0" type="warning">
            {{ 5 - userStore.verificationAttempts }} verification attempts remaining
        </Alert>

        <form @submit.prevent="handleSubmit" class="mt-8 space-y-6" novalidate>
            <Input v-model="phoneNumber" type="tel" name="phoneNumber" label="Phone Number"
                placeholder="Enter your phone number" :error="errors.phoneNumber?.[0]"
                :disabled="userStore.isLoading || userStore.cooldownRemaining > 0" required>
            <template #prefix>
                <Phone class="h-5 w-5 text-gray-500" aria-hidden="true" />
            </template>
            </Input>

            <Button type="submit" :loading="userStore.isLoading"
                :disabled="userStore.isLoading || userStore.cooldownRemaining > 0" class="w-full">
                <template #prefix>
                    <ShieldCheck class="h-5 w-5" aria-hidden="true" />
                </template>
                <span v-if="userStore.cooldownRemaining > 0">
                    Resend code in {{ userStore.cooldownRemaining }}s
                </span>
                <span v-else>Get Verification Code</span>
            </Button>
        </form>
    </Card>
</template>

<script setup>
import { ref } from 'vue';
import { ShieldCheck, Phone } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useFormValidation } from '../../composables/useFormValidation';
import Card from '../ui/Card.vue';
import Input from '../ui/Input.vue';
import Button from '../ui/Button.vue';
import Alert from '../ui/Alert.vue';

const router = useRouter();
const userStore = useUserStore();
const { errors, validatePhoneNumber, clearErrors } = useFormValidation();

const phoneNumber = ref('');

const handleSubmit = async () => {
    clearErrors();

    if (!validatePhoneNumber(phoneNumber.value)) {
        return;
    }

    try {
        await userStore.requestVerificationCode(phoneNumber.value);
        router.push({
            name: 'verify-code',
            params: { phoneNumber: phoneNumber.value }
        });
    } catch (error) {
        // Error handling is managed by userStore and useErrorHandler
    }
};
</script>
