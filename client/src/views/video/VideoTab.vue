<template>
    <div class="container mx-auto p-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Videos</CardTitle>
                <Button variant="outline" size="icon" @click="navigateToSearch">
                    <SearchIcon class="h-4 w-4" />
                    <span class="sr-only">Search Videos</span>
                </Button>
            </CardHeader>
            <CardContent>
                <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton v-for="i in 6" :key="i" class="h-[200px] w-full rounded-lg" />
                </div>

                <div v-else-if="error" class="text-center py-8">
                    <AlertCircle class="h-10 w-10 text-destructive mx-auto mb-4" />
                    <p class="text-lg font-medium">{{ error }}</p>
                    <Button variant="outline" class="mt-4" @click="loadVideos">Retry</Button>
                </div>

                <VideoFeed ref="feedRef" />

                <div v-if="hasMore" class="flex justify-center mt-6">
                    <Button variant="outline" :disabled="loadingMore" @click="loadMore">
                        <Loader2Icon v-if="loadingMore" class="mr-2 h-4 w-4 animate-spin" />
                        Load More
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVideoStore } from '@/stores/videoStore'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchIcon, AlertCircle, Loader2Icon } from 'lucide-vue-next'
import VideoFeed from '@/components/video/VideoFeed.vue'

const router = useRouter()
const videoStore = useVideoStore()
const feedRef = ref(null)

const loading = ref(true)
const loadingMore = ref(false)
const error = ref(null)
const hasMore = ref(true)

const loadVideos = async () => {
    try {
        loading.value = true
        error.value = null
        await videoStore.getListVideos()
    } catch (err) {
        error.value = err.message || 'Failed to load videos'
    } finally {
        loading.value = false
    }
}

const loadMore = async () => {
    if (loadingMore.value) return

    try {
        loadingMore.value = true
        await videoStore.getListVideos()
    } catch (err) {
        error.value = err.message
    } finally {
        loadingMore.value = false
    }
}

const navigateToSearch = () => {
    router.push({ name: 'VideoSearch' })
}

onMounted(loadVideos)
</script>