<template>
    <div role="alert" class="error-message">
        <div class="flex items-center">
            <AlertCircleIcon class="h-5 w-5 text-red-400 mr-3" aria-hidden="true" />
            <p class="text-red-700 font-medium">{{ title }}</p>
        </div>
        <p class="mt-2 text-red-600">
            {{ message }}
        </p>
        <Button v-if="showRetry" @click="$emit('retry')" variant="danger" class="mt-3" aria-label="Retry Action"
            data-testid="retry-button">
            Retry
        </Button>
    </div>
</template>

<script setup>
import { AlertCircleIcon } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';

const props = defineProps({
    message: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        default: 'Error',
    },
    showRetry: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['retry']);
</script>

<style scoped>
.error-message {
    @apply bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-r-md;
}

.error-message .flex {
    @apply items-center;
}

.error-message p {
    @apply text-red-600 mt-2;
}

.error-message Button {
    @apply px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2;
}
</style>
