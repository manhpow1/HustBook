<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <div>
        <label v-if="label" :for="id" class="block text-sm font-medium text-gray-700 mb-1">
            {{ label }}
        </label>
        <input :id="id" :type="type" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)"
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            v-bind="$attrs">
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

defineProps({
    label: String,
    id: String,
    type: {
        type: String,
        default: 'text'
    },
    modelValue: [String, Number]
})

defineEmits(['update:modelValue'])
</script>