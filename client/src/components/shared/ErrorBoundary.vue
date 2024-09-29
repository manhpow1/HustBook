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
                <p class="text-xs text-red-500">Error in component: {{ componentName }}</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onErrorCaptured, provide } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircleIcon } from 'lucide-vue-next'
import logger from '../../services/logging'
import { useUserState } from '../../store/user-state'

const props = defineProps({
    componentName: {
        type: String,
        required: true
    }
})

const router = useRouter()
const { logout } = useUserState()

const error = ref(null)

const resetError = () => {
    error.value = null
}

const handleError = (err, instance, info) => {
    error.value = err
    logger.error(err.message, { component: props.componentName, info, stack: err.stack })

    // Check if the error is related to authentication
    if (err.response && (err.response.status === 401 || err.response.data?.code === '9998')) {
        logout()
        router.push('/login')
    }

    return false // Prevent the error from propagating further
}

onErrorCaptured(handleError)

// Provide the error handling function to child components
provide('handleError', handleError)
</script>