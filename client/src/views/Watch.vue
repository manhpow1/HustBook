<template>
    <main class="watch-area bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <div class="flex flex-col lg:flex-row">
                <section class="lg:w-2/3 mb-8 lg:mb-0" aria-labelledby="video-title">
                    <div v-if="currentVideo" class="bg-black rounded-lg overflow-hidden">
                        <video ref="videoPlayer" :src="currentVideo.video.url" class="w-full" controls autoplay>
                            <track kind="captions" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    <div v-if="currentVideo" class="mt-4">
                        <h1 id="video-title" class="text-2xl font-bold">{{ currentVideo.name }}</h1>
                        <p class="text-gray-600 mt-2">
                            <span>{{ currentVideo.like }} likes</span>
                            <span class="mx-2">&bull;</span>
                            <span>{{ currentVideo.comment }} comments</span>
                            <span class="mx-2">&bull;</span>
                            <time :datetime="currentVideo.created">{{ formatDate(currentVideo.created) }}</time>
                        </p>
                        <p class="mt-4">{{ currentVideo.described }}</p>
                    </div>
                </section>
                <aside class="lg:w-1/3 lg:pl-8">
                    <h2 class="text-xl font-bold mb-4">Video List</h2>
                    <ul v-if="videoStore.videos.length > 0" class="space-y-4">
                        <li v-for="video in videoStore.videos" :key="video.id"
                            class="flex cursor-pointer hover:bg-gray-200 rounded-lg transition duration-200"
                            @click="loadVideo(video.id)">
                            <img :src="video.video.thumb" :alt="`Thumbnail for ${video.name}`"
                                class="w-40 h-24 object-cover rounded-lg">
                            <div class="ml-4">
                                <h3 class="font-semibold">{{ video.name }}</h3>
                                <p class="text-sm text-gray-600">{{ video.like }} likes</p>
                            </div>
                        </li>
                    </ul>
                    <div v-else-if="videoStore.loading" class="text-center">
                        <p>Loading videos...</p>
                    </div>
                    <div v-else-if="videoStore.error" class="text-center text-red-500">
                        <p>{{ videoStore.error }}</p>
                    </div>
                    <div v-if="videoStore.hasMore" class="mt-4 text-center">
                        <button @click="loadMoreVideos" class="bg-blue-500 text-white px-4 py-2 rounded"
                            :disabled="videoStore.loading">
                            Load More
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    </main>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVideoStore } from '../stores/videoStore'
import { storeToRefs } from 'pinia'
import { formatDate } from '../utils/helpers'

const route = useRoute()
const router = useRouter()
const videoStore = useVideoStore()

const { videos } = storeToRefs(videoStore)
const currentVideo = ref(null)

const loadVideo = (videoId) => {
    currentVideo.value = videos.value.find(v => v.id === videoId)
    if (currentVideo.value) {
        router.push({ name: 'Watch', params: { id: videoId } })
    }
}

const loadMoreVideos = () => {
    videoStore.getListVideos()
}

watch(() => route.params.id, (newId) => {
    if (newId && videos.value.length > 0) {
        loadVideo(newId)
    }
})

onMounted(async () => {
    await videoStore.getListVideos()
    if (route.params.id) {
        loadVideo(route.params.id)
    } else if (videos.value.length > 0) {
        loadVideo(videos.value[0].id)
    }
})
</script>