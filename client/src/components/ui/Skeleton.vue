<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <div :class="[
        'animate-pulse bg-gray-200 rounded',
        { 'rounded-full': circle }
    ]" :style="{ width, height }"></div>
</template>

<script setup>
defineProps({
    width: {
        type: String,
        default: '100%'
    },
    height: {
        type: String,
        default: '1rem'
    },
    circle: {
        type: Boolean,
        default: false
    }
})
</script>