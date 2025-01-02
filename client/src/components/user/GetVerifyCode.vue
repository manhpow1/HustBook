<template>
    <div class="flex items-center justify-center bg-background">
        <Card class="w-full max-w-md mx-auto">
            <CardHeader>
                <img class="mx-auto h-12 w-auto mb-6" src="../../assets/logo.svg" alt="HUSTBOOK" />
                <CardTitle class="text-2xl text-center flex items-center justify-center">
                    <ShieldCheck class="w-6 h-6 mr-2 text-primary" />
                    Get Verification Code
                </CardTitle>
                <CardDescription class="text-center">
                    Please enter your phone number to receive the verification code.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <Alert v-if="isLocked" variant="destructive" class="mb-6">
                    <AlertCircle class="h-4 w-4" />
                    <AlertTitle>Account Locked</AlertTitle>
                    <AlertDescription>
                        Temporarily locked due to too many attempts. Please try again after 5 minutes.
                    </AlertDescription>
                </Alert>

                <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
                    <FormField v-slot="{ messages }" name="phoneNumber">
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                                <Input v-model="phoneNumber" type="tel" maxlength="10" pattern="[0-9]*"
                                    :disabled="isLoading || cooldownRemaining > 0" @input="handlePhoneNumberInput"
                                    placeholder="Enter your phone number">
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
                            <FormMessage />
                        </FormItem>
                    </FormField>

                    <Button type="submit" class="w-full" :disabled="isLoading || !isValidPhone || cooldownRemaining > 0"
                        :loading="isLoading">
                        <ShieldCheck v-if="!isLoading" class="h-4 w-4 mr-2" />
                        <span v-if="cooldownRemaining > 0">
                            Resend code in {{ cooldownRemaining }}s
                        </span>
                        <span v-else>
                            Get Verification Code
                        </span>
                    </Button>
                </form>

                <Alert v-if="verificationCode" variant="success" class="mt-6">
                    <CheckCircle class="h-4 w-4" />
                    <AlertTitle>Verification Code</AlertTitle>
                    <AlertDescription class="flex justify-between items-center">
                        <span>Your verification code is: <span class="font-bold">{{ verificationCode }}</span></span>
                        <Button variant="outline" size="sm" @click="copyToClipboard">
                            <CopyIcon v-if="!copied" class="h-4 w-4 mr-2" />
                            <CheckIcon v-else class="h-4 w-4 mr-2" />
                            {{ copied ? 'Copied!' : 'Copy' }}
                        </Button>
                    </AlertDescription>

                    <div class="mt-4 space-y-2">
                        <Button class="w-full" @click="copyAndProceed">
                            <ArrowRightIcon class="h-4 w-4 mr-2" />
                            Copy & Continue to Verification
                        </Button>

                        <Button variant="outline" class="w-full" @click="proceedToVerification">
                            <ArrowRightIcon class="h-4 w-4 mr-2" />
                            Skip Copy and Continue
                        </Button>
                    </div>
                </Alert>

                <Alert v-if="successMessage" variant="success" class="mt-4">
                    <CheckCircle class="h-4 w-4" />
                    <AlertDescription>{{ successMessage }}</AlertDescription>
                </Alert>

                <Alert v-if="error" variant="destructive" class="mt-4">
                    <AlertCircle class="h-4 w-4" />
                    <AlertDescription>{{ error }}</AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ShieldCheck, CheckCircle, XCircle, CopyIcon, CheckIcon, ArrowRightIcon, Phone, AlertCircle } from 'lucide-vue-next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useFormValidation } from '../../composables/useFormValidation';
import { useToast } from '../ui/toast';
import { storeToRefs } from 'pinia';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { toast } = useToast();
const { errors, validatePhoneNumber, clearErrors } = useFormValidation();
const { cooldownRemaining, isLoading, isLocked } = storeToRefs(userStore);

const phoneNumber = ref(route.query.phoneNumber || '');
const verificationCode = ref('');
const successMessage = ref('');
const error = ref('');
const copied = ref(false);

const isValidPhone = computed(() => {
    return /^0\d{9}$/.test(phoneNumber.value);
});

const handlePhoneNumberInput = () => {
    phoneNumber.value = phoneNumber.value.replace(/\D/g, '').slice(0, 10);
    if (phoneNumber.value && phoneNumber.value[0] !== '0') {
        phoneNumber.value = '0' + phoneNumber.value;
    }
    clearErrors();
};

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(verificationCode.value);
        copied.value = true;
        toast({
            type: 'success',
            title: 'Success',
            description: 'Verification code copied to clipboard'
        });
        setTimeout(() => {
            copied.value = false;
        }, 2000);
        return true;
    } catch (err) {
        toast({
            type: 'error',
            title: 'Error',
            description: 'Unable to copy verification code'
        });
        return false;
    }
};

const copyAndProceed = async () => {
    const copySuccess = await copyToClipboard();
    if (copySuccess) {
        setTimeout(() => {
            proceedToVerification();
        }, 500);
    }
};

const proceedToVerification = () => {
    router.push({
        name: 'VerifyCode',
        query: { phoneNumber: phoneNumber.value }
    });
};

const handleSubmit = async () => {
    clearErrors();
    if (!validatePhoneNumber(phoneNumber.value)) {
        return;
    }

    if (isLocked.value) {
        toast({
            type: 'error',
            title: 'Error',
            description: 'Account temporarily locked. Please try again later'
        });
        return;
    }

    try {
        const response = await userStore.getVerifyCode(phoneNumber.value);
        if (response.success) {
            successMessage.value = 'Verification code sent successfully!';
            verificationCode.value = response.verifyCode || '';
        } else {
            error.value = 'Unable to retrieve verification code';
        }
    } catch (err) {
        error.value = err.message || 'An error occurred';
    }
};

// Watch for lock status
watch(() => isLocked.value, (newValue) => {
    if (newValue) {
        error.value = 'Temporarily locked due to too many attempts. Please try again after 5 minutes.';
    } else {
        error.value = '';
    }
});
</script>
