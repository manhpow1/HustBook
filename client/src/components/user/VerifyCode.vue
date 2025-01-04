<template>
    <div class="flex items-center justify-center bg-background">
        <Card class="w-full max-w-md mx-auto">
            <CardHeader>
                <img class="mx-auto h-12 w-auto mb-6" src="../../assets/logo.svg" alt="HUSTBOOK" />
                <CardTitle class="text-2xl text-center flex items-center justify-center">
                    <ShieldCheck class="w-6 h-6 mr-2 text-primary" />
                    Verify Your Account
                </CardTitle>
                <CardDescription class="text-center">
                    Please enter the verification code
                </CardDescription>
            </CardHeader>

            <CardContent>

                <Alert v-if="isLocked" variant="destructive" class="mb-6">
                    <AlertCircle class="h-4 w-4" />
                    <AlertTitle>Account Locked</AlertTitle>
                    <AlertDescription>
                        Temporarily locked due to too many incorrect attempts.
                        <br />Please try again after 5 minutes.
                    </AlertDescription>
                </Alert>

                <Alert v-else-if="remainingAttempts < 5" variant="warning" class="mb-6">
                    <AlertTriangle class="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                        {{ remainingAttempts }} attempts remaining
                    </AlertDescription>
                </Alert>

                <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
                    <FormField v-slot="{ messages }" name="verificationCode">
                        <FormItem>
                            <FormLabel>Verification Code</FormLabel>
                            <FormControl>
                                <div class="flex justify-between gap-2">
                                    <Input v-for="(digit, index) in 6" :key="index" v-model="codeDigits[index]"
                                        type="text" maxlength="1" class="w-12 h-12 text-center text-lg font-semibold"
                                        :class="{ 'border-destructive': verifyCodeError }"
                                        @input="handleDigitInput($event, index)" @keydown="handleKeyDown($event, index)"
                                        @paste="handlePaste" ref="digitInputs" />
                                </div>
                            </FormControl>
                            <FormMessage>{{ verifyCodeError }}</FormMessage>
                        </FormItem>
                    </FormField>

                    <div class="space-y-4">
                        <Button v-if="!verificationSuccess" type="submit" class="w-full"
                            :disabled="!isCodeComplete || isLoading" :loading="isLoading">
                            <ShieldCheck v-if="!isLoading" class="h-4 w-4 mr-2" />
                            Verify Code
                        </Button>


                        <!-- Resend Code Button -->
                        <Button type="button" @click="handleResendCode" :disabled="cooldownRemaining > 0 || isLoading"
                            class="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                            <RefreshCw v-if="!cooldownRemaining" class="h-5 w-5 mr-2" />
                            <span v-if="cooldownRemaining > 0">
                                Resend code in {{ cooldownRemaining }}s
                            </span>
                            <span v-else>Resend Code</span>
                        </Button>
                    </div>
                    </form>

                    <Button v-if="verificationSuccess" variant="success" class="w-full mt-4"
                            @click="router.push({ name: 'CompleteProfile', query: { phoneNumber } })">
                            <UserPlus class="h-4 w-4 mr-2" />
                            Complete Your Profile
                        </Button>

                <!-- Back Button -->
                <div class="mt-4">
                    <button @click="goBack"
                        class="w-full flex justify-center items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                        <ArrowLeft class="h-4 w-4 mr-2" />
                        Go back
                    </button>
                </div>
            </CardContent>
        </Card>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { ShieldCheck, RefreshCw, AlertCircle, AlertTriangle, ArrowLeft, UserPlus } from 'lucide-vue-next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { storeToRefs } from 'pinia';
import { useToast } from '../ui/toast';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { toast } = useToast();
const { isLoading, cooldownRemaining, isLocked, remainingAttempts, verifyCodeError, isVerifyCodeExpired } = storeToRefs(userStore);

const phoneNumber = ref(route.query.phoneNumber);
const codeDigits = ref(Array(6).fill(''));
const digitInputs = ref([]);
const verificationSuccess = ref(false);

const isCodeComplete = computed(() => {
    return codeDigits.value.every(digit => digit !== '');
});

const handleDigitInput = (event, index) => {
    const input = event.target;
    const value = input.value;

    if (!/^\d*$/.test(value)) {
        input.value = '';
        return;
    }

    codeDigits.value[index] = value;

    if (value !== '' && index < 5) {
        digitInputs.value[index + 1].focus();
    }
};

const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !codeDigits.value[index] && index > 0) {
        codeDigits.value[index - 1] = '';
        digitInputs.value[index - 1].focus();
    }
};

const handlePaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text');
    const numbers = pastedData.replace(/\D/g, '').slice(0, 6);

    numbers.split('').forEach((number, index) => {
        if (index < 6) {
            codeDigits.value[index] = number;
        }
    });
};

const handleSubmit = async () => {
    if (!isCodeComplete.value || isLoading.value) return;

    const verifyCode = codeDigits.value.join('');
    const result = await userStore.verifyCode(phoneNumber.value, verifyCode);

    if (result.success) {
        verificationSuccess.value = true;
        if (result.exists) {
            const token = result.token;
            if (token) {
                localStorage.setItem('user', JSON.stringify({ isVerified: true }));
                Cookies.set('accessToken', token, { expires: 1 / 96 });
            }
        }
    } else if (isVerifyCodeExpired.value) {
        codeDigits.value = Array(6).fill('');
        digitInputs.value[0]?.focus();
    }
};


const handleResendCode = async () => {
    const response = await userStore.getVerifyCode(phoneNumber.value);
    if (response.success) {
        toast({
            type: 'success',
            title: 'Success',
            description: 'New verification code sent successfully'
        });
        codeDigits.value = Array(6).fill('');
        digitInputs.value[0]?.focus();
    } else {
        toast({
            type: 'error',
            title: 'Error',
            description: 'Failed to send new verification code'
        });
    }
};

const goBack = () => {
    router.push({
        name: 'GetVerifyCode',
        query: { phoneNumber: phoneNumber.value }
    });
};

onMounted(() => {
    if (!phoneNumber.value) {
        router.push('/get-verify-code');
        return;
    }
    nextTick(() => {
        const element = digitInputs.value[0];
        if (element && typeof element.focus === 'function') {
            element.focus();
        }
    });
});

watch(isVerifyCodeExpired, (newValue) => {
    if (newValue) {
        codeDigits.value = Array(6).fill('');
    }
});
</script>
