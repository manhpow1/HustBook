<template>
    <div class="container mx-auto px-4 py-6">
        <div class="flex flex-col lg:flex-row gap-6">
            <!-- Main video section -->
            <div class="lg:w-2/3">
                <VideoPlayer v-if="currentVideo" :video="currentVideo" @ended="handleVideoEnd" />

                <Card class="mt-4">
                    <CardContent class="p-4">
                        <div class="flex items-start justify-between">
                            <div>
                                <h1 class="text-2xl font-bold">{{ currentVideo?.title }}</h1>
                                <div class="mt-2 flex items-center gap-4 text-muted-foreground">
                                    <span>{{ formatViews(currentVideo?.views) }} views</span>
                                    <span>{{ formatTimeAgo(currentVideo?.createdAt) }}</span>
                                </div>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVerticalIcon class="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem @click="handleShare">
                                        <ShareIcon class="mr-2 h-4 w-4" /> Share
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="handleSave">
                                        <BookmarkIcon class="mr-2 h-4 w-4" /> Save
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="handleReport">
                                        <FlagIcon class="mr-2 h-4 w-4" /> Report
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <Separator class="my-4" />

                        <div class="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage :src="currentVideo?.author.avatar" />
                                <AvatarFallback>{{ getInitials(currentVideo?.author.name) }}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 class="font-semibold">{{ currentVideo?.author.name }}</h3>
                                <p class="text-sm text-muted-foreground">{{
                                    formatSubscribers(currentVideo?.author.subscribers) }} subscribers</p>
                            </div>
                            <Button variant="secondary" class="ml-auto">Subscribe</Button>
                        </div>

                        <Collapsible class="mt-4">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" class="w-full justify-between">
                                    Description
                                    <ChevronDownIcon class="h-4 w-4" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent class="mt-2 text-sm">
                                {{ currentVideo?.description }}
                            </CollapsibleContent>
                        </Collapsible>
                    </CardContent>
                </Card>
            </div>

            <!-- Recommendations section -->
            <div class="lg:w-1/3">
                <h2 class="text-lg font-semibold mb-4">Up Next</h2>
                <div class="space-y-4">
                    <Card v-for="video in recommendations" :key="video.id"
                        class="cursor-pointer hover:bg-accent/50 transition-colors" @click="loadVideo(video.id)">
                        <CardContent class="p-3 flex gap-4">
                            <AspectRatio ratio={16/9} class="w-40">
                                <img :src="video.thumbnail" :alt="video.title" class="object-cover rounded-md" />
                            </AspectRatio>
                            <div class="flex-1 min-w-0">
                                <h3 class="font-medium line-clamp-2">{{ video.title }}</h3>
                                <p class="text-sm text-muted-foreground mt-1">{{ video.author.name }}</p>
                                <div class="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <span>{{ formatViews(video.views) }} views</span>
                                    <span>•</span>
                                    <span>{{ formatTimeAgo(video.createdAt) }}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useVideoStore } from '@/stores/videoStore';
import { useToast } from '@/components/ui/toast';
import VideoPlayer from '@/components/video/VideoPlayer.vue';
import { formatTimeAgo } from '@/utils/helpers';
import { MoreVerticalIcon, ShareIcon, BookmarkIcon, FlagIcon, ChevronDownIcon } from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const route = useRoute()
const router = useRouter()
const videoStore = useVideoStore()
const { toast } = useToast()

const currentVideo = ref(null)
const recommendations = ref([])

const loadVideo = async (videoId) => {
    try {
        const video = await videoStore.getVideo(videoId)
        currentVideo.value = video
        recommendations.value = await videoStore.getRecommendations(videoId)

        // Update URL without reloading
        router.replace({
            name: 'Watch',
            params: { id: videoId }
        }, { shallow: true })
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to load video",
            variant: "destructive"
        })
    }
}

const handleVideoEnd = () => {
    if (recommendations.value.length > 0) {
        loadVideo(recommendations.value[0].id)
    }
}

const handleShare = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: currentVideo.value.title,
                url: window.location.href
            })
        } catch (err) {
            if (err.name !== 'AbortError') {
                toast({
                    title: "Error",
                    description: "Failed to share video",
                    variant: "destructive"
                })
            }
        }
    } else {
        await navigator.clipboard.writeText(window.location.href)
        toast({
            title: "Link Copied",
            description: "Video link copied to clipboard"
        })
    }
}

const handleSave = () => {
    videoStore.saveVideo(currentVideo.value.id)
    toast({
        title: "Video Saved",
        description: "Added to your saved videos"
    })
}

const handleReport = () => {
    // Implementation for reporting video
}

const formatViews = (views) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(views)
}

const formatSubscribers = (count) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(count)
}

const getInitials = (name) => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

watch(() => route.params.id, (newId) => {
    if (newId) {
        loadVideo(newId)
    }
})

onMounted(() => {
    if (route.params.id) {
        loadVideo(route.params.id)
    }
})
</script>