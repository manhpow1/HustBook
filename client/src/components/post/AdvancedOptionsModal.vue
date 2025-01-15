<template>
  <Dialog :open="isVisible" @update:open="$emit('update:isVisible', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <AlertDialog :open="showDeleteConfirmation" @update:open="handleDeleteDialogChange"
        :closeOnOutsideClick="!isDeleting">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Alert v-if="error" variant="destructive" class="my-4">
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel :disabled="isDeleting || isLoading" @click="closeDeleteModal">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" :disabled="isDeleting || isLoading" @click="confirmDelete">
              <Loader2Icon v-if="isDeleting || isLoading" class="mr-2 h-4 w-4 animate-spin" />
              {{ isDeleting ? 'Deleting...' : 'Delete' }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <!-- Main Modal Content -->
      <div v-if="!showReportForm">
        <DialogHeader>
          <DialogTitle>Advanced Options</DialogTitle>
          <DialogDescription>
            Manage post settings and actions
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="space-y-2">
            <div v-if="post.isOwner">
              <Button variant="ghost" class="w-full justify-start" @click="navigateToEdit">
                <PencilIcon class="mr-2 h-4 w-4" />
                Edit Post
              </Button>
              <Button variant="ghost" class="w-full justify-start" @click="openDeleteModal">
                <TrashIcon class="mr-2 h-4 w-4" />
                Delete Post
              </Button>
            </div>
            <div class="mt-2" v-if="!post.isOwner">
              <Button variant="ghost" class="w-full justify-start text-destructive" @click="showReportForm = true">
                <Flag class="mr-2 h-4 w-4" />
                Report Post
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" @click="closeModal">Close</Button>
        </DialogFooter>
      </div>

      <!-- Report Form Content -->
      <div v-else class="space-y-6">
        <DialogHeader>
          <DialogTitle>Report Post</DialogTitle>
          <DialogDescription>
            Please provide details about why you're reporting this post.
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleReportSubmit" class="space-y-6">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="reason">Reason for Report</Label>
              <Select v-model="reportForm.reason" name="reason">
                <SelectTrigger :class="{ 'border-destructive': reportForm.errors.reason }">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="inappropriateContent">Inappropriate Content</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="hateSpeech">Hate Speech</SelectItem>
                  <SelectItem value="violence">Violence</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="reportForm.errors.reason" class="text-sm text-destructive">
                {{ reportForm.errors.reason }}
              </p>
            </div>
            <div v-if="reportForm.reason === 'other'" class="space-y-2">
              <Label for="details">Additional Details</Label>
              <Textarea id="details" v-model="reportForm.details"
                :class="{ 'border-destructive': reportForm.errors.details }"
                placeholder="Please provide more information..." :disabled="reportForm.isSubmitting" :rows="4" />
              <p v-if="reportForm.errors.details" class="text-sm text-destructive">
                {{ reportForm.errors.details }}
              </p>
              <p class="text-sm text-muted-foreground">
                {{ reportForm.remainingChars }} characters remaining
              </p>
            </div>
          </div>

          <Alert v-if="reportForm.error" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ reportForm.error }}</AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" type="button" @click="cancelReport" :disabled="reportForm.isSubmitting">
              Back
            </Button>
            <Button type="submit" :disabled="reportForm.isSubmitting || !isReportValid">
              <Loader2Icon v-if="reportForm.isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
              {{ reportForm.isSubmitting ? 'Submitting...' : 'Submit Report' }}
            </Button>
          </DialogFooter>
        </form>
      </div>

    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePostStore } from '@/stores/postStore'
import { Flag, PencilIcon, TrashIcon, AlertCircle, Loader2Icon } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'

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

const router = useRouter()
const postStore = usePostStore()
const { toast } = useToast()

// Modal State
const showDeleteConfirmation = ref(false)
const isDeleting = ref(false)
const isLoading = ref(false)
const error = ref('')
const showReportForm = ref(false)

// Report Form State
const MAX_DETAILS_LENGTH = 500
const reportForm = ref({
  reason: '',
  details: '',
  errors: {},
  error: null,
  isSubmitting: false,
  remainingChars: MAX_DETAILS_LENGTH
})

// Computed
const isReportValid = computed(() => {
  if (!reportForm.value.reason) return false
  if (reportForm.value.reason === 'other' && !reportForm.value.details.trim()) return false
  return true
})

// Methods
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
  if (isDeleting.value || isLoading.value) return
  isDeleting.value = true
  isLoading.value = true
  error.value = ''

  try {
    const response = await postStore.removePost(props.post.postId)
    if (response?.code === '1000') {
      toast({
        title: "Success",
        description: "Post deleted successfully",
      })
      emit('post-deleted')
      closeModal()
      router.push('/')
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
    isLoading.value = false
    if (!error.value) {
      closeDeleteModal()
      closeModal()
    }
  }
}

// Report Methods
const validateReportForm = () => {
  reportForm.value.errors = {}

  if (!reportForm.value.reason) {
    reportForm.value.errors.reason = 'Please select a reason'
  }

  if (reportForm.value.reason === 'other') {
    if (!reportForm.value.details.trim()) {
      reportForm.value.errors.details = 'Please provide additional details'
    } else if (reportForm.value.details.length > MAX_DETAILS_LENGTH) {
      reportForm.value.errors.details = `Details must be less than ${MAX_DETAILS_LENGTH} characters`
    }
  }

  return Object.keys(reportForm.value.errors).length === 0
}

const handleReportSubmit = async () => {
  if (!validateReportForm()) return
  reportForm.value.isSubmitting = true
  reportForm.value.error = null

  try {
    const details = reportForm.value.reason === 'other' ? reportForm.value.details : '';

    await postStore.reportPost(
      props.post.postId,
      reportForm.value.reason,
      details
    );

    toast({
      title: 'Report Submitted',
      description: 'Thank you for helping keep our community safe.',
      variant: 'default',
    })

    emit('post-removed')
    closeModal()
  } catch (err) {
    reportForm.value.error = err.message || 'Failed to submit report'
    toast({
      title: 'Error',
      description: reportForm.value.error,
      variant: 'destructive',
    })
  } finally {
    reportForm.value.isSubmitting = false
  }
}

const cancelReport = () => {
  showReportForm.value = false
  reportForm.value = {
    reason: '',
    details: '',
    errors: {},
    error: null,
    isSubmitting: false,
    remainingChars: MAX_DETAILS_LENGTH
  }
}

const closeModal = () => {
  emit('update:isVisible', false)
  showReportForm.value = false
  cancelReport()
}
</script>