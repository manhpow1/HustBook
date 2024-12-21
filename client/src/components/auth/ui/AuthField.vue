<template>
    <div>
        <label :for="id" class="block text-sm font-medium text-gray-700" v-if="label">
            {{ label }}
        </label>
        <div class="mt-1 relative rounded-md shadow-sm">
            <!-- Leading Icon -->
            <div v-if="icon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <component :is="icon" class="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>

            <!-- Input Field -->
            <input
                :id="id"
                :name="name"
                :type="inputType"
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value)"
                :required="required"
                :disabled="disabled"
                :placeholder="placeholder"
                :autocomplete="autocomplete"
                :class="[
                    'block w-full sm:text-sm rounded-md focus:outline-none',
                    icon ? 'pl-10' : 'pl-3',
                    disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
                    error ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                         : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500',
                ]"
                :aria-invalid="!!error"
                :aria-describedby="error ? `${id}-error` : undefined"
            />

            <!-- Trailing Icon/Success/Error Indicator -->
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <CheckCircleIcon v-if="!error && modelValue" 
                    class="h-5 w-5 text-green-500" 
                    aria-hidden="true" 
                />
                <XCircleIcon v-if="error" 
                    class="h-5 w-5 text-red-500" 
                    aria-hidden="true" 
                />
            </div>
        </div>

        <!-- Error Message -->
        <p v-if="error" :id="`${id}-error`" class="mt-2 text-sm text-red-600" role="alert">
            {{ error }}
        </p>

        <!-- Helper Text -->
        <p v-if="helperText && !error" class="mt-2 text-sm text-gray-500">
            {{ helperText }}
        </p>
    </div>
</template>

<script setup>
import { 
    CheckCircleIcon, 
    XCircleIcon 
} from 'lucide-vue-next';

const props = defineProps({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        default: ''
    },
    label: {
        type: String,
        default: ''
    },
    modelValue: {
        type: [String, Number],
        default: ''
    },
    icon: {
        type: [String, Object],
        default: null
    },
    inputType: {
        type: String,
        default: 'text'
    },
    error: {
        type: String,
        default: ''
    },
    helperText: {
        type: String,
        default: ''
    },
    required: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false
    },
    placeholder: {
        type: String,
        default: ''
    },
    autocomplete: {
        type: String,
        default: 'off'
    }
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
/* Focus Styles */
input:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
}

/* Disabled State */
input:disabled {
    opacity: 0.75;
    cursor: not-allowed;
}

/* Error State */
input[aria-invalid="true"] {
    border-color: rgb(239, 68, 68);
}

/* Success State */
input:not([aria-invalid="true"]):not(:placeholder-shown) {
    border-color: rgb(34, 197, 94);
}

/* Helper Text Animation */
.helper-text {
    transition: all 0.2s ease-in-out;
}

/* Icon Transitions */
.icon-enter-active,
.icon-leave-active {
    transition: opacity 0.2s ease-in-out;
}

.icon-enter-from,
.icon-leave-to {
    opacity: 0;
}
</style>
