<template>
    <main class="watch-area bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <div class="flex flex-col lg:flex-row">
                <section class="lg:w-2/3 mb-8 lg:mb-0" aria-labelledby="video-title">
                    <div class="bg-black rounded-lg overflow-hidden">
                        <video ref="videoPlayer" :src="currentVideo.url" class="w-full" controls autoplay>
                            <track kind="captions" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    <div class="mt-4">
                        <h1 id="video-title" class="text-2xl font-bold">{{ currentVideo.title }}</h1>
                        <p class="text-gray-600 mt-2">
                            <span>{{ currentVideo.views }} views</span>
                            <span class="mx-2">&bull;</span>
                            <time :datetime="currentVideo.uploadDate">{{ formatDate(currentVideo.uploadDate) }}</time>
                        </p>
                        <p class="mt-4">{{ currentVideo.description }}</p>
                    </div>
                </section>
                <aside class="lg:w-1/3 lg:pl-8">
                    <h2 class="text-xl font-bold mb-4">Recommended Videos</h2>
                    <ul class="space-y-4">
                        <li v-for="video in recommendedVideos" :key="video.id"
                            class="flex cursor-pointer hover:bg-gray-200 rounded-lg transition duration-200"
                            @click="loadVideo(video.id)">
                            <img :src="video.thumbnail" :alt="`Thumbnail for ${video.title}`"
                                class="w-40 h-24 object-cover rounded-lg">
                            <div class="ml-4">
                                <h3 class="font-semibold">{{ video.title }}</h3>
                                <p class="text-sm text-gray-600">{{ video.views }} views</p>
                            </div>
                        </li>
                    </ul>
                </aside>
            </div>
        </div>
    </main>
</template>

<script setup>
import { ref, watch, defineAsyncComponent, } from 'vue'
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

const formatDate = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
}

watch(() => route.params.id, async (newId) => {
    await loadVideo(newId)
})

await loadVideo(route.params.id)
await videoStore.fetchRecommendedVideos()
</script>