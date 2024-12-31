<template>
    <div class="video-feed space-y-6">
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton v-for="i in 6" :key="i" class="h-[200px] rounded-lg" />
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card v-for="video in videos" :key="video.id" class="group cursor-pointer" @click="playVideo(video)">
                <CardContent class="p-0">
                    <AspectRatio ratio={16/9}>
                        <img :src="video.thumbnail" :alt="video.title" class="object-cover w-full h-full rounded-t-lg"
                            loading="lazy" />
                        <div class="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                            {{ formatDuration(video.duration) }}
                        </div>
                        <div
                            class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <PlayIcon class="w-12 h-12 text-white" />
                        </div>
                    </AspectRatio>
                    <div class="p-4">
                        <h3 class="font-semibold line-clamp-2">{{ video.title }}</h3>
                        <div class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <UserIcon class="h-4 w-4" />
                            <span>{{ video.author }}</span>
                        </div>
                        <div class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <EyeIcon class="h-4 w-4" />
                            <span>{{ formatViews(video.views) }}</span>
                            <span class="mx-1">•</span>
                            <ClockIcon class="h-4 w-4" />
                            <span>{{ formatTimeAgo(video.createdAt) }}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <ScrollArea ref="scrollRef" class="h-[calc(100vh-200px)]">
            <div ref="scrollTrigger" class="h-10" />
        </ScrollArea>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import { PlayIcon, UserIcon, EyeIcon, ClockIcon } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTimeAgo } from '@/utils/helpers'
import { useVideoStore } from '@/stores/videoStore'

const videoStore = useVideoStore()
const scrollRef = ref(null)
const scrollTrigger = ref(null)
const loading = ref(true)

const { videos } = storeToRefs(videoStore)

useIntersectionObserver(scrollTrigger, ([{ isIntersecting }]) => {
    if (isIntersecting && !loading.value) {
        loadMore()
    }
})

const loadMore = async () => {
    if (!videoStore.hasMore || loading.value) return

    loading.value = true
    try {
        await videoStore.getListVideos()
    } finally {
        loading.value = false
    }
}

const playVideo = (video) => {
    router.push({ name: 'Watch', params: { id: video.id } })
}

const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatViews = (views) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(views)
}

onMounted(() => {
    loadMore()
})
</script>