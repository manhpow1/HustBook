<template>
    <transition name="fade">
        <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
            <div class="relative max-w-4xl max-h-full w-full">
                <button @click="close" class="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none">
                    <XIcon class="w-8 h-8" />
                </button>

                <div v-if="currentMedia.type === 'image'" class="flex items-center justify-center">
                    <img :src="getOptimizedImageUrl(currentMedia.url)" :srcset="getImageSrcSet(currentMedia.url)"
                        sizes="(max-width: 768px) 100vw, 80vw" :alt="currentMedia.alt || ''"
                        class="max-w-full max-h-[90vh] object-contain" loading="lazy" @click="handleImageClick" />
                </div>

                <div v-else-if="currentMedia.type === 'video'" class="flex items-center justify-center">
                    <video ref="videoPlayer" :src="currentMedia.url" class="max-w-full max-h-[90vh]" controls>
                        Your browser does not support the video tag.
                    </video>
                </div>

                <div v-if="mediaList.length > 1" class="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
                    <button v-for="(media, index) in mediaList" :key="index" @click="setCurrentMedia(index)"
                        class="w-3 h-3 rounded-full focus:outline-none transition-colors duration-200"
                        :class="index === currentIndex ? 'bg-white' : 'bg-gray-500 hover:bg-gray-300'"
                        :aria-label="`View media ${index + 1}`"></button>
                </div>

                <button v-if="mediaList.length > 1" @click="previousMedia"
                    class="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 focus:outline-none"
                    aria-label="Previous media">
                    <ChevronLeftIcon class="w-10 h-10" />
                </button>

                <button v-if="mediaList.length > 1" @click="nextMedia"
                    class="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 focus:outline-none"
                    aria-label="Next media">
                    <ChevronRightIcon class="w-10 h-10" />
                </button>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-vue-next'

const props = defineProps({
    isOpen: Boolean,
    mediaList: Array,
    initialIndex: Number,
})

const emit = defineEmits(['close', 'update:modelValue'])

const currentIndex = ref(props.initialIndex || 0)
const videoPlayer = ref(null)

const currentMedia = computed(() => props.mediaList[currentIndex.value] || {})

const setCurrentMedia = (index) => {
    currentIndex.value = index
}

const previousMedia = () => {
    currentIndex.value = (currentIndex.value - 1 + props.mediaList.length) % props.mediaList.length
}

const nextMedia = () => {
    currentIndex.value = (currentIndex.value + 1) % props.mediaList.length
}

const close = () => {
    emit('close')
}

const getOptimizedImageUrl = (url, width = 1280) => {
    // Implement logic to return an optimized version of the image
    // This could involve using a CDN or image optimization service
    return `${url}?w=${width}&q=80&auto=format`
}

const getImageSrcSet = (url) => {
    const widths = [320, 640, 1024, 1280, 1920]
    return widths.map(w => `${getOptimizedImageUrl(url, w)} ${w}w`).join(', ')
}

const handleImageClick = () => {
    if (props.mediaList.length === 1) {
        close()
    }
}

const handleKeydown = (event) => {
    if (event.key === 'Escape') {
        close()
    } else if (event.key === 'ArrowLeft') {
        previousMedia()
    } else if (event.key === 'ArrowRight') {
        nextMedia()
    }
}

watch(() => props.isOpen, (newValue) => {
    if (newValue) {
        document.addEventListener('keydown', handleKeydown)
        document.body.style.overflow = 'hidden'
    } else {
        document.removeEventListener('keydown', handleKeydown)
        document.body.style.overflow = ''
    }
})

onMounted(() => {
    if (props.isOpen) {
        document.addEventListener('keydown', handleKeydown)
        document.body.style.overflow = 'hidden'
    }
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
})
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
</style>