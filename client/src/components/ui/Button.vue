<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <button :class="[
        'px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
        variants[variant],
        { 'opacity-50 cursor-not-allowed': disabled }
    ]" :disabled="disabled" v-bind="$attrs">
        <slot></slot>
    </button>
</template>

<script setup>
import { computed } from 'vue'

// eslint-disable-next-line no-unused-vars
const props = defineProps({
    variant: {
        type: String,
        default: 'primary',
        validator: (value) => ['primary', 'secondary', 'outline'].includes(value)
    },
    disabled: {
        type: Boolean,
        default: false
    }
})

const variants = computed(() => ({
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700',
    outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50'
}))
</script>