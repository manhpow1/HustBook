<template>
    <div>
        <label v-if="label" class="block text-sm font-medium text-gray-700 mb-2">
            {{ label }}
        </label>
        
        <div class="flex justify-between space-x-2" role="group" :aria-label="label || 'Verification code input'">
            <input
                v-for="(digit, index) in digits"
                :key="index"
                :ref="el => inputRefs[index] = el"
                v-model="digits[index]"
                type="text"
                inputmode="numeric"
                pattern="[0-9]"
                maxlength="1"
                :name="`code-${index}`"
                :aria-label="`Digit ${index + 1}`"
                :aria-invalid="!!error"
                :disabled="disabled"
                @input="handleInput(index)"
                @keydown="handleKeydown($event, index)"
                @paste="handlePaste"
                @focus="$event.target.select()"
                class="w-12 h-12 text-center text-2xl border rounded-md shadow-sm focus:ring-2 focus:ring-offset-0 transition-colors duration-200"
                :class="[
                    disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
                    error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                         : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500',
                    filled[index] ? 'border-green-500' : ''
                ]"
            />
        </div>

        <!-- Error Message -->
        <p v-if="error" class="mt-2 text-sm text-red-600" role="alert">
            {{ error }}
        </p>

        <!-- Helper Text -->
        <p v-if="helperText && !error" class="mt-2 text-sm text-gray-500">
            {{ helperText }}
        </p>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { AUTH_CONFIG } from '../hooks';

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => Array(AUTH_CONFIG.CODE_LENGTH).fill('')
    },
    label: {
        type: String,
        default: ''
    },
    error: {
        type: String,
        default: ''
    },
    helperText: {
        type: String,
        default: ''
    },
    disabled: {
        type: Boolean,
        default: false
    },
    autoFocus: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['update:modelValue', 'complete']);

const digits = ref(Array(AUTH_CONFIG.CODE_LENGTH).fill(''));
const inputRefs = ref([]);
const filled = computed(() => digits.value.map(digit => !!digit));

// Handle input for each digit
const handleInput = (index) => {
    const value = digits.value[index];
    
    // Ensure only digits
    if (value && !/^\d$/.test(value)) {
        digits.value[index] = '';
        return;
    }

    // Auto-advance to next field
    if (value && index < AUTH_CONFIG.CODE_LENGTH - 1) {
        inputRefs.value[index + 1]?.focus();
    }

    emit('update:modelValue', digits.value);

    // Check if code is complete
    if (digits.value.every(digit => /^\d$/.test(digit))) {
        emit('complete', digits.value.join(''));
    }
};

// Handle keyboard navigation
const handleKeydown = (event, index) => {
    switch(event.key) {
        case 'Backspace':
            if (!digits.value[index] && index > 0) {
                digits.value[index - 1] = '';
                inputRefs.value[index - 1]?.focus();
            }
            break;
        case 'ArrowLeft':
            if (index > 0) {
                inputRefs.value[index - 1]?.focus();
            }
            break;
        case 'ArrowRight':
            if (index < AUTH_CONFIG.CODE_LENGTH - 1) {
                inputRefs.value[index + 1]?.focus();
            }
            break;
        case 'Delete':
            digits.value[index] = '';
            break;
    }
};

// Handle paste event
const handlePaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text');
    const numbers = pastedData.replace(/[^\d]/g, '').split('');
    
    for (let i = 0; i < AUTH_CONFIG.CODE_LENGTH; i++) {
        if (numbers[i]) {
            digits.value[i] = numbers[i];
        }
    }

    // Focus last filled input or first empty input
    const lastFilledIndex = digits.value.findLastIndex(digit => digit !== '');
    const nextEmptyIndex = digits.value.findIndex(digit => digit === '');
    
    const focusIndex = lastFilledIndex === AUTH_CONFIG.CODE_LENGTH - 1 
        ? lastFilledIndex 
        : nextEmptyIndex;
    
    inputRefs.value[focusIndex]?.focus();
};

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
    if (newValue.join('') !== digits.value.join('')) {
        digits.value = [...newValue];
    }
}, { deep: true });

// Auto-focus first input on mount if autoFocus is true
onMounted(() => {
    if (props.autoFocus && !props.disabled) {
        inputRefs.value[0]?.focus();
    }
});
</script>

<style scoped>
/* Remove spinners for number inputs */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type=number] {
    appearance: textfield;
    -moz-appearance: textfield;
}

/* Focus styles */
input:focus {
    outline: none;
}

/* Disabled state */
input:disabled {
    opacity: 0.75;
    cursor: not-allowed;
}

/* Transition animations */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
