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
            <Button variant="ghost" class="w-full justify-start" @click="handleAction('edit')">
              <PencilIcon class="mr-2 h-4 w-4" />
              Edit Post
            </Button>

            <Button variant="ghost" class="w-full justify-start" @click="handleAction('delete')">
              <TrashIcon class="mr-2 h-4 w-4" />
              Delete Post
            </Button>
          </div>

          <div>
            <Button variant="ghost" class="w-full justify-start text-destructive" @click="handleAction('report')">
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
</template>

<script setup>
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PencilIcon, TrashIcon, MessageCircleIcon, Flag, EyeOffIcon } from 'lucide-vue-next'

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
  'delete',
  'report',
])

const handleAction = (action) => {
  emit(action)
  closeModal()
}

const closeModal = () => {
  emit('update:isVisible', false)
}
</script>
