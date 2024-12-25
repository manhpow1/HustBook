<template>
    <Card class="max-w-2xl mx-auto mt-8" role="status" aria-label="Loading post content">
        <div class="flex items-center mb-4">
            <Skeleton circle :width="avatarSize" :height="avatarSize" class="mr-4" aria-hidden="true" />
            <div class="flex-1">
                <Skeleton :width="nameWidth" height="1rem" class="mb-2" aria-hidden="true" />
                <Skeleton width="5rem" height="0.75rem" aria-hidden="true" />
            </div>
        </div>

        <div class="space-y-2 mb-4">
            <Skeleton v-for="(line, index) in contentLines" :key="index" :width="line" height="1rem"
                aria-hidden="true" />
        </div>

        <div :class="['mb-4 gap-2', imageGridClass]">
            <Skeleton v-for="i in numberOfImages" :key="i" :height="imageHeight" class="rounded-lg"
                aria-hidden="true" />
        </div>

        <div class="flex items-center justify-between mb-4">
            <Skeleton v-for="i in 3" :key="i" :width="buttonSize" :height="buttonSize" circle aria-hidden="true" />
        </div>

        <div class="mt-6">
            <Skeleton :height="commentBoxHeight" class="mb-4" aria-hidden="true" />
            <Skeleton width="6rem" height="2rem" aria-hidden="true" />
        </div>
    </Card>
</template>

<script setup>
import { computed } from 'vue';
import Alert from '@/components/ui/alert';
import Skeleton from '@/components/ui/skeleton';

const props = defineProps({
    avatarSize: {
        type: String,
        default: '3rem'
    },
    nameWidth: {
        type: String,
        default: '8rem'
    },
    contentLines: {
        type: Array,
        default: () => ['100%', '83.33%', '66.67%']
    },
    numberOfImages: {
        type: Number,
        default: 4
    },
    imageHeight: {
        type: String,
        default: '12rem'
    },
    buttonSize: {
        type: String,
        default: '5rem'
    },
    commentBoxHeight: {
        type: String,
        default: '6rem'
    }
});

const imageGridClass = computed(() => {
    if (props.numberOfImages <= 1) return 'grid grid-cols-1';
    if (props.numberOfImages <= 2) return 'grid grid-cols-2';
    return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
});
</script>

<style scoped>
/* Ensure accessibility for focus states */
button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    /* Focus ring color */
}
</style>