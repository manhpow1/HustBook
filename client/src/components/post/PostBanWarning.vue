<template>
    <div v-if="banStatus !== '0'"
        class="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-start" role="alert"
        aria-live="assertive" data-testid="post-ban-warning">
        <AlertTriangleIcon class="w-5 h-5 mr-2 flex-shrink-0" aria-hidden="true" />
        <p>{{ banMessage }}</p>
    </div>
</template>


<script setup>
import { computed } from 'vue';
import { AlertTriangleIcon } from 'lucide-vue-next';

// Define component props
const props = defineProps({
    banStatus: {
        type: String,
        required: true
    }
});

// Computed property to determine the ban message
const banMessage = computed(() => {
    const status = props.banStatus;
    if (status === '1') return 'Your account has been banned due to violations.';
    if (status === '2') return 'You have been blocked.';
    if (status.includes(',')) return 'Your account has been partially blocked.';
    return 'Your account has been flagged for review.';
});
</script>
