<template>
    <div v-if="isVisible" :class="alertClasses" role="alert" aria-live="assertive"
        :aria-labelledby="`alert-title-${id}`" :aria-describedby="`alert-message-${id}`">
        <div class="flex items-start">
            <component :is="iconComponent" class="flex-shrink-0 w-6 h-6 mr-3" aria-hidden="true" />
            <div>
                <h4 :id="`alert-title-${id}`" class="font-semibold text-lg">{{ title }}</h4>
                <p :id="`alert-message-${id}`" class="mt-1 text-sm">{{ message }}</p>
                <div v-if="actions && actions.length" class="mt-3 flex space-x-2">
                    <Button v-for="action in actions" :key="action.label" @click="action.handler"
                        :variant="action.variant || 'secondary'" class="px-3 py-1 text-sm"
                        :aria-label="action.ariaLabel || action.label" :data-testid="action.testId || null">
                        {{ action.label }}
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, defineProps } from 'vue';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from 'lucide-vue-next';
import Button from './Button.vue';

const props = defineProps({
    type: {
        type: String,
        default: 'info',
        validator: (value) => ['success', 'error', 'warning', 'info'].includes(value),
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    isVisible: {
        type: Boolean,
        default: true,
    },
    actions: {
        type: Array,
        default: () => [],
        // Each action should be an object: { label: String, handler: Function, variant?: String, ariaLabel?: String, testId?: String }
    },
    id: {
        type: [String, Number],
        default: () => Math.random().toString(36).substr(2, 9), // Unique ID for ARIA attributes
    },
});

const iconComponent = computed(() => {
    switch (props.type) {
        case 'success':
            return CheckCircleIcon;
        case 'error':
            return XCircleIcon;
        case 'warning':
            return ExclamationTriangleIcon;
        case 'info':
        default:
            return InformationCircleIcon;
    }
});

const alertClasses = computed(() => {
    switch (props.type) {
        case 'success':
            return 'bg-green-50 border border-green-400 text-green-700 p-4 rounded';
        case 'error':
            return 'bg-red-50 border border-red-400 text-red-700 p-4 rounded';
        case 'warning':
            return 'bg-yellow-50 border border-yellow-400 text-yellow-700 p-4 rounded';
        case 'info':
        default:
            return 'bg-blue-50 border border-blue-400 text-blue-700 p-4 rounded';
    }
});
</script>