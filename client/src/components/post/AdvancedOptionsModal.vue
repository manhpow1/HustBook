<template>
  <Dialog :open="isVisible" @update:open="$emit('update:isVisible', $event)">
    <DialogContent class="sm:max-w-[425px]">
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

            <Button variant="ghost" class="w-full justify-start" @click="showDeleteModal = true">
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

  <DeletePost v-if="showDeleteModal" :postId="post.postId" @post-deleted="handlePostDeleted" />
  
  <ReportPostModal 
    v-if="showReportModal" 
    :postId="post.postId" 
    @close="showReportModal = false"
    @report-submitted="handleReportSubmitted" 
    @post-removed="handlePostRemoved" 
  />
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PencilIcon, TrashIcon, Flag } from 'lucide-vue-next'
import DeletePost from './DeletePost.vue'
import ReportPostModal from './ReportPostModal.vue'

const router = useRouter()
const showDeleteModal = ref(false)
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

const handlePostDeleted = () => {
  showDeleteModal.value = false
  closeModal()
  emit('post-deleted')
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
