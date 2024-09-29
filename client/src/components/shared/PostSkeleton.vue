<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl animate-pulse" role="status"
        aria-label="Loading post content">
        <div class="flex items-center mb-4">
            <div class="rounded-full mr-4" :class="[avatarSize, skeletonBgClass]"></div>
            <div>
                <div :class="['h-4 rounded mb-2', skeletonBgClass, nameWidth]"></div>
                <div :class="['h-3 rounded', skeletonBgClass, 'w-24']"></div>
            </div>
        </div>

        <div class="space-y-2 mb-4">
            <div v-for="(line, index) in contentLines" :key="index" :class="['h-4 rounded', skeletonBgClass, line]">
            </div>
        </div>

        <div :class="['mb-4 gap-2', imageGridClass]">
            <div v-for="i in numberOfImages" :key="i" :class="['rounded-lg', skeletonBgClass, imageHeight]"></div>
        </div>

        <div class="flex items-center justify-between mb-4">
            <div v-for="i in 3" :key="i" :class="['rounded-full', skeletonBgClass, buttonSize]"></div>
        </div>

        <div class="mt-6">
            <div :class="['rounded-lg mb-4', skeletonBgClass, commentBoxHeight]"></div>
            <div :class="['rounded-full', skeletonBgClass, 'w-24 h-8']"></div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    avatarSize: {
        type: String,
        default: 'w-12 h-12'
    },
    nameWidth: {
        type: String,
        default: 'w-32'
    },
    contentLines: {
        type: Array,
        default: () => ['w-full', 'w-5/6', 'w-4/6']
    },
    numberOfImages: {
        type: Number,
        default: 4
    },
    imageHeight: {
        type: String,
        default: 'h-48'
    },
    buttonSize: {
        type: String,
        default: 'w-20 h-8'
    },
    commentBoxHeight: {
        type: String,
        default: 'h-24'
    }
});

const skeletonBgClass = 'bg-gray-300';

const imageGridClass = computed(() => {
    if (props.numberOfImages <= 1) return 'grid grid-cols-1';
    if (props.numberOfImages <= 2) return 'grid grid-cols-2';
    return 'grid grid-cols-2 sm:grid-cols-2';
});
</script>

<style scoped>
@keyframes pulse {
    0%,
    100% {
        background-color: var(--skeleton-start-color);
    }

    50% {
        background-color: var(--skeleton-end-color);
    }
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@media (prefers-reduced-motion: reduce) {
    .animate-pulse {
        animation: none;
    }
}
</style>