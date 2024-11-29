<template>
    <transition name="fade">
        <div v-if="toast.isVisible"
            :class="['fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg flex items-center space-x-2', toastClass]"
            role="status" aria-live="polite">
            <component :is="iconComponent" class="w-5 h-5" aria-hidden="true" />
            <span>{{ toast.message }}</span>
        </div>
    </transition>
</template>

<script setup>
import { computed } from 'vue';
import { useToast } from '../../composables/useToast';
import { CheckCircleIcon, XCircleIcon, InformationIcon } from 'lucide-vue-next';

const { toast } = useToast();

const toastClass = computed(() => {
    switch (toast.type) {
        case 'success':
            return 'bg-green-500 text-white';
        case 'error':
            return 'bg-red-500 text-white';
        case 'info':
            return 'bg-blue-500 text-white';
        default:
            return 'bg-gray-800 text-white';
    }
});

const iconComponent = computed(() => {
    switch (toast.type) {
        case 'success':
            return CheckCircleIcon;
        case 'error':
            return XCircleIcon;
        case 'info':
            return InformationIcon;
        default:
            return InformationIcon;
    }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>