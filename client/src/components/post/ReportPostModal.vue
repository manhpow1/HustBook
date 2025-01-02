<template>
    <Dialog :open="isOpen" @update:open="handleClose">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Report Post</DialogTitle>
                <DialogDescription>
                    Please provide details about why you're reporting this post.
                </DialogDescription>
            </DialogHeader>

            <form @submit.prevent="handleSubmit" class="space-y-6">
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="reason">Reason for Report</Label>
                        <Select v-model="reason" name="reason">
                            <SelectTrigger :class="{ 'border-destructive': errors.reason }">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="spam">Spam</SelectItem>
                                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                                <SelectItem value="harassment">Harassment</SelectItem>
                                <SelectItem value="hateSpeech">Hate Speech</SelectItem>
                                <SelectItem value="violence">Violence</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <p v-if="errors.reason" class="text-sm text-destructive">
                            {{ errors.reason }}
                        </p>
                    </div>

                    <div v-if="reason === 'other'" class="space-y-2">
                        <Label for="details">Additional Details</Label>
                        <Textarea id="details" v-model="details" :class="{ 'border-destructive': errors.details }"
                            placeholder="Please provide more information..." :disabled="isSubmitting" :rows="4" />
                        <p v-if="errors.details" class="text-sm text-destructive">
                            {{ errors.details }}
                        </p>
                        <p class="text-sm text-muted-foreground">
                            {{ remainingChars }} characters remaining
                        </p>
                    </div>
                </div>

                <Alert v-if="error" variant="destructive">
                    <AlertCircle class="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{{ error }}</AlertDescription>
                </Alert>

                <DialogFooter>
                    <Button variant="outline" type="button" :disabled="isSubmitting" @click="handleClose">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="isSubmitting || !isValid">
                        <Loader2Icon v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
                        {{ isSubmitting ? 'Submitting...' : 'Submit Report' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from '@/components/ui/toast'
import { useErrorHandler } from '@/utils/errorHandler'
import { AlertCircle, Loader2Icon } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
    postId: {
        type: String,
        required: true,
    }
})

const emit = defineEmits(['update:isOpen', 'report-submitted', 'close'])

// Composables
const { toast } = useToast()
const { handleError } = useErrorHandler()

// Constants
const MAX_DETAILS_LENGTH = 500

// State
const reason = ref('')
const details = ref('')
const errors = ref({})
const isSubmitting = ref(false)
const error = ref(null)

// Computed
const remainingChars = computed(() => MAX_DETAILS_LENGTH - details.value.length)
const isValid = computed(() => {
    if (!reason.value) return false
    if (reason.value === 'other' && !details.value.trim()) return false
    return true
})

// Methods
const validateForm = () => {
    errors.value = {}

    if (!reason.value) {
        errors.value.reason = 'Please select a reason'
    }

    if (reason.value === 'other') {
        if (!details.value.trim()) {
            errors.value.details = 'Please provide additional details'
        } else if (details.value.length > MAX_DETAILS_LENGTH) {
            errors.value.details = `Details must be less than ${MAX_DETAILS_LENGTH} characters`
        }
    }

    return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
    if (!validateForm()) return

    isSubmitting.value = true
    error.value = null

    try {
        // Send report to backend
        await submitReport()

        toast({
            title: 'Report Submitted',
            description: 'Thank you for helping keep our community safe.',
            variant: 'default',
        })

        emit('report-submitted')
        handleClose()

    } catch (err) {
        error.value = err.message || 'Failed to submit report'
        await handleError(err)

        toast({
            title: 'Error',
            description: error.value,
            variant: 'destructive',
        })
    } finally {
        isSubmitting.value = false
    }
}

const submitReport = async () => {
    const response = await fetch(`/api/posts/${props.postId}/report`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            reason: reason.value,
            details: details.value,
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to submit report')
    }

    return response.json()
}

const handleClose = () => {
    // Reset form state
    reason.value = ''
    details.value = ''
    errors.value = {}
    error.value = null

    emit('close')
    emit('update:isOpen', false)
}
</script>