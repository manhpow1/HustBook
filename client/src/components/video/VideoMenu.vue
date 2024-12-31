<template>
    <Dialog :open="isOpen" @update:open="$emit('update:isOpen', $event)">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Video Options</DialogTitle>
            </DialogHeader>

            <div class="grid gap-4">
                <div class="flex flex-col gap-2">
                    <!-- Report Video -->
                    <Button variant="ghost" class="w-full justify-start" @click="handleReport">
                        <FlagIcon class="mr-2 h-4 w-4" />
                        Report Video
                    </Button>

                    <!-- Add Friend -->
                    <Button v-if="!isUploader && !isFriend" variant="ghost" class="w-full justify-start"
                        @click="handleAddFriend">
                        <UserPlusIcon class="mr-2 h-4 w-4" />
                        Add Friend
                    </Button>

                    <!-- Block User -->
                    <Button v-if="!isUploader" variant="ghost"
                        class="w-full justify-start text-destructive hover:text-destructive" @click="handleBlock">
                        <ShieldIcon class="mr-2 h-4 w-4" />
                        Block User
                    </Button>

                    <!-- Share Video -->
                    <Button variant="ghost" class="w-full justify-start" @click="handleShare">
                        <ShareIcon class="mr-2 h-4 w-4" />
                        Share Video
                    </Button>

                    <!-- Download Video -->
                    <Button v-if="canDownload" variant="ghost" class="w-full justify-start" @click="handleDownload">
                        <DownloadIcon class="mr-2 h-4 w-4" />
                        Download Video
                    </Button>

                    <!-- Add to Playlist -->
                    <Button variant="ghost" class="w-full justify-start" @click="handleAddToPlaylist">
                        <ListPlusIcon class="mr-2 h-4 w-4" />
                        Add to Playlist
                    </Button>
                </div>
            </div>

            <DialogFooter class="flex items-center">
                <Button variant="secondary" @click="$emit('update:isOpen', false)">
                    Close
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <AlertDialog :open="showConfirmBlock" @update:open="showConfirmBlock = false">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Block User</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to block this user? They won't be able to interact with you or see your content.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel @click="showConfirmBlock = false">Cancel</AlertDialogCancel>
                <AlertDialogAction @click="confirmBlock">Block</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FlagIcon, UserPlusIcon, ShieldIcon, ShareIcon, DownloadIcon, ListPlusIcon } from 'lucide-vue-next'
import { useUserStore } from '@/stores/userStore'

const props = defineProps({
    isOpen: Boolean,
    videoId: {
        type: String,
        required: true
    },
    uploaderId: {
        type: String,
        required: true
    },
    canDownload: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:isOpen', 'report', 'addFriend', 'block', 'share', 'download', 'addToPlaylist'])

const userStore = useUserStore()
const { toast } = useToast()
const showConfirmBlock = ref(false)

const isUploader = computed(() => props.uploaderId === userStore.user?.id)
const isFriend = computed(() => userStore.friends?.includes(props.uploaderId))

// Action Handlers
const handleReport = () => {
    emit('report')
    emit('update:isOpen', false)
}

const handleAddFriend = () => {
    emit('addFriend')
    emit('update:isOpen', false)
    toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent"
    })
}

const handleBlock = () => {
    showConfirmBlock.value = true
}

const confirmBlock = () => {
    emit('block')
    showConfirmBlock.value = false
    emit('update:isOpen', false)
    toast({
        title: "User Blocked",
        description: "The user has been blocked successfully"
    })
}

const handleShare = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Check out this video',
                url: window.location.href
            })
            toast({
                title: "Shared Successfully"
            })
        } catch (err) {
            if (err.name !== 'AbortError') {
                toast({
                    title: "Error Sharing",
                    description: "Failed to share the video",
                    variant: "destructive"
                })
            }
        }
    } else {
        // Fallback copy to clipboard
        navigator.clipboard.writeText(window.location.href)
        toast({
            title: "Link Copied",
            description: "Video link copied to clipboard"
        })
    }
    emit('update:isOpen', false)
}

const handleDownload = () => {
    emit('download')
    emit('update:isOpen', false)
    toast({
        title: "Download Started",
        description: "Your video download has started"
    })
}

const handleAddToPlaylist = () => {
    emit('addToPlaylist')
    emit('update:isOpen', false)
}
</script>