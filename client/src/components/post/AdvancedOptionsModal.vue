<template>
  <Dialog :open="isVisible" @update:open="$emit('update:isVisible', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <!-- Delete Confirmation Dialog -->
      <AlertDialog :open="showDeleteConfirmation" @update:open="handleDeleteDialogChange"
        :closeOnOutsideClick="!isDeleting">
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
            <AlertDialogCancel :disabled="isDeleting" @click="closeDeleteModal">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" :disabled="isDeleting" @click="confirmDelete">
              <Loader2Icon v-if="isDeleting" class="mr-2 h-4 w-4 animate-spin" />
              {{ isDeleting ? 'Deleting...' : 'Delete' }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DialogHeader>
        <DialogTitle>Advanced Options</DialogTitle>
        <DialogDescription>
          Manage post settings and actions
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="space-y-2">
          <div>
            <Button variant="ghost" class="w-full justify-start" @click="navigateToEdit">
              <PencilIcon class="mr-2 h-4 w-4" />
              Edit Post
            </Button>

            <Button variant="ghost" class="w-full justify-start" @click="openDeleteModal">
              <TrashIcon class="mr-2 h-4 w-4" />
              Delete Post
            </Button>
          </div>

          <div>
            <Button variant="ghost" class="w-full justify-start text-destructive" @click="showReportModal = true">
              <Flag class="mr-2 h-4 w-4" />
              Report Post
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="closeModal">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ReportPostModal v-if="showReportModal" :postId="post.postId" @close="showReportModal = false"
    @report-submitted="handleReportSubmitted" @post-removed="handlePostRemoved" />
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PencilIcon, TrashIcon, Flag, AlertCircleIcon, Loader2Icon } from 'lucide-vue-next'
import { usePostStore } from '@/stores/postStore'
import { useToast } from '@/components/ui/toast'
import ReportPostModal from './ReportPostModal.vue'

const router = useRouter()
const showDeleteConfirmation = ref(false)
const isDeleting = ref(false)
const error = ref('')
const postStore = usePostStore()
const { toast } = useToast()
const showReportModal = ref(false)

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true
  },
  post: {
    type: Object,
    required: true,
    validator(post) {
      return post && typeof post === 'object'
    }
  }
})

const emit = defineEmits([
  'update:isVisible',
  'edit',
  'post-deleted',
  'post-removed'
])

const navigateToEdit = () => {
  router.push({
    name: 'EditPost',
    params: { postId: props.post.postId }
  })
  emit('update:isVisible', false)
}

const openDeleteModal = () => {
  error.value = ''
  showDeleteConfirmation.value = true
}

const closeDeleteModal = () => {
  if (!isDeleting.value) {
    showDeleteConfirmation.value = false
    error.value = ''
  }
}

const handleDeleteDialogChange = (value) => {
  if (!value && !isDeleting.value) {
    closeDeleteModal()
  }
}

const confirmDelete = async () => {
  if (isDeleting.value) return

  isDeleting.value = true
  error.value = ''

  try {
    const response = await postStore.removePost(props.post.postId)

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
      closeDeleteModal()
      closeModal()
    }
  }
}

const handleReportSubmitted = () => {
  showReportModal.value = false
  closeModal()
}

const handlePostRemoved = () => {
  showReportModal.value = false
  closeModal()
  emit('post-removed')
}

const closeModal = () => {
  emit('update:isVisible', false)
}
</script>
