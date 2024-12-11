<template>
    <button @click="$emit('click')" :class="buttonClasses" :title="tooltip" :aria-label="label"
        class="flex items-center justify-center" :data-testid="testId || null">
        <component :is="icon" class="w-4 h-4" aria-hidden="true" />
        <span v-if="showShortcut" class="ml-1 text-xs text-gray-500">{{ shortcut }}</span>
    </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    icon: {
        type: Object, // Vue component
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
    variant: {
        type: String,
        default: 'default', // e.g., 'default', 'active'
        validator: (value) => ['default', 'active'].includes(value),
    },
    shortcut: {
        type: String,
        default: '',
    },
    showShortcut: {
        type: Boolean,
        default: false,
    },
    testId: {
        type: String,
        default: '',
    },
});

const tooltip = computed(() => {
    return props.shortcut ? `${props.label} (${props.shortcut})` : props.label;
});

const buttonClasses = computed(() => {
    let baseClasses = 'p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200';
    switch (props.variant) {
        case 'active':
            return `${baseClasses} bg-blue-500 text-white`;
        case 'default':
        default:
            return `${baseClasses} bg-transparent text-gray-700`;
    }
});
</script>