import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useStorage } from '@vueuse/core';

export function useAuthState() {
    const router = useRouter();
    
    // Persistent storage for auth state
    const redirectPath = useStorage('auth_redirect', null);
    const previousRoute = useStorage('auth_previous_route', null);
    const lastVerifiedPhone = useStorage('auth_last_phone', null);
    const verificationStep = useStorage('auth_verification_step', null);

    // Track auth flow
    const authFlow = ref({
        isPhoneVerified: false,
        isProfileComplete: false,
        requiresVerification: computed(() => !authFlow.value.isPhoneVerified),
        requiresProfile: computed(() => 
            authFlow.value.isPhoneVerified && !authFlow.value.isProfileComplete
        ),
    });

    // Save redirect path when navigating to auth pages
    const saveRedirectPath = (path = null) => {
        if (path) {
            redirectPath.value = path;
        } else {
            const currentRoute = router.currentRoute.value;
            if (currentRoute.query.redirect) {
                redirectPath.value = currentRoute.query.redirect;
            }
        }
    };

    // Save the route that led to auth
    const savePreviousRoute = () => {
        const currentRoute = router.currentRoute.value;
        if (!currentRoute.meta.authRoute) {
            previousRoute.value = {
                name: currentRoute.name,
                params: currentRoute.params,
                query: currentRoute.query,
            };
        }
    };

    // Navigate after successful auth
    const handleAuthSuccess = () => {
        if (redirectPath.value) {
            router.push(redirectPath.value);
            redirectPath.value = null;
        } else if (previousRoute.value) {
            router.push(previousRoute.value);
            previousRoute.value = null;
        } else {
            router.push({ name: 'Home' });
        }
    };

    // Handle verification state
    const startVerification = (phoneNumber) => {
        lastVerifiedPhone.value = phoneNumber;
        verificationStep.value = 'code';
        authFlow.value.isPhoneVerified = false;
    };

    const completeVerification = () => {
        authFlow.value.isPhoneVerified = true;
        verificationStep.value = 'profile';
    };

    const completeProfile = () => {
        authFlow.value.isProfileComplete = true;
        verificationStep.value = null;
        handleAuthSuccess();
    };

    // Reset auth state
    const resetAuthState = () => {
        redirectPath.value = null;
        previousRoute.value = null;
        lastVerifiedPhone.value = null;
        verificationStep.value = null;
        authFlow.value = {
            isPhoneVerified: false,
            isProfileComplete: false,
        };
    };

    // Handle auth errors
    const handleAuthError = (error) => {
        if (error?.response?.status === 401) {
            resetAuthState();
            router.push({
                name: 'Login',
                query: { redirect: router.currentRoute.value.fullPath }
            });
        }
    };

    // Resume auth flow
    const resumeAuthFlow = () => {
        if (verificationStep.value === 'code' && lastVerifiedPhone.value) {
            router.push({ 
                name: 'VerifyCode',
                params: { phoneNumber: lastVerifiedPhone.value }
            });
        } else if (verificationStep.value === 'profile') {
            router.push({ name: 'CompleteProfile' });
        }
    };

    return {
        // State
        redirectPath,
        previousRoute,
        lastVerifiedPhone,
        verificationStep,
        authFlow,

        // Actions
        saveRedirectPath,
        savePreviousRoute,
        handleAuthSuccess,
        startVerification,
        completeVerification,
        completeProfile,
        resetAuthState,
        handleAuthError,
        resumeAuthFlow,

        // Computed
        requiresVerification: computed(() => authFlow.value.requiresVerification),
        requiresProfile: computed(() => authFlow.value.requiresProfile),
    };
}
