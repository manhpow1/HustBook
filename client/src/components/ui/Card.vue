<template>
    <div :class="[
        'bg-white shadow-md rounded-lg overflow-hidden',
        { 'border border-gray-200': bordered }
    ]">
        <div v-if="$slots.header" class="px-4 py-5 sm:px-6 border-b border-gray-200">
            <slot name="header"></slot>
        </div>
        <div :class="['px-4 py-5 sm:p-6', { 'divide-y divide-gray-200': divided }]">
            <slot></slot>
        </div>
        <div v-if="$slots.footer" class="px-4 py-4 sm:px-6 border-t border-gray-200">
            <slot name="footer"></slot>
        </div>
    </div>
</template>

<script setup>
defineProps({
    bordered: {
        type: Boolean,
        default: false
    },
    divided: {
        type: Boolean,
        default: false
    }
})
</script>