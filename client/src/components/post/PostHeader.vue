<template>
    <Card class="border-0 shadow-none">
        <CardHeader class="space-y-4 p-0">
            <div class="flex items-center justify-between">
                <!-- Author Info -->
                <div class="flex items-center space-x-4">
                    <Avatar>
                        <AvatarImage :src="post.author?.avatar || defaultAvatar"
                            :alt="post.author?.userName || 'Unknown Author'" />
                        <AvatarFallback>
                            {{ getInitials(post.author?.userName || 'Unknown') }}
                        </AvatarFallback>
                    </Avatar>

                    <div class="space-y-1">
                        <h2 class="text-lg font-semibold leading-none">
                            {{ post.author?.userName || 'Unknown Author' }}
                        </h2>
                        <time :datetime="post.created" class="text-sm text-muted-foreground">
                            {{ formattedDate }}
                        </time>
                    </div>
                </div>

                <!-- Advanced Options Trigger -->
                <Button variant="ghost" size="icon" aria-label="Post options" @click="showAdvancedOptions = true">
                    <MoreVertical class="h-5 w-5" aria-hidden="true" />
                </Button>

                <!-- Advanced Options Modal -->
                <AdvancedOptionsModal
                    :is-visible="showAdvancedOptions"
                    :post="post"
                    @update:is-visible="showAdvancedOptions = $event"
                    @edit="editPost"
                    @delete="confirmDeletePost"
                    @report="reportPost"
                />
            </div>
        </CardHeader>


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
import { formatTimeAgo } from '@/utils/helpers'
import defaultAvatar from '@/assets/avatar-default.svg'
import { MoreVertical, AlertCircle } from 'lucide-vue-next'
import AdvancedOptionsModal from './AdvancedOptionsModal.vue'
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
})

const emit = defineEmits(['editPost', 'deletePost', 'reportPost', 'sharePost'])

// State
const error = ref(null)
const showDeleteDialog = ref(false)
const showShareDialog = ref(false)
const showAdvancedOptions = ref(false)
const shareUrlInput = ref(null)

// Computed
const formattedDate = computed(() => {
    try {
        return formatTimeAgo(props.post.created)
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
            text: props.post.content,
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
    const text = encodeURIComponent(props.post.content || '')

    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    }

    window.open(shareUrls[platform], '_blank')
}
</script>
