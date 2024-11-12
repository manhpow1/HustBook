<template>
    <div :class="[
        'bg-white shadow-md rounded-lg overflow-hidden transition-all duration-300',
        { 'border border-gray-200': bordered },
        { 'hover:shadow-lg': hoverable },
        sizeClasses
    ]">
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
                <button @click="toggleExpand" class="text-sm text-primary-600 hover:text-primary-800">
                    {{ expanded ? 'Collapse' : 'Expand' }}
                </button>
                <button @click="share" class="text-sm text-primary-600 hover:text-primary-800">
                    Share
                </button>
                <div class="relative">
                    <button @click="toggleMenu" class="text-sm text-primary-600 hover:text-primary-800">
                        More
                    </button>
                    <div v-if="menuOpen"
                        class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                            <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                role="menuitem">Edit</a>
                            <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                role="menuitem">Delete</a>
                        </div>
                    </div>
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

const expanded = ref(false);
const menuOpen = ref(false);

const sizeClasses = computed(() => ({
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-lg'
})[props.size]);

const toggleExpand = () => {
    expanded.value = !expanded.value;
};

const toggleMenu = () => {
    menuOpen.value = !menuOpen.value;
};

const share = () => {
    // Implement share functionality here
    console.log('Sharing...');
};
</script>