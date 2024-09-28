<template>
    <div>
        <slot v-if="!error"></slot>
        <div v-else class="p-6 rounded-lg bg-red-50 border border-red-200 shadow-sm">
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
                <p class="text-xs text-red-500">Error in component: {{ component }}</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'
import { AlertCircleIcon } from 'lucide-vue-next'
import logger from '../../services/logging'

const props = defineProps({
    component: {
        type: String,
        required: true
    }
})

const error = ref(null)

onErrorCaptured((err, component, info) => {
    error.value = err
    logger.error(err.message, { component: props.component, info, stack: err.stack })
    return false // Prevent the error from propagating further
})

const resetError = () => {
    error.value = null
}
</script>