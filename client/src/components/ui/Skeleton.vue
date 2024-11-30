<template>
    <div :class="[
        'animate-pulse rounded',
        { 'rounded-full': circle },
        { 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200': gradient },
        sizeClasses
    ]" :style="{ ...computedSize, animationDuration: `${speed}s` }" role="status" aria-live="polite">
        <slot></slot>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    circle: Boolean,
    size: {
        type: String,
        default: 'medium',
        validator: (value) => ['small', 'medium', 'large', 'custom'].includes(value)
    },
    speed: {
        type: Number,
        default: 1.5
    },
    gradient: Boolean,
    width: {
        type: String,
        default: '100%'
    },
    height: {
        type: String,
        default: '1rem'
    },
});

const sizeMap = {
    small: { width: '2rem', height: '2rem' },
    medium: { width: '4rem', height: '4rem' },
    large: { width: '6rem', height: '6rem' },
};

const computedSize = computed(() => {
    if (props.size === 'custom') {
        return { width: props.width, height: props.height };
    }
    return sizeMap[props.size];
});

const sizeClasses = computed(() => {
    if (props.size === 'custom') return '';
    switch (props.size) {
        case 'small':
            return 'w-8 h-8';
        case 'medium':
            return 'w-16 h-16';
        case 'large':
            return 'w-24 h-24';
        default:
            return '';
    }
});
</script>

<style scoped>
@keyframes customPulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.animate-pulse {
    animation: customPulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
