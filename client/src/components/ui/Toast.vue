<template>
    <div class="fixed bottom-4 right-4 flex flex-col space-y-2 z-50">
        <transition-group name="fade" tag="div">
            <div v-for="toast in toasts" :key="toast.id"
                :class="['px-4 py-2 rounded-md shadow-lg flex items-center space-x-2', toastClasses[toast.type]]"
                role="status" aria-live="polite">
                <component :is="toastIcons[toast.type]" class="w-5 h-5" aria-hidden="true" />
                <span>{{ toast.message }}</span>
                <button @click="removeToast(toast.id)" class="ml-auto text-white hover:text-gray-200 focus:outline-none"
                    aria-label="Dismiss">
                    &times;
                </button>
            </div>
        </transition-group>
    </div>
</template>

<script setup>
import { useToast } from '../../composables/useToast';
import { CheckCircleIcon, XCircleIcon, InformationIcon } from 'lucide-vue-next';

const { toasts, removeToast } = useToast();

// Mapping of toast types to classes and icons
const toastClasses = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
    default: 'bg-gray-800 text-white',
};

const toastIcons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    info: InformationIcon,
    default: InformationIcon,
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s, transform 0.5s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(20px);
}
</style>