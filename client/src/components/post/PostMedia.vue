<template>
    <div>
        <div v-if="post.image && post.image.length > 0" class="mb-4">
            <div v-if="post.image.length === 1" @click="openLightbox(post.image[0].url)"
                class="cursor-pointer rounded-lg overflow-hidden">
                <img :src="post.image[0].url" :alt="post.described" class="w-full h-auto object-cover" loading="lazy">
            </div>
            <div v-else class="grid gap-2" :class="gridClass">
                <div v-for="(img, index) in visibleImages" :key="img.id"
                    class="relative overflow-hidden rounded-lg cursor-pointer" @click="openLightbox(img.url)">
                    <img :src="img.url" :alt="post.described" class="w-full h-full object-cover" loading="lazy">
                    <div v-if="index === 3 && post.image.length > 4"
                        class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-2xl font-bold">
                        +{{ post.image.length - 4 }}
                    </div>
                </div>
            </div>
        </div>

        <div v-if="post.video && post.video.length > 0" class="mb-4">
            <div v-for="vid in post.video" :key="vid.url" class="relative">
                <video :src="vid.url" class="w-full h-auto rounded-lg" @click="openVideoPlayer(vid.url)">
                    Your browser does not support the video tag.
                </video>
                <div class="absolute inset-0 flex items-center justify-center">
                    <PlayIcon
                        class="w-16 h-16 text-white opacity-75 hover:opacity-100 transition-opacity duration-200 cursor-pointer" />
                </div>
            </div>
        </div>

        <div v-if="post.link" class="mb-4">
            <a :href="post.link" target="_blank" rel="noopener noreferrer"
                class="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <p class="font-semibold text-blue-600">{{ getLinkDomain(post.link) }}</p>
                <p class="text-gray-600 truncate">{{ post.link }}</p>
            </a>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { PlayIcon } from 'lucide-vue-next'

const props = defineProps({
    post: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['openLightbox', 'openVideoPlayer'])

const visibleImages = computed(() => {
    return props.post.image?.slice(0, 4) || []
})

const gridClass = computed(() => {
    const count = props.post.image?.length || 0
    if (count === 1) return ''
    if (count === 2) return 'grid-cols-2'
    if (count === 3) return 'grid-cols-2'
    if (count >= 4) return 'grid-cols-2'
    return ''
})

const openLightbox = (imageUrl) => {
    emit('openLightbox', imageUrl)
}

const openVideoPlayer = (videoUrl) => {
    emit('openVideoPlayer', videoUrl)
}

const getLinkDomain = (url) => {
    try {
        const domain = new URL(url).hostname
        if (domain.includes('facebook.com')) return 'Facebook'
        if (domain.includes('vnexpress.net')) return 'VnExpress'
        return domain
    } catch {
        return 'External Link'
    }
}
</script>

<style scoped>
.grid-cols-2 img:first-child:nth-last-child(3),
.grid-cols-2 img:first-child:nth-last-child(3)~img {
    @apply col-span-1;
}

.grid-cols-2 img:first-child:nth-last-child(3) {
    @apply row-span-2;
}

.grid-cols-2 img:first-child:nth-last-child(n+4),
.grid-cols-2 img:first-child:nth-last-child(n+4)~img {
    @apply col-span-1;
}
</style>