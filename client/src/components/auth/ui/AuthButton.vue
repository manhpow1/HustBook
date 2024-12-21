<template>
    <button
        :type="type"
        :disabled="disabled || loading"
        :class="[
            'relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200',
            variantClasses,
            loading || disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ]"
        :aria-disabled="disabled || loading"
        :aria-busy="loading"
    >
        <!-- Leading Icon -->
        <span v-if="icon && !loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
            <component 
                :is="icon" 
                class="h-5 w-5" 
                :class="iconClasses"
                aria-hidden="true" 
            />
        </span>

        <!-- Loading Indicator -->
        <LoaderIcon
            v-if="loading"
            class="animate-spin -ml-1 mr-2 h-5 w-5"
            :class="loadingClasses"
            aria-hidden="true"
        />

        <!-- Button Content -->
        <span :class="{ 'opacity-0': loading }">
            <slot>
                {{ loading ? loadingText : text }}
            </slot>
        </span>
    </button>
</template>

<script setup>
import { computed } from 'vue';
import { LoaderIcon } from 'lucide-vue-next';

const props = defineProps({
    type: {
        type: String,
        default: 'button'
    },
    variant: {
        type: String,
        default: 'primary',
        validator: (value) => ['primary', 'secondary', 'danger', 'ghost'].includes(value)
    },
    loading: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false
    },
    text: {
        type: String,
        default: ''
    },
    loadingText: {
        type: String,
        default: 'Loading...'
    },
    icon: {
        type: [String, Object],
        default: null
    }
});

// Computed classes based on variant
const variantClasses = computed(() => {
    const variants = {
        primary: 'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
        secondary: 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:ring-indigo-500',
        danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
        ghost: 'text-gray-700 bg-transparent hover:bg-gray-100 focus:ring-gray-500'
    };
    return variants[props.variant];
});

// Icon color classes based on variant
const iconClasses = computed(() => {
    const variants = {
        primary: 'text-indigo-500 group-hover:text-indigo-400',
        secondary: 'text-indigo-500 group-hover:text-indigo-400',
        danger: 'text-red-500 group-hover:text-red-400',
        ghost: 'text-gray-500 group-hover:text-gray-400'
    };
    return variants[props.variant];
});

// Loading spinner color classes based on variant
const loadingClasses = computed(() => {
    const variants = {
        primary: 'text-white',
        secondary: 'text-indigo-500',
        danger: 'text-white',
        ghost: 'text-gray-500'
    };
    return variants[props.variant];
});
</script>

<style scoped>
.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* Focus ring styles */
button:focus {
    outline: none;
}

button:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
}

/* Hover state when not disabled */
button:not(:disabled):hover {
    transform: translateY(-1px);
}

/* Active state when not disabled */
button:not(:disabled):active {
    transform: translateY(0);
}

/* Disabled state */
button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

/* Loading state */
.loading-overlay {
    position: absolute;
    inset: 0;
    background-color: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
