<template>
    <button :class="[
        'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors',
        variantClasses,
        sizeClasses,
        { 'opacity-50 cursor-not-allowed': disabled || loading },
        { 'pointer-events-none': loading }
    ]" :disabled="disabled || loading" v-bind="{ 'aria-label': ariaLabel, ...$attrs }" @click="handleClick">
        <span v-if="loading" class="mr-2" aria-hidden="true">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
            </svg>
        </span>
        <span v-if="icon && !loading" class="mr-2" aria-hidden="true">
            <component :is="icon" :class="iconClasses" />
        </span>
        <span v-if="$slots.default">
            <slot></slot>
        </span>
    </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    variant: {
        type: String,
        default: 'primary',
        validator: (value) => ['primary', 'secondary', 'outline', 'danger', 'success', 'warning'].includes(value)
    },
    size: {
        type: String,
        default: 'medium',
        validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    disabled: Boolean,
    loading: Boolean,
    icon: [String, Object],
    tooltip: String
});

const emit = defineEmits(['click']);

// Compute variant classes
const variantClasses = computed(() => ({
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500',
    outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500'
})[props.variant]);

// Compute size classes
const sizeClasses = computed(() => ({
    small: 'px-2 py-1 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
})[props.size]);

// Compute icon size classes
const iconClasses = computed(() => ({
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6'
})[props.size]);

// Compute aria-label for accessibility
const ariaLabel = computed(() => {
    if (props.tooltip) {
        return props.tooltip;
    }
    return undefined;
});

// Handle click events
const handleClick = (event) => {
    if (!props.disabled && !props.loading) {
        emit('click', event);
    }
};
</script>

<style scoped>
button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    /* Focus ring color */
}
</style>