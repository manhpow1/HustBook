<template>
    <div>
        <slot v-if="!error"></slot>
        <div v-else class="p-6 rounded-lg bg-red-50 border border-red-200 shadow-sm" role="alert">
            <div class="flex items-center mb-4">
                <AlertCircleIcon class="w-6 h-6 text-red-500 mr-2" aria-hidden="true" />
                <h2 class="text-lg font-semibold text-red-700">Something went wrong</h2>
            </div>
            <p class="text-red-600 mb-4">{{ error.message }}</p>
            <details class="mb-4">
                <summary
                    class="text-sm text-red-600 cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded">
                    Show error details
                </summary>
                <pre class="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 overflow-x-auto">{{ error.stack }}</pre>
            </details>
            <div class="flex justify-between items-center">
                <button @click="resetError"
                    class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200">
                    Try again
                </button>
                <p class="text-xs text-red-500">Error in component: {{ componentName }}</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onErrorCaptured, provide } from 'vue';
import { AlertCircleIcon } from 'lucide-vue-next';
import { useErrorHandler } from '@/utils/errorHandler';

const props = defineProps({
    componentName: {
        type: String,
        required: true
    }
});

const { handleError } = useErrorHandler();

const error = ref(null);

const resetError = () => {
    error.value = null;
};

// Error capture handler
const captureError = (err) => {
    error.value = err;
    // Delegate to centralized error handler
    handleError(err);
    return false; // Prevent further propagation
};

onErrorCaptured(captureError);

// Provide the handleError to child components if needed
provide('handleError', handleError);
</script>

<style scoped>
/* Ensure accessibility for focus states */
button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.6);
}
</style>