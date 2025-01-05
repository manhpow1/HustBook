<template>
    <div v-if="isOwnPost">
        <!-- Delete Trigger Button -->
        <Button variant="destructive" class="w-full flex items-center justify-center gap-2" @click="openModal"
            :disabled="isDeleting">
            <TrashIcon class="h-4 w-4" />
            Delete Post
        </Button>

        <!-- Delete Confirmation Dialog -->
        <AlertDialog :open="showConfirmation" @update:open="handleDialogChange" :closeOnOutsideClick="!isDeleting">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete this post? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <!-- Error Alert -->
                <Alert v-if="error" variant="destructive" class="my-4">
                    <AlertCircleIcon class="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{{ error }}</AlertDescription>
                </Alert>

                <AlertDialogFooter>
                    <AlertDialogCancel :disabled="isDeleting" @click="closeModal">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction variant="destructive" :disabled="isDeleting" @click="confirmDelete">
                        <Loader2Icon v-if="isDeleting" class="mr-2 h-4 w-4 animate-spin" />
                        {{ isDeleting ? 'Deleting...' : 'Delete' }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- Success Toast -->
        <Toaster />
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePostStore } from '@/stores/postStore'
import { useToast } from '@/components/ui/toast'
import { AlertCircleIcon, TrashIcon, Loader2Icon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from '@/components/ui/alert-dialog'
import { Toaster } from '../ui/toast'

const props = defineProps({
    postId: {
        type: String,
        required: true,
        validator(value) {
            return value.length > 0
        }
    },
    isOwnPost: {
        type: Boolean,
        required: true
    }
})

const emit = defineEmits(['post-deleted'])

// Component state
const showConfirmation = ref(false)
const isDeleting = ref(false)
const error = ref('')

// Composables
const router = useRouter()
const postStore = usePostStore()
const { toast } = useToast()

// Methods
const openModal = () => {
    error.value = ''
    showConfirmation.value = true
}

const closeModal = () => {
    if (!isDeleting.value) {
        showConfirmation.value = false
        error.value = ''
    }
}

const handleDialogChange = (value) => {
    if (!value && !isDeleting.value) {
        closeModal()
    }
}

const confirmDelete = async () => {
    if (isDeleting.value) return

    isDeleting.value = true
    error.value = ''

    try {
        const response = await postStore.removePost(props.postId)

        if (response?.code === '1000') {
            toast({
                title: "Success",
                description: "Post deleted successfully",
            })

            emit('post-deleted')
            router.push({ name: 'Home' })
        } else {
            throw new Error(response?.message || 'Failed to delete post')
        }
    } catch (err) {
        error.value = err.message || 'An error occurred while deleting the post'
        toast({
            title: "Error",
            description: error.value,
            variant: "destructive",
        })
    } finally {
        isDeleting.value = false

        // Only close on success
        if (!error.value) {
            closeModal()
        }
    }
}
</script>
