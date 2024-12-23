import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useAuth } from './useAuth';
import { useAuthValidation } from './useAuthValidation';
import { useErrorHandler } from './useErrorHandler';
import { useRouter } from 'vue-router';
import { useToast } from './useToast';
import { useDebounce } from './useDebounce';

export function useAuthForm(formType = 'login', options = {}) {
    const auth = useAuth();
    const validation = useAuthValidation(); // initialize the validation fields
    const { handleError } = useErrorHandler();
    const router = useRouter();
    const { showToast } = useToast();

    // Set initial validation fields
    validation.fields.value = {
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        userName: '',
        code: Array(6).fill(''),
    };
    const debouncedValidate = useDebounce(async () => {
        if (config.validateOnChange) {
            state.value.isValidating = true;
            try {
                await validation.validateForm();
            } finally {
                state.value.isValidating = false;
            }
        }
    }, 300);

    // -------------------------------------------------------------------------
    // Config & initial form state
    // -------------------------------------------------------------------------
    const config = {
        redirectOnSuccess: true,
        clearOnSuccess: true,
        showToasts: true,
        validateOnChange: true,
        ...options,
    };

    // This composable expects multi-step (login -> verify -> complete-profile).
    // The "fields" come from `validation.fields.value`.
    const state = ref({
        fields: validation.fields.value,  // Reference validation fields directly
        currentStep: formType,
        isSubmitting: false,
        isValidating: false,
        rememberMe: false,

        cooldownTime: 0,
        attemptsRemaining: 5,
        lockoutEndTime: null,

        lastError: null,
        submitCount: 0,
        hasUnsavedChanges: false,
    });


    // -------------------------------------------------------------------------
    // Tracking initial & unsaved changes
    // -------------------------------------------------------------------------
    const initialValues = ref('');
    function saveInitialValues() {
        initialValues.value = JSON.stringify(validation.fields.value);
    }

    const hasUnsavedChanges = computed(() => {
        if (!initialValues.value) return false;
        return initialValues.value !== JSON.stringify(validation.fields.value);
    });

    // -------------------------------------------------------------------------
    // Lockout logic
    // -------------------------------------------------------------------------
    const isLocked = computed(() => {
        if (!state.value.lockoutEndTime) return false;
        return Date.now() < state.value.lockoutEndTime;
    });

    // Are we busy?
    const isFormBusy = computed(() =>
        state.value.isSubmitting || state.value.isValidating || isLocked.value
    );

    // Format times for UI
    const formattedCooldownTime = computed(() => {
        const t = state.value.cooldownTime;
        const minutes = Math.floor(t / 60);
        const seconds = t % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    const formattedLockoutTime = computed(() => {
        if (!state.value.lockoutEndTime) return '';
        const remaining = Math.max(0, state.value.lockoutEndTime - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    // Timers
    const timers = ref({
        cooldown: null,
        lockout: null,
    });

    function startTimer(type, duration) {
        if (timers.value[type]) {
            clearInterval(timers.value[type]);
        }
        const startTime = Date.now();
        const endTime = startTime + duration;

        // If cooldown, set initial
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
    }

    // -------------------------------------------------------------------------
    // Step-based form validity
    // -------------------------------------------------------------------------
    const isFormValid = computed(() => {
        if (!validation.fields.value || validation.hasErrors.value) return false;

        const fields = validation.fields.value;
        
        switch (state.value.currentStep) {
            case 'login':
                return Boolean(fields.phoneNumber?.trim() && fields.password?.trim());

            case 'verify':
                return Array.isArray(fields.code) && fields.code.every((digit) => /^\d$/.test(digit));

            case 'signup':
                return Boolean(fields.phoneNumber?.trim() && fields.password?.trim() && fields.confirmPassword?.trim());

            case 'complete-profile':
                return Boolean(fields.userName?.trim());

            default:
                return false;
        }
    });

    // -------------------------------------------------------------------------
    // Handle a failed attempt -> reduce attempts, possibly lock
    // -------------------------------------------------------------------------
    function handleFailedAttempt() {
        state.value.attemptsRemaining -= 1;
        state.value.submitCount += 1;

        if (state.value.attemptsRemaining <= 0) {
            state.value.lockoutEndTime = Date.now() + 5 * 60 * 1000; // 5 minutes
            if (config.showToasts) {
                showToast('Too many attempts. Please try again later.', 'error');
            }
            // Start a lockout timer
            startTimer('lockout', 5 * 60 * 1000);
        }
    }

    // -------------------------------------------------------------------------
    // handleSubmit logic for each step
    // -------------------------------------------------------------------------
    async function handleSubmit() {
        if (!isFormValid.value || state.value.isSubmitting || isLocked.value) {
            return false;
        }

        state.value.isSubmitting = true;
        state.value.lastError = null;

        try {
            let success = false;
            const {
                phoneNumber,
                password,
                code,
                confirmPassword,
                userName,
            } = validation.fields.value;

            switch (state.value.currentStep) {
                case 'login':
                    success = await auth.login(phoneNumber, password, state.value.rememberMe);
                    break;

                case 'signup':
                    success = await auth.register(phoneNumber, password);
                    // if success, move to verify step
                    if (success) {
                        state.value.currentStep = 'verify';
                        // e.g. a short cooldown before re-sending code
                        startTimer('cooldown', 60 * 1000);
                    }
                    break;

                case 'verify':
                    // If user tries again too soon, show message
                    if (state.value.cooldownTime > 0 && config.showToasts) {
                        showToast(
                            `Please wait ${formattedCooldownTime.value} before retrying`,
                            'warning'
                        );
                        return false;
                    }
                    // verification code is an array of digits
                    const verificationCode = code.join('');
                    success = await auth.verifyCode(phoneNumber, verificationCode);
                    // if success, move to complete-profile
                    if (success) {
                        state.value.currentStep = 'complete-profile';
                    }
                    break;

                case 'complete-profile':
                    success = await auth.updateProfile({ userName });
                    break;
            }

            if (success) {
                // On success, optionally clear + redirect
                if (config.clearOnSuccess) {
                    validation.clearFields();
                }
                if (config.redirectOnSuccess && state.value.currentStep === 'login') {
                    router.push({ name: 'Home' });
                }
                saveInitialValues();
                return true;
            } else {
                handleFailedAttempt();
                return false;
            }
        } catch (err) {
            state.value.lastError = err;
            handleError(err);
            handleFailedAttempt();
            return false;
        } finally {
            state.value.isSubmitting = false;
        }
    }

    // -------------------------------------------------------------------------
    // Watch for changes in `validation.fields.value`
    // -------------------------------------------------------------------------
    if (config.validateOnChange) {
        watch(
            () => validation.fields.value,
            () => {
                debouncedValidate();
                state.value.hasUnsavedChanges = hasUnsavedChanges.value;
            },
            { deep: true }
        );
    }

    // If user tries to close the browser tab with unsaved changes
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges.value) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------
    function cleanup() {
        Object.values(timers.value).forEach((timer) => {
            if (timer) clearInterval(timer);
        });
    }

    onBeforeUnmount(() => {
        cleanup();
    });

    // -------------------------------------------------------------------------
    // Initialize
    // -------------------------------------------------------------------------
    saveInitialValues();

    // -------------------------------------------------------------------------
    // Return everything needed by components
    // -------------------------------------------------------------------------
    return {
        // State
        state,
        validation, // includes validation.fields, errors, etc.

        // Computed
        isFormBusy,
        isFormValid,
        isLocked,
        hasUnsavedChanges,
        formattedCooldownTime,
        formattedLockoutTime,

        // Methods
        handleSubmit,
        handleFailedAttempt,
        startTimer,
        cleanup,
        saveInitialValues,
    };
}
