<template>
    <button :class="[
        'relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
        switchClasses,
        { 'cursor-not-allowed opacity-50': disabled }
    ]" role="switch" :aria-checked="modelValue" :disabled="disabled" @click="toggle"
        @keydown.space.prevent="toggle" @keydown.enter.prevent="toggle" tabindex="0" :aria-label="ariaLabel">
        <span :class="[
            'inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200',
            knobClasses
        ]"></span>
    </button>
</template>

<script setup>
import { computed } from 'vue';

// Define component props
const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    onColor: {
        type: String,
        default: 'bg-blue-600',
    },
    offColor: {
        type: String,
        default: 'bg-gray-200',
    },
    knobOn: {
        type: String,
        default: 'translate-x-6',
    },
    knobOff: {
        type: String,
        default: 'translate-x-1',
    },
    ariaLabel: {
        type: String,
        default: 'Toggle Switch',
    },
});

// Define events
const emit = defineEmits(['update:modelValue']);

// Computed classes based on state
const switchClasses = computed(() => {
    return props.modelValue ? props.onColor : props.offColor;
});

const knobClasses = computed(() => {
    return props.modelValue ? props.knobOn : props.knobOff;
});

// Toggle function
const toggle = () => {
    if (props.disabled) return;
    emit('update:modelValue', !props.modelValue);
};
</script>

<style scoped>
button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}
</style>