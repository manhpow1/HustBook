import { ref, computed } from 'vue';
import { useAuth } from './useAuth';
import { useAuthValidation } from './useAuthValidation';
import { useErrorHandler } from './useErrorHandler';
import { useRouter } from 'vue-router';
import { useToast } from './useToast';

export function useAuthForm(formType = 'login') {
    const auth = useAuth();
    const validation = useAuthValidation();
    const { handleError } = useErrorHandler();
    const router = useRouter();
    const { showToast } = useToast();

    // Form state
    const isSubmitting = ref(false);
    const rememberMe = ref(false);
    const currentStep = ref(formType);
    const cooldownTime = ref(0);
    const cooldownInterval = ref(null);

    // Computed properties
    const isFormValid = computed(() => {
        if (currentStep.value === 'login') {
            return !validation.hasErrors.value && 
                   validation.fields.value.phoneNumber && 
                   validation.fields.value.password;
        }
        if (currentStep.value === 'verify') {
            return !validation.hasErrors.value && 
                   validation.fields.value.code.every(digit => /^\d$/.test(digit));
        }
        if (currentStep.value === 'signup') {
            return !validation.hasErrors.value && 
                   validation.fields.value.phoneNumber && 
                   validation.fields.value.password;
        }
        if (currentStep.value === 'complete-profile') {
            return !validation.hasErrors.value && 
                   validation.fields.value.userName;
        }
        return false;
    });

    // Timer handling
    const startCooldown = (duration = 60) => {
        cooldownTime.value = duration;
        if (cooldownInterval.value) clearInterval(cooldownInterval.value);
        
        cooldownInterval.value = setInterval(() => {
            if (cooldownTime.value > 0) {
                cooldownTime.value--;
            } else {
                clearInterval(cooldownInterval.value);
            }
        }, 1000);
    };

    const formattedCooldownTime = computed(() => {
        const minutes = Math.floor(cooldownTime.value / 60);
        const seconds = cooldownTime.value % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    // Form submission handlers
    const handleLogin = async () => {
        if (!isFormValid.value || isSubmitting.value) return;
        
        isSubmitting.value = true;
        try {
            const success = await auth.login(
                validation.fields.value.phoneNumber,
                validation.fields.value.password,
                rememberMe.value
            );
            if (success) {
                validation.clearFields();
                router.push({ name: 'Home' });
            }
        } catch (error) {
            handleError(error);
        } finally {
            isSubmitting.value = false;
        }
    };

    const handleSignup = async () => {
        if (!isFormValid.value || isSubmitting.value) return;
        
        isSubmitting.value = true;
        try {
            const success = await auth.register(
                validation.fields.value.phoneNumber,
                validation.fields.value.password
            );
            if (success) {
                currentStep.value = 'verify';
            }
        } catch (error) {
            handleError(error);
        } finally {
            isSubmitting.value = false;
        }
    };

    const handleVerification = async () => {
        if (!isFormValid.value || isSubmitting.value) return;
        
        isSubmitting.value = true;
        try {
            const success = await auth.verifyCode(
                validation.fields.value.phoneNumber,
                validation.formatVerificationCode(validation.fields.value.code)
            );
            if (success) {
                validation.clearFields();
                currentStep.value = 'complete-profile';
            }
        } catch (error) {
            handleError(error);
        } finally {
            isSubmitting.value = false;
        }
    };

    const handleResendCode = async () => {
        if (cooldownTime.value > 0 || isSubmitting.value) return;
        
        isSubmitting.value = true;
        try {
            const success = await auth.requestVerificationCode(
                validation.fields.value.phoneNumber
            );
            if (success) {
                startCooldown();
                showToast('Verification code resent successfully!', 'success');
            }
        } catch (error) {
            handleError(error);
        } finally {
            isSubmitting.value = false;
        }
    };

    const handleCompleteProfile = async () => {
        if (!isFormValid.value || isSubmitting.value) return;
        
        isSubmitting.value = true;
        try {
            const success = await auth.updateProfile({
                userName: validation.fields.value.userName
            });
            if (success) {
                validation.clearFields();
                router.push({ name: 'Home' });
            }
        } catch (error) {
            handleError(error);
        } finally {
            isSubmitting.value = false;
        }
    };

    // Form submission handler based on current step
    const handleSubmit = async () => {
        switch (currentStep.value) {
            case 'login':
                await handleLogin();
                break;
            case 'signup':
                await handleSignup();
                break;
            case 'verify':
                await handleVerification();
                break;
            case 'complete-profile':
                await handleCompleteProfile();
                break;
        }
    };

    // Cleanup on component unmount
    onUnmounted(() => {
        if (cooldownInterval.value) {
            clearInterval(cooldownInterval.value);
        }
    });

    return {
        // State
        isSubmitting,
        rememberMe,
        currentStep,
        cooldownTime,
        formattedCooldownTime,
        isFormValid,

        // Form fields and validation from useAuthValidation
        ...validation,

        // Methods
        handleSubmit,
        handleResendCode,
        startCooldown,
    };
}
