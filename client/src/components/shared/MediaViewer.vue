<template>
    <transition name="fade">
        <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div class="relative max-w-4xl max-h-full w-full">
                <button @click="close" class="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none">
                    <XIcon class="w-8 h-8" />
                </button>

                <div v-if="currentMedia.type === 'image'" class="flex items-center justify-center">
                    <img :src="currentMedia.url" :alt="currentMedia.alt || ''"
                        class="max-w-full max-h-[90vh] object-contain" />
                </div>

                <div v-else-if="currentMedia.type === 'video'" class="flex items-center justify-center">
                    <video ref="videoPlayer" :src="currentMedia.url" class="max-w-full max-h-[90vh]" controls autoplay>
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

                <div class="absolute bottom-4 left-4 text-white flex items-center space-x-4">
                    <button @click="handleLike" class="flex items-center space-x-2">
                        <ThumbsUpIcon :class="{ 'text-blue-500 fill-current': isLiked }" class="w-6 h-6" />
                        <span>{{ formatNumber(likes) }}</span>
                    </button>
                    <button @click="handleComment" class="flex items-center space-x-2">
                        <MessageSquareIcon class="w-6 h-6" />
                        <span>{{ formatNumber(comments) }}</span>
                    </button>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { XIcon, ChevronLeftIcon, ChevronRightIcon, ThumbsUpIcon, MessageSquareIcon } from 'lucide-vue-next'
import { formatNumber } from '../utils/numberFormat'

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    },
    mediaList: {
        type: Array,
        required: true
    },
    initialIndex: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        required: true
    },
    comments: {
        type: Number,
        required: true
    },
    isLiked: {
        type: Boolean,
        required: true
    }
})

const emit = defineEmits(['close', 'like', 'comment'])

const currentIndex = ref(props.initialIndex)
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

const handleLike = () => {
    emit('like')
}

const handleComment = () => {
    emit('comment')
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

// Preload adjacent images
watch(currentIndex, (newIndex) => {
    const preloadImage = (url) => {
        if (url) {
            const img = new Image()
            img.src = url
        }
    }

    const prevIndex = (newIndex - 1 + props.mediaList.length) % props.mediaList.length
    const nextIndex = (newIndex + 1) % props.mediaList.length

    if (props.mediaList[prevIndex]?.type === 'image') {
        preloadImage(props.mediaList[prevIndex].url)
    }
    if (props.mediaList[nextIndex]?.type === 'image') {
        preloadImage(props.mediaList[nextIndex].url)
    }
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