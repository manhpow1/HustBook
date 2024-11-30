<template>
    <div role="alert" class="bg-red-50 border-l-4 border-red-400 p-4 my-4 rounded-r-md">
        <div class="flex items-center">
            <AlertCircleIcon class="h-5 w-5 text-red-400 mr-3" aria-hidden="true" />
            <p class="text-red-700 font-medium">{{ title }}</p>
        </div>
        <p class="mt-2 text-red-600">{{ message }}</p>
        <button v-if="showRetry" @click="$emit('retry')"
            class="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Retry">
            Retry
        </button>
    </div>
</template>

<script setup>
import AlertCircleIcon from 'lucide-vue-next';

const props = defineProps({
    message: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        default: '',
    },
    showRetry: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['retry']);

const title = computed(() => props.title || 'Error');
</script>