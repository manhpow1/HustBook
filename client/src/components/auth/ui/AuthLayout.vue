<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <!-- Header Section -->
            <div>
                <img class="mx-auto h-12 w-auto" src="../../../assets/logo.svg" alt="HUSTBOOK" />
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    <slot name="title">Authentication</slot>
                </h2>
                <p class="mt-2 text-center text-sm text-gray-600">
                    <slot name="subtitle">Welcome to HUSTBOOK</slot>
                </p>
            </div>

            <!-- Main Content -->
            <div class="bg-white p-8 rounded-lg shadow-md">
                <slot></slot>
            </div>

            <!-- Footer Links -->
            <div class="flex justify-center space-x-4 text-sm">
                <slot name="footer">
                    <router-link to="/login" class="text-indigo-600 hover:text-indigo-500">
                        Sign in
                    </router-link>
                    <span class="text-gray-500">|</span>
                    <router-link to="/signup" class="text-indigo-600 hover:text-indigo-500">
                        Create account
                    </router-link>
                </slot>
            </div>

            <!-- Error Message -->
            <TransitionRoot show="!!error" as="template">
                <div v-if="error" class="mt-4 p-4 bg-red-100 rounded-md flex items-start" role="alert">
                    <XCircleIcon class="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">Error</h3>
                        <p class="mt-1 text-sm text-red-700">{{ error }}</p>
                    </div>
                </div>
            </TransitionRoot>

            <!-- Success Message -->
            <TransitionRoot show="!!success" as="template">
                <div v-if="success" class="mt-4 p-4 bg-green-100 rounded-md flex items-start" role="alert">
                    <CheckCircleIcon class="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-green-800">Success</h3>
                        <p class="mt-1 text-sm text-green-700">{{ success }}</p>
                    </div>
                </div>
            </TransitionRoot>

            <!-- Loading Overlay -->
            <TransitionRoot show="isLoading" as="template">
                <div v-if="isLoading" class="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center">
                    <LoaderIcon class="h-12 w-12 text-white animate-spin" />
                </div>
            </TransitionRoot>
        </div>
    </div>
</template>

<script setup>
import { TransitionRoot } from '@headlessui/vue';
import { XCircleIcon, CheckCircleIcon, LoaderIcon } from 'lucide-vue-next';

defineProps({
    error: {
        type: String,
        default: '',
    },
    success: {
        type: String,
        default: '',
    },
    isLoading: {
        type: Boolean,
        default: false,
    },
});
</script>

<style scoped>
.min-h-screen {
    min-height: 100vh;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
