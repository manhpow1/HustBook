<template>
    <transition name="toast">
        <div v-if="isVisible" :class="['fixed bottom-4 right-4 p-4 rounded-md shadow-md', bgClass]">
            {{ message }}
        </div>
    </transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    message: String,
    type: String,
    isVisible: Boolean,
});

const bgClass = computed(() => {
    switch (props.type) {
        case 'success':
            return 'bg-green-500 text-white';
        case 'error':
            return 'bg-red-500 text-white';
        default:
            return 'bg-gray-700 text-white';
    }
});
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
    transition: opacity 0.3s, transform 0.3s;
}

.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateY(20px);
}
</style>