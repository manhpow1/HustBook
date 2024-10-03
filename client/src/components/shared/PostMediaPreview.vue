<template>
    <div class="relative">
        <img v-if="media.type === 'image'" :src="media.url" :alt="media.alt || ''" class="w-full h-auto" />
        <div v-else-if="media.type === 'video'" class="relative">
            <img :src="media.thumbnail" :alt="media.alt || ''" class="w-full h-auto" />
            <div class="absolute inset-0 flex items-center justify-center">
                <PlayIcon class="w-16 h-16 text-white opacity-75 hover:opacity-100 transition-opacity duration-200" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { PlayIcon } from 'lucide-vue-next'

defineProps({
    media: {
        type: Object,
        required: true
    }
})
</script>