<template>
    <div :class="[
        'bg-white shadow-md rounded-lg overflow-hidden transition-all duration-300',
        { 'border border-gray-200': bordered },
        { 'hover:shadow-lg': hoverable },
        sizeClasses
    ]" :aria-label="computedAriaLabel">
        <div v-if="$slots.header || title" class="px-4 py-5 sm:px-6 border-b border-gray-200">
            <slot name="header">
                <h3 class="text-lg font-medium text-gray-900">{{ title }}</h3>
            </slot>
        </div>
        <div :class="['px-4 py-5 sm:p-6', { 'divide-y divide-gray-200': divided }]"
            :style="{ maxHeight: expanded ? 'none' : '200px', overflow: 'hidden' }">
            <slot></slot>
        </div>
        <div v-if="$slots.footer || hasActions"
            class="px-4 py-4 sm:px-6 border-t border-gray-200 flex justify-between items-center">
            <slot name="footer"></slot>
            <div v-if="hasActions" class="flex space-x-2">
                <button @click="toggleExpand"
                    class="text-sm text-primary-600 hover:text-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
                    aria-expanded="expanded" :aria-label="expanded ? 'Collapse content' : 'Expand content'">
                    {{ expanded ? 'Collapse' : 'Expand' }}
                </button>
                <button @click="share"
                    class="text-sm text-primary-600 hover:text-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
                    aria-label="Share content">
                    Share
                </button>
                <div class="relative">
                    <button @click="toggleMenu"
                        class="text-sm text-primary-600 hover:text-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
                        aria-haspopup="true" :aria-expanded="menuOpen" aria-label="More options">
                        More
                    </button>
                    <Transition name="fade">
                        <div v-if="menuOpen"
                            class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                            role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                            <div class="py-1" role="none">
                                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    role="menuitem" tabindex="-1">Edit</a>
                                <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    role="menuitem" tabindex="-1">Delete</a>
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    bordered: Boolean,
    divided: Boolean,
    hoverable: Boolean,
    title: String,
    size: {
        type: String,
        default: 'medium',
        validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    hasActions: Boolean
});

const emit = defineEmits(['share']);

const expanded = ref(false);
const menuOpen = ref(false);

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'small':
            return 'max-w-sm';
        case 'medium':
            return 'max-w-md';
        case 'large':
            return 'max-w-lg';
        default:
            return '';
    }
});

const computedAriaLabel = computed(() => {
    return title || 'Card';
});

const toggleExpand = () => {
    expanded.value = !expanded.value;
};

const toggleMenu = () => {
    menuOpen.value = !menuOpen.value;
};

const share = () => {
    emit('share');
    // Implement share functionality here
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Ensure accessibility for focus states */
button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    /* Focus ring color */
}
</style>