<template>
    <button :class="[
        'px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors',
        variantClasses,
        sizeClasses,
        { 'opacity-50 cursor-not-allowed': disabled }
    ]" :disabled="disabled" v-bind="$attrs">
        <slot></slot>
    </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    variant: {
        type: String,
        default: 'primary',
        validator: (value) => ['primary', 'secondary', 'outline', 'danger'].includes(value)
    },
    size: {
        type: String,
        default: 'medium',
        validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    disabled: {
        type: Boolean,
        default: false
    }
})

const variantClasses = computed(() => ({
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500',
    outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
})[props.variant])

const sizeClasses = computed(() => ({
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
})[props.size])
</script>