<template>
    <div v-if="banStatus !== '0'" class="mt-4 p-4 bg-red-100 rounded-lg">
        <p class="text-red-700 flex items-center">
            <AlertTriangleIcon class="w-5 h-5 mr-2" />
            {{ getBanReason(banStatus) }}
        </p>
    </div>
</template>

<script setup>
import { AlertTriangleIcon } from 'lucide-vue-next'

const props = defineProps({
    banStatus: {
        type: String,
        required: true
    }
})

const getBanReason = (banStatus) => {
    if (banStatus === '1') return 'Your account has been banned due to violations.';
    if (banStatus === '2') return 'You have been blocked.';
    if (banStatus.includes(',')) return 'Your account has been partially blocked.';
    return 'Your account has been flagged for review.';
}
</script>
