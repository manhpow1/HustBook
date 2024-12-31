<template>
    <div class="container mx-auto p-4">
        <Card>
            <CardHeader>
                <CardTitle>Search Videos</CardTitle>
                <CardDescription>Find videos by title, creator or tags</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="flex gap-4 mb-6">
                    <div class="flex-1">
                        <Input v-model="searchQuery" placeholder="Search videos..." @keyup.enter="performSearch">
                        <template #prefix>
                            <SearchIcon class="h-4 w-4 text-muted-foreground" />
                        </template>
                        </Input>
                    </div>
                    <Button @click="performSearch" :disabled="isSearching">
                        <Loader2Icon v-if="isSearching" class="mr-2 h-4 w-4 animate-spin" />
                        Search
                    </Button>
                </div>

                <div v-if="isSearching" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton v-for="i in 6" :key="i" class="h-[200px] w-full rounded-lg" />
                </div>

                <div v-else-if="error" class="text-center py-8">
                    <AlertCircle class="h-10 w-10 text-destructive mx-auto mb-4" />
                    <p class="text-lg font-medium">{{ error }}</p>
                    <Button variant="outline" class="mt-4" @click="performSearch">Retry</Button>
                </div>

                <div v-else-if="searchResults.length === 0 && hasSearched" class="text-center py-8">
                    <p class="text-lg text-muted-foreground">No videos found matching your search.</p>
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card v-for="video in searchResults" :key="video.id"
                        class="cursor-pointer hover:shadow-lg transition-shadow" @click="viewVideo(video.id)">
                        <CardContent class="p-0">
                            <AspectRatio ratio={16/9}>
                                <img :src="video.thumbnail" :alt="video.title"
                                    class="object-cover w-full h-full rounded-t-lg" loading="lazy" />
                            </AspectRatio>
                            <div class="p-4">
                                <h3 class="font-semibold line-clamp-2">{{ video.title }}</h3>
                                <p class="text-sm text-muted-foreground mt-2">
                                    {{ video.author }}
                                </p>
                                <div class="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                    <EyeIcon class="h-4 w-4" />
                                    {{ formatViews(video.views) }}
                                    <span class="mx-2">•</span>
                                    <ClockIcon class="h-4 w-4" />
                                    {{ formatDate(video.createdAt) }}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div v-if="hasMore && !isSearching" class="flex justify-center mt-6">
                    <Button variant="outline" @click="loadMore" :disabled="isLoadingMore">
                        <Loader2Icon v-if="isLoadingMore" class="mr-2 h-4 w-4 animate-spin" />
                        Load More
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVideoStore } from '@/stores/videoStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchIcon, EyeIcon, ClockIcon, AlertCircle, Loader2Icon } from 'lucide-vue-next'
import { useDebounce } from '@/composables/useDebounce'
import { formatDate } from '@/utils/helpers'

const router = useRouter()
const videoStore = useVideoStore()

const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const isLoadingMore = ref(false)
const error = ref(null)
const hasMore = ref(true)
const hasSearched = ref(false)

const performSearch = async () => {
    if (!searchQuery.value.trim()) return

    try {
        isSearching.value = true
        error.value = null
        hasSearched.value = true
        const results = await videoStore.searchVideos(searchQuery.value)
        searchResults.value = results
        hasMore.value = results.length >= 20
    } catch (err) {
        error.value = err.message || 'Failed to search videos'
    } finally {
        isSearching.value = false
    }
}

const debouncedSearch = useDebounce(performSearch, 300)

const loadMore = async () => {
    if (isLoadingMore.value) return

    try {
        isLoadingMore.value = true
        const moreResults = await videoStore.searchVideos(searchQuery.value, searchResults.value.length)
        searchResults.value.push(...moreResults)
        hasMore.value = moreResults.length >= 20
    } catch (err) {
        error.value = err.message
    } finally {
        isLoadingMore.value = false
    }
}

const viewVideo = (videoId) => {
    router.push({ name: 'Watch', params: { id: videoId } })
}

const formatViews = (views) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(views)
}
</script>