<template>
    <Card class="shadow-none">
        <CardContent class="space-y-4 p-4">
            <form @submit.prevent="handleSubmit" class="space-y-4">
                <div class="relative">
                    <Textarea v-model="description" placeholder="What's on your mind?" :disabled="isLoading"
                        :maxLength="1000" rows="3" class="resize-none no-scrollbar" @input="validateDescription" />
                    <div class="absolute bottom-2 right-2 flex items-center gap-2">
                        <span class="text-xs text-muted-foreground">
                            {{ description.length }}/1000
                        </span>
                        <Button type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
                            @click="showEmojiPicker = !showEmojiPicker">
                            <SmileIcon class="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <div class="flex-1">
                        <FileUpload v-model="files" :maxFiles="4" accept="image/jpeg,image/png,image/gif" class="h-24"
                            @change="handleFilesChange">
                            <template #trigger>
                                <Button variant="outline" size="sm">
                                    <ImageIcon class="h-4 w-4 mr-2" />
                                    Add Images
                                </Button>
                            </template>
                        </FileUpload>
                    </div>

                    <Button type="submit" :disabled="!isValid || isLoading" size="sm">
                        <Loader2Icon v-if="isLoading" class="h-4 w-4 animate-spin mr-2" />
                        {{ isLoading ? 'Posting...' : 'Post' }}
                    </Button>
                </div>

                <div v-if="files.length > 0" class="flex gap-2 overflow-x-auto pb-2">
                    <div v-for="(file, index) in previewUrls" :key="index" class="relative h-20 w-20 flex-shrink-0">
                        <img :src="file" class="h-full w-full object-cover rounded-md" alt="Preview" />
                        <Button variant="destructive" size="icon" class="absolute -top-2 -right-2 h-6 w-6"
                            @click="removeFile(index)">
                            <XIcon class="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div v-if="descriptionError" class="text-sm text-destructive mt-1">
                    {{ descriptionError }}
                </div>
            </form>

            <Dialog :open="showEmojiPicker" @update:open="showEmojiPicker = $event">
                <DialogContent class="p-0">
                    <DialogHeader class="px-4 py-2 border-b">
                        <DialogTitle>Pick an Emoji</DialogTitle>
                        <DialogClose class="absolute right-4 top-4" onClick="() => showEmojiPicker = false" />
                    </DialogHeader>
                    <EmojiPicker @select="insertEmoji" />
                </DialogContent>
            </Dialog>
        </CardContent>
    </Card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePostStore } from '@/stores/postStore'
import { useToast } from '@/components/ui/toast'
import { ImageIcon, Loader2Icon, SmileIcon, XIcon } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogClose } from '@/components/ui/dialog'
import EmojiPicker from '../shared/EmojiPicker.vue'
import FileUpload from '../shared/FileUpload.vue'

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif']

const postStore = usePostStore()
const { toast } = useToast()

const description = ref('')
const descriptionError = ref('')
const files = ref([])
const previewUrls = ref([])
const isLoading = ref(false)
const showEmojiPicker = ref(false)

const isValid = computed(() => {
    return description.value.trim().length > 0 &&
        description.value.length <= 1000 &&
        files.value.length <= 4 &&
        !descriptionError.value
})

const validateDescription = () => {
    const content = description.value.trim()
    if (content.length === 0) {
        descriptionError.value = 'Description cannot be empty'
    } else if (content.length > 1000) {
        descriptionError.value = 'Description must not exceed 1000 characters'
    } else {
        descriptionError.value = ''
    }
}

const handleFilesChange = async (newFiles) => {
    if (!newFiles?.length) return

    // Validate file count
    if (newFiles.length > 4) {
        toast({
            title: 'Error',
            description: 'Maximum 4 files allowed',
            variant: 'destructive'
        })
        return
    }

    // Validate each file
    const invalidFiles = newFiles.filter(file => {
        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: 'Error',
                description: `File ${file.name} exceeds 4MB limit`,
                variant: 'destructive'
            })
            return true
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast({
                title: 'Error',
                description: `File ${file.name} must be JPEG, PNG or GIF`,
                variant: 'destructive'
            })
            return true
        }
        return false
    })

    if (invalidFiles.length) {
        files.value = newFiles.filter(f => !invalidFiles.includes(f))
    } else {
        files.value = newFiles
    }

    // Generate previews
    previewUrls.value = []
    for (const file of files.value) {
        const reader = new FileReader()
        reader.onload = (e) => {
            previewUrls.value.push(e.target.result)
        }
        reader.readAsDataURL(file)
    }
}

const removeFile = (index) => {
    files.value = files.value.filter((_, i) => i !== index)
    previewUrls.value = previewUrls.value.filter((_, i) => i !== index)
}

const insertEmoji = (emoji) => {
    description.value += emoji
    showEmojiPicker.value = false
}

const handleSubmit = async () => {
    if (!isValid.value) return

    isLoading.value = true

    try {
        const formData = new FormData()
        formData.append('content', description.value.trim())

        files.value.forEach(file => {
            formData.append('files', file)
        })

        await postStore.createPost(formData)

        toast({
            description: 'Post created successfully'
        })

        // Reset form
        description.value = ''
        files.value = []
        previewUrls.value = []
        descriptionError.value = ''

    } catch (err) {
        toast({
            title: 'Error',
            description: err.message || 'Failed to create post',
            variant: 'destructive'
        })
    } finally {
        isLoading.value = false
    }
}
</script>

<style scoped>
.no-scrollbar {
    scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
