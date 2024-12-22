import { ref, computed, watch } from 'vue';
import { useAuth } from './useAuth';
import { useAuthValidation } from './useAuthValidation';
import { useErrorHandler } from './useErrorHandler';
import { useRouter } from 'vue-router';
import { useToast } from './useToast';
import { useDebounce } from './useDebounce';

export function useAuthForm(formType = 'login', options = {}) {
    const auth = useAuth();
    const validation = useAuthValidation(formType);
    const { handleError } = useErrorHandler();
    const router = useRouter();
    const { showToast } = useToast();
    const { debounce } = useDebounce();

    // Form configuration
    const config = {
        redirectOnSuccess: true,
        clearOnSuccess: true,
        showToasts: true,
        validateOnChange: true,
        ...options
    };

    // Enhanced form state
    const state = ref({
        isSubmitting: false,
        isValidating: false,
        rememberMe: false,
        currentStep: formType,
        cooldownTime: 0,
        attemptsRemaining: 5,
        lockoutEndTime: null,
        lastError: null,
        submitCount: 0,
        hasUnsavedChanges: false
    });

    // Debounced validation to prevent excessive API calls
    const debouncedValidate = debounce(async () => {
        if (config.validateOnChange) {
            state.value.isValidating = true;
            try {
                await validation.validateForm();
            } finally {
                state.value.isValidating = false;
            }
        }
    }, 300);

    // Track form changes
    const initialValues = ref(null);
    const saveInitialValues = () => {
        initialValues.value = JSON.stringify(validation.fields.value);
    };

    // Computed form state
    const isLocked = computed(() => {
        if (!state.value.lockoutEndTime) return false;
        return Date.now() < state.value.lockoutEndTime;
    });

    const isFormBusy = computed(() =>
        state.value.isSubmitting ||
        state.value.isValidating ||
        isLocked.value
    );

    const isFormValid = computed(() => {
        const fields = validation.fields.value;
        switch (state.value.currentStep) {
            case 'login':
                return !validation.hasErrors.value &&
                    fields.phoneNumber?.trim() &&
                    fields.password?.trim();
            case 'verify':
                return !validation.hasErrors.value &&
                    fields.code.every(digit => /^\d$/.test(digit));
            case 'signup':
                return !validation.hasErrors.value &&
                    fields.phoneNumber?.trim() &&
                    fields.password?.trim() &&
                    fields.confirmPassword?.trim();
            case 'complete-profile':
                return !validation.hasErrors.value &&
                    fields.userName?.trim();
            default:
                return false;
        }
    });

    const hasUnsavedChanges = computed(() => {
        if (!initialValues.value) return false;
        return initialValues.value !== JSON.stringify(validation.fields.value);
    });

    // Format display values
    const formattedCooldownTime = computed(() => {
        const time = state.value.cooldownTime;
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    const formattedLockoutTime = computed(() => {
        if (!state.value.lockoutEndTime) return '';
        const remaining = Math.max(0, state.value.lockoutEndTime - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    // Rate limiting and lockout
    const handleFailedAttempt = () => {
        state.value.attemptsRemaining--;
        state.value.submitCount++;

        if (state.value.attemptsRemaining <= 0) {
            state.value.lockoutEndTime = Date.now() + (5 * 60 * 1000); // 5 minutes
            if (config.showToasts) {
                showToast('Too many attempts. Please try again later.', 'error');
            }
            startTimer('lockout', 5 * 60 * 1000);
        }
    };

    // Enhanced timer handling
    const timers = ref({
        cooldown: null,
        lockout: null
    });

    const startTimer = (type, duration) => {
        if (timers.value[type]) {
            clearInterval(timers.value[type]);
        }

        const startTime = Date.now();
        const endTime = startTime + duration;

        if (type === 'cooldown') {
            state.value.cooldownTime = Math.ceil(duration / 1000);
        }

        timers.value[type] = setInterval(() => {
            const remaining = endTime - Date.now();

            if (remaining <= 0) {
                clearInterval(timers.value[type]);
                if (type === 'cooldown') {
                    state.value.cooldownTime = 0;
                } else if (type === 'lockout') {
                    state.value.lockoutEndTime = null;
                    state.value.attemptsRemaining = 5;
                }
                return;
            }

            if (type === 'cooldown') {
                state.value.cooldownTime = Math.ceil(remaining / 1000);
            }
        }, 1000);
    };

    // Form Submission Handler with Error Recovery
    const handleSubmit = async () => {
        if (!isFormValid.value || state.value.isSubmitting || isLocked.value) {
            return false;
        }

        state.value.isSubmitting = true;
        state.value.lastError = null;

        try {
            let success = false;
            const fields = validation.fields.value;

            switch (state.value.currentStep) {
                case 'login':
                    success = await auth.login(
                        fields.phoneNumber,
                        fields.password,
                        state.value.rememberMe
                    );
                    break;

                case 'signup':
                    success = await auth.register(
                        fields.phoneNumber,
                        fields.password
                    );
                    if (success) {
                        state.value.currentStep = 'verify';
                        startTimer('cooldown', 60 * 1000); // 1 minute cooldown
                    }
                    break;

                case 'verify':
                    if (state.value.cooldownTime > 0) {
                        if (config.showToasts) {
                            showToast(`Please wait ${formattedCooldownTime.value} before retrying`, 'warning');
                        }
                        return false;
                    }
                    success = await auth.verifyCode(
                        fields.phoneNumber,
                        validation.formatVerificationCode(fields.code)
                    );
                    if (success) {
                        state.value.currentStep = 'complete-profile';
                    }
                    break;

                case 'complete-profile':
                    success = await auth.updateProfile({ userName: fields.userName });
                    break;
            }

            if (success) {
                if (config.clearOnSuccess) {
                    validation.clearFields();
                }
                if (config.redirectOnSuccess) {
                    router.push({ name: 'Home' });
                }
                saveInitialValues();
                return true;
            } else {
                handleFailedAttempt();
                return false;
            }

        } catch (error) {
            state.value.lastError = error;
            handleError(error);
            handleFailedAttempt();
            return false;

        } finally {
            state.value.isSubmitting = false;
        }
    };

    // Form validation watchers
    if (config.validateOnChange) {
        watch(() => validation.fields.value, () => {
            debouncedValidate();
            state.value.hasUnsavedChanges = hasUnsavedChanges.value;
        }, { deep: true });
    }

    // Handle browser navigation/refresh warnings
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges.value) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    // Cleanup function
    const cleanup = () => {
        Object.values(timers.value).forEach(timer => {
            if (timer) clearInterval(timer);
        });
    };

    // Initialize form
    saveInitialValues();

    return {
        // Form state
        state,
        validation,
        isFormBusy,
        isFormValid,
        hasUnsavedChanges,
        isLocked,

        // Methods
        handleSubmit,
        cleanup,

        // Timer methods
        startTimer,

        // Helpers
        handleFailedAttempt,
        saveInitialValues,

        // Computed values
        formattedCooldownTime,
        formattedLockoutTime
    };
}
