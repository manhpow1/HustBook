<template>
    <div>
        <label v-if="label" :for="id" class="block text-sm font-medium text-gray-700 mb-1">
            {{ label }}
        </label>
        <div class="relative">
            <div v-if="prefix" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="text-gray-500 sm:text-sm">{{ prefix }}</span>
            </div>
            <input :id="id" :type="type" :value="modelValue" @input="handleInput" :class="[
                'block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm',
                'focus:ring-primary-500 focus:border-primary-500',
                { 'pl-7': prefix },
                { 'pr-10': suffix || icon },
                { 'border-red-300': error },
                { 'bg-gray-100': disabled }
            ]" :disabled="disabled" v-bind="$attrs" :placeholder="placeholder" ref="inputRef"
                :aria-invalid="error ? 'true' : 'false'" :aria-describedby="error ? `${id}-error` : undefined">
            <div v-if="suffix || icon" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span v-if="suffix" class="text-gray-500 sm:text-sm">{{ suffix }}</span>
                <component v-if="icon" :is="icon" class="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
        </div>
        <p v-if="error" :id="`${id}-error`" class="mt-2 text-sm text-red-600">{{ error }}</p>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import IMask from 'imask';

const props = defineProps({
    label: String,
    id: {
        type: String,
        required: true
    },
    type: {
        type: String,
        default: 'text'
    },
    modelValue: [String, Number],
    icon: [String, Object],
    error: String,
    disabled: Boolean,
    prefix: String,
    suffix: String,
    placeholder: String,
    mask: String,
    validation: Function
});

const emit = defineEmits(['update:modelValue']);

const inputRef = ref(null);
let maskRef = null;

onMounted(() => {
    if (props.mask && inputRef.value) {
        maskRef = IMask(inputRef.value, { mask: props.mask });
        maskRef.on('accept', () => {
            emit('update:modelValue', maskRef.value);
        });
    }
});

watch(() => props.modelValue, (newValue) => {
    if (maskRef && maskRef.value !== newValue) {
        maskRef.value = newValue;
    }
});

const handleInput = (event) => {
    const value = event.target.value;
    if (props.validation) {
        const isValid = props.validation(value);
        if (!isValid) {
            // Optionally, handle validation feedback here
        }
    }
    emit('update:modelValue', value);
};
</script>

<style scoped>
/* Ensure accessibility for focus states */
input:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
</style>