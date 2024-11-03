<template>
    <div>
        <label v-if="label" :for="id" class="block text-sm font-medium text-gray-700 mb-1">
            {{ label }}
        </label>
        <div class="relative">
            <input :id="id" :type="type" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)"
                :class="[
                    'block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm',
                    'focus:ring-primary-500 focus:border-primary-500',
                    { 'pr-10': icon },
                    { 'border-red-300': error },
                    { 'bg-gray-100': disabled }
                ]" :disabled="disabled" v-bind="$attrs">
            <div v-if="icon" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <component :is="icon" class="h-5 w-5 text-gray-400" />
            </div>
        </div>
        <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </div>
</template>

<script setup>
defineProps({
    label: String,
    id: String,
    type: {
        type: String,
        default: 'text'
    },
    modelValue: [String, Number],
    icon: [String, Object],
    error: String,
    disabled: Boolean
})

defineEmits(['update:modelValue'])
</script>