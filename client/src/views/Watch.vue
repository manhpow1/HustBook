<template>
    <div class="watch-area bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <div class="flex flex-col lg:flex-row">
                <div class="lg:w-2/3 mb-8 lg:mb-0">
                    <div class="bg-black rounded-lg overflow-hidden">
                        <video ref="videoPlayer" :src="currentVideo.url" class="w-full" controls autoplay></video>
                    </div>
                    <div class="mt-4">
                        <h1 class="text-2xl font-bold">{{ currentVideo.title }}</h1>
                        <p class="text-gray-600 mt-2">{{ currentVideo.views }} views • {{
                            formatDate(currentVideo.uploadDate) }}</p>
                        <p class="mt-4">{{ currentVideo.description }}</p>
                    </div>
                </div>
                <div class="lg:w-1/3 lg:pl-8">
                    <h2 class="text-xl font-bold mb-4">Recommended Videos</h2>
                    <div class="space-y-4">
                        <div v-for="video in recommendedVideos" :key="video.id"
                            class="flex cursor-pointer hover:bg-gray-200 rounded-lg transition duration-200"
                            @click="loadVideo(video.id)">
                            <img :src="video.thumbnail" alt="Video thumbnail" class="w-40 h-24 object-cover rounded-lg">
                            <div class="ml-4">
                                <h3 class="font-semibold">{{ video.title }}</h3>
                                <p class="text-sm text-gray-600">{{ video.views }} views</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDistanceToNow } from 'date-fns'
import { useVideoStore } from '../stores/videoStore'
import { storeToRefs } from 'pinia'

const route = useRoute()
const router = useRouter()
const videoStore = useVideoStore()

const { currentVideo, recommendedVideos, loading, error } = storeToRefs(videoStore)

const loadVideo = async (videoId) => {
    await videoStore.fetchVideo(videoId)
    router.push({ name: 'Watch', params: { id: videoId } })
}

const fetchVideoData = async (videoId) => {
    // Simulate API call
    return {
        id: videoId,
        title: `Video ${videoId}`,
        description: 'This is a sample video description.',
        url: 'https://example.com/video.mp4',
        views: Math.floor(Math.random() * 1000000),
        uploadDate: new Date().toISOString(),
    }
}

const fetchRecommendedVideos = async () => {
    // Simulate API call
    return Array.from({ length: 5 }, (_, i) => ({
        id: `rec-${i + 1}`,
        title: `Recommended Video ${i + 1}`,
        thumbnail: 'https://example.com/thumbnail.jpg',
        views: Math.floor(Math.random() * 100000),
    }))
}

const formatDate = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
}

onMounted(async () => {
    await loadVideo(route.params.id)
    await videoStore.fetchRecommendedVideos()
})

watch(() => route.params.id, async (newId) => {
    await loadVideo(newId)
})
</script>