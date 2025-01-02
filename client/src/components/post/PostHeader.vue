<template>
    <Card class="border-0 shadow-none">
        <CardHeader class="space-y-4 p-0">
            <div class="flex items-center justify-between">
                <!-- Author Info -->
                <div class="flex items-center space-x-4">
                    <Avatar>
                        <AvatarImage :src="post.author?.avatar || defaultAvatar"
                            :alt="post.author?.name || 'Unknown Author'" />
                        <AvatarFallback>
                            {{ getInitials(post.author?.name || 'Unknown') }}
                        </AvatarFallback>
                    </Avatar>

                    <div class="space-y-1">
                        <h2 class="text-lg font-semibold leading-none">
                            {{ post.author?.name || 'Unknown Author' }}
                        </h2>
                        <time :datetime="post.created" class="text-sm text-muted-foreground">
                            {{ formattedDate }}
                        </time>
                    </div>
                </div>

                <!-- Action Menu -->
                <DropdownMenu v-if="isOwnPost">
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Post options" data-testid="post-options-button">
                            <MoreVertical class="h-5 w-5" aria-hidden="true" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-48">
                        <DropdownMenuItem @click="editPost">
                            <Pencil class="mr-2 h-4 w-4" aria-hidden="true" />
                            <span>Edit Post</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem @click="confirmDeletePost" class="text-destructive">
                            <Trash class="mr-2 h-4 w-4" aria-hidden="true" />
                            <span>Delete Post</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem @click="reportPost">
                            <Flag class="mr-2 h-4 w-4" aria-hidden="true" />
                            <span>Report Post</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem @click="sharePost">
                            <Share class="mr-2 h-4 w-4" aria-hidden="true" />
                            <span>Share Post</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>

        <!-- Delete Confirmation Dialog -->
        <AlertDialog :open="showDeleteDialog">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this post? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="closeDeleteDialog">Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="handleDelete"
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- Share Dialog -->
        <Dialog :open="showShareDialog">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share Post</DialogTitle>
                    <DialogDescription>
                        Share this post with others
                    </DialogDescription>
                </DialogHeader>
                <div class="grid gap-4 py-4">
                    <div class="flex items-center space-x-4">
                        <Input ref="shareUrlInput" :value="shareUrl" readonly class="flex-1" />
                        <Button @click="copyShareUrl" size="sm">
                            <Copy class="mr-2 h-4 w-4" />
                            Copy
                        </Button>
                    </div>
                    <div class="flex justify-center space-x-4">
                        <Button variant="outline" @click="shareToSocial('twitter')">
                            Twitter
                        </Button>
                        <Button variant="outline" @click="shareToSocial('facebook')">
                            Facebook
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <!-- Error Alert -->
        <Alert v-if="error" variant="destructive" class="mt-4">
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
    </Card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from '@/components/ui/toast'
import { format, formatDistanceToNow } from 'date-fns'
import defaultAvatar from '@/assets/avatar-default.svg'
import { MoreVertical, Pencil, Trash, Flag, Share, Copy, AlertCircle } from 'lucide-vue-next'

import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const props = defineProps({
    post: {
        type: Object,
        required: true,
        validator(post) {
            return post &&
                typeof post.created === 'string' &&
                typeof post.author === 'object'
        }
    },
    isOwnPost: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['editPost', 'deletePost', 'reportPost', 'sharePost'])

// State
const error = ref(null)
const showDeleteDialog = ref(false)
const showShareDialog = ref(false)
const shareUrlInput = ref(null)

// Computed
const formattedDate = computed(() => {
    try {
        const date = new Date(props.post.created)
        const now = new Date()
        const diffInHours = (now - date) / (1000 * 60 * 60)

        return diffInHours < 24
            ? formatDistanceToNow(date, { addSuffix: true })
            : format(date, 'PPP')
    } catch (err) {
        error.value = 'Invalid date format'
        return 'Unknown date'
    }
})

const shareUrl = computed(() => {
    return window.location.href
})

// Methods
const { toast } = useToast()

const getInitials = (name) => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

const editPost = () => {
    emit('editPost')
}

const confirmDeletePost = () => {
    showDeleteDialog.value = true
}

const closeDeleteDialog = () => {
    showDeleteDialog.value = false
}

const handleDelete = () => {
    emit('deletePost')
    closeDeleteDialog()
}

const reportPost = () => {
    emit('reportPost')
}

const sharePost = () => {
    if (navigator.share) {
        navigator.share({
            title: props.post.author?.name,
            text: props.post.described,
            url: window.location.href,
        }).catch((err) => {
            if (err.name !== 'AbortError') {
                showShareDialog.value = true
            }
        })
    } else {
        showShareDialog.value = true
    }
}

const copyShareUrl = async () => {
    try {
        await navigator.clipboard.writeText(shareUrl.value)
        toast({
            title: "Success",
            description: "Link copied to clipboard",
        })
    } catch (err) {
        error.value = 'Failed to copy link'
    }
}

const shareToSocial = (platform) => {
    const url = shareUrl.value
    const text = encodeURIComponent(props.post.described || '')

    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    }

    window.open(shareUrls[platform], '_blank')
}
</script>