<template>
    <div class="flex items-center justify-between space-x-4 py-4">
        <Button variant="ghost" size="sm" :class="[
            post.isLiked === '1' ? 'text-primary' : 'text-muted-foreground',
            'hover:text-primary'
        ]" :disabled="isLiking" @click="debouncedHandleLike" aria-label="Like post">
            <div class="relative flex items-center gap-2">
                <HeartIcon :class="[
                    'h-5 w-5',
                    post.isLiked === '1' ? 'fill-current' : 'fill-none',
                    isLiking ? 'opacity-50' : 'opacity-100'
                ]" />
                <Loader2Icon v-if="isLiking" class="absolute inset-0 h-5 w-5 animate-spin" />
                <span>{{ formattedLikes }}</span>
                <span class="sr-only">likes</span>
            </div>
        </Button>

        <Button variant="ghost" size="sm" class="text-muted-foreground hover:text-primary" @click="handleComment"
            aria-label="Comment on post">
            <div class="flex items-center gap-2">
                <MessageSquareIcon class="h-5 w-5" />
                <span>{{ formattedComments }}</span>
                <span class="sr-only">comments</span>
            </div>
        </Button>

        <Button variant="ghost" size="sm" class="text-muted-foreground hover:text-primary" @click="handleShare"
            aria-label="Share post">
            <div class="flex items-center gap-2">
                <ShareIcon class="h-5 w-5" />
                <span>Share</span>
            </div>
        </Button>
    </div>

    <Toaster />
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePostStore } from '@/stores/postStore'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toast'
import { HeartIcon, MessageSquareIcon, ShareIcon, Loader2Icon } from 'lucide-vue-next'
import { formatNumber } from '@/utils/numberFormat'
import { useDebounce } from '@/composables/useDebounce'

const props = defineProps({
    post: {
        type: Object,
        required: true,
        validator(post) {
            return post && typeof post === 'object' && 'postId' in post
        }
    }
})

const emit = defineEmits(['comment', 'like'])

const postStore = usePostStore()
const { toast } = useToast()
const isLiking = ref(false)

// Computed
const formattedLikes = computed(() => formatNumber(props.post.like || 0))
const formattedComments = computed(() => formatNumber(props.post.comment || 0))

// Methods
const handleLike = async () => {
    if (isLiking.value) return

    isLiking.value = true
    try {
        await postStore.toggleLike(props.post.postId)
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to like post. Please try again.",
            variant: "destructive"
        })
        logger.error('Error toggling like:', error)
    } finally {
        isLiking.value = false
    }
}

const debouncedHandleLike = useDebounce(handleLike, 300)

const handleComment = () => {
    emit('comment')
}

const handleShare = async () => {
    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Share Post',
                text: props.post.content,
                url: window.location.href
            })
        } else {
            await navigator.clipboard.writeText(window.location.href)
            toast({
                description: "Link copied to clipboard"
            })
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            toast({
                title: "Error",
                description: "Failed to share post",
                variant: "destructive"
            })
        }
    }
}
</script>
