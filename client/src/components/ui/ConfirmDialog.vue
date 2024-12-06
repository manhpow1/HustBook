<template>
    <Teleport to="body">
        <Transition name="dialog">
            <div v-if="modelValue"
                class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                @click.self="closeDialog" ref="dialogRef" tabindex="-1" role="dialog" aria-labelledby="dialog-title"
                aria-describedby="dialog-description">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full" role="document">
                    <div class="p-6">
                        <h2 id="dialog-title" class="text-xl font-semibold mb-4">
                            {{ title }}
                        </h2>
                        <p id="dialog-description" class="text-gray-600 mb-6">
                            {{ message }}
                        </p>
                        <div class="flex justify-end space-x-4">
                            <button @click="closeDialog"
                                class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                                :disabled="isLoading" aria-label="Cancel">
                                {{ cancelText }}
                            </button>
                            <button @click="confirmAction"
                                class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                                :disabled="isLoading" aria-label="Confirm">
                                <span v-if="!isLoading">{{ confirmText }}</span>
                                <span v-else class="flex items-center">
                                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                        aria-hidden="true">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                            stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                        </path>
                                    </svg>
                                    {{ loadingText }}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    confirmText: {
        type: String,
        default: 'Confirm',
    },
    cancelText: {
        type: String,
        default: 'Cancel',
    },
    loadingText: {
        type: String,
        default: 'Processing...',
    },
    isLoading: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

// Function to close the dialog
const closeDialog = () => {
    emit('update:modelValue', false);
    emit('cancel');
};

// Function to confirm the action
const confirmAction = () => {
    emit('confirm');
};

const dialogRef = ref(null);

// Watch for changes in modelValue to manage body overflow and focus
watch(
    () => props.modelValue,
    (newValue) => {
        if (newValue) {
            document.body.style.overflow = 'hidden';
            nextTick(() => {
                dialogRef.value?.focus();
            });
        } else {
            document.body.style.overflow = '';
        }
    }
);

// Keyboard event listener for accessibility (e.g., closing with Escape key)
const handleKeyDown = (event) => {
    if (props.modelValue && event.key === 'Escape') {
        closeDialog();
    }
};

// Lifecycle hooks to add and remove event listeners
onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.body.style.overflow = '';
});
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
    transition: opacity 0.3s, transform 0.3s;
}

.dialog-enter-from,
.dialog-leave-to {
    opacity: 0;
    transform: translateY(-20px);
}

/* Focus styles for accessibility */
button:focus {
    outline: 2px solid #4299e1;
    /* Tailwind's blue-500 equivalent */
    outline-offset: 2px;
}
</style>