<template>
    <Card class="comment-item">
        <CardContent class="p-4">
            <div class="flex space-x-4">
                <Avatar>
                    <AvatarImage :src="comment.user.avatar" :alt="comment.user.name" />
                    <AvatarFallback>
                        {{ getInitials(comment.user.name) }}
                    </AvatarFallback>
                </Avatar>

                <div class="flex-1 space-y-2">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <h4 class="font-semibold">{{ comment.user.name }}</h4>
                            <span class="text-sm text-muted-foreground">
                                {{ formattedDate }}
                            </span>
                        </div>

                        <DropdownMenu v-if="canEditDelete">
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <MoreVerticalIcon class="h-4 w-4" />
                                    <span class="sr-only">More options</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem @click="toggleEdit">
                                    <PencilIcon class="h-4 w-4 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem @click="openDeleteDialog" class="text-destructive">
                                    <TrashIcon class="h-4 w-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div v-if="!isEditing" class="text-sm prose prose-sm max-w-none" v-html="renderedContent" />

                    <div v-else class="space-y-2">
                        <Textarea v-model="editedContent" :rows="3" placeholder="Edit your comment..."
                            class="w-full resize-none" />
                        <p v-if="commentError" class="text-sm text-destructive">
                            {{ commentError }}
                        </p>
                        <div class="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" @click="cancelEdit">
                                Cancel
                            </Button>
                            <Button size="sm" :disabled="isSaveLoading" @click="saveEdit">
                                <Loader2Icon v-if="isSaveLoading" class="mr-2 h-4 w-4 animate-spin" />
                                {{ isSaveLoading ? 'Saving...' : 'Save' }}
                            </Button>
                        </div>
                    </div>

                    <div class="flex items-center space-x-4 pt-2">
                        <Button variant="ghost" size="sm" :class="{ 'text-primary': comment.isLiked }"
                            @click="toggleLike" :disabled="isLikeLoading">
                            <ThumbsUpIcon class="h-4 w-4 mr-2" :class="{ 'fill-current': comment.isLiked }" />
                            <span>{{ comment.like }} {{ comment.like === 1 ? 'Like' : 'Likes' }}</span>
                            <Loader2Icon v-if="isLikeLoading" class="ml-2 h-4 w-4 animate-spin" />
                        </Button>
                        <Button variant="ghost" size="sm" @click="toggleReply">
                            <ReplyIcon class="h-4 w-4 mr-2" />
                            Reply
                        </Button>
                    </div>
                </div>
            </div>
        </CardContent>

        <AlertDialog :open="showDeleteDialog">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this comment? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="closeDeleteDialog">Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="confirmDelete" :disabled="isDeleteLoading"
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        <Loader2Icon v-if="isDeleteLoading" class="mr-2 h-4 w-4 animate-spin" />
                        {{ isDeleteLoading ? 'Deleting...' : 'Delete' }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { renderMarkdown } from '@/utils/markdown'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { MoreVerticalIcon, PencilIcon, TrashIcon, ThumbsUpIcon, ReplyIcon, Loader2Icon } from 'lucide-vue-next'

const props = defineProps({
    comment: {
        type: Object,
        required: true,
        validator(comment) {
            return ['id', 'content', 'user', 'created'].every(
                prop => prop in comment
            )
        }
    }
})

const emit = defineEmits(['update', 'delete'])
const userStore = useUserStore()

const isEditing = ref(false)
const editedContent = ref(props.comment.content)
const commentError = ref('')
const isSaveLoading = ref(false)
const isDeleteLoading = ref(false)
const isLikeLoading = ref(false)
const showDeleteDialog = ref(false)

// Computed
const canEditDelete = computed(() =>
    userStore.user?.userId === props.comment.user.userId
)

const formattedDate = computed(() =>
    formatDistanceToNow(new Date(props.comment.created), { addSuffix: true })
)

const renderedContent = computed(() =>
    renderMarkdown(props.comment.content)
)

// Methods
const getInitials = (name) => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

const toggleEdit = () => {
    isEditing.value = !isEditing.value
    if (isEditing.value) {
        editedContent.value = props.comment.content
        commentError.value = ''
    }
}

const cancelEdit = () => {
    isEditing.value = false
    editedContent.value = props.comment.content
    commentError.value = ''
}

const saveEdit = async () => {
    if (editedContent.value.trim() === '') {
        commentError.value = 'Comment cannot be empty'
        return
    }

    if (editedContent.value === props.comment.content) {
        isEditing.value = false
        return
    }

    try {
        isSaveLoading.value = true
        await emit('update', {
            id: props.comment.id,
            content: editedContent.value.trim()
        })
        isEditing.value = false
    } catch (error) {
        commentError.value = 'Failed to update comment'
    } finally {
        isSaveLoading.value = false
    }
}

const openDeleteDialog = () => {
    showDeleteDialog.value = true
}

const closeDeleteDialog = () => {
    showDeleteDialog.value = false
}

const confirmDelete = async () => {
    try {
        isDeleteLoading.value = true
        await emit('delete', props.comment.id)
        showDeleteDialog.value = false
    } catch (error) {
        console.error('Error deleting comment:', error)
    } finally {
        isDeleteLoading.value = false
    }
}

const toggleLike = async () => {
    if (isLikeLoading.value) return

    isLikeLoading.value = true
    try {
        await emit('update', {
            id: props.comment.id,
            isLiked: !props.comment.isLiked,
            like: props.comment.like + (props.comment.isLiked ? -1 : 1)
        })
    } catch (error) {
        console.error('Error toggling like:', error)
    } finally {
        isLikeLoading.value = false
    }
}

const toggleReply = () => {
    // Implement reply functionality
    console.log('Reply clicked')
}
</script>

<style scoped>
:deep(.prose) {
    @apply text-foreground;
}

:deep(.prose p) {
    @apply mb-0;
}

:deep(.prose a) {
    @apply text-primary hover:text-primary/80;
}

:deep(.prose code) {
    @apply bg-muted px-1 py-0.5 rounded;
}
</style>