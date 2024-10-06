<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <EditIcon class="w-6 h-6 mr-2 text-primary" />
            Edit Post
        </h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <FileUpload v-model:files="files" @error="fileError = $event" :initialFiles="initialFiles" />

            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea id="description" v-model="description" rows="3" :maxlength="500"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 transition duration-300 ease-in-out"
                    placeholder="What's on your mind?" @input="handleDescriptionInput"></textarea>
                <p class="mt-2 text-sm text-gray-500">{{ description.length }}/500 characters</p>
                <div v-html="highlightedDescription" class="mt-2 text-sm text-gray-700"></div>
            </div>

            <div>
                <label for="status-select" class="block text-sm font-medium text-gray-700 mb-2">
                    How are you feeling?
                </label>
                <select id="status-select" v-model="status"
                    class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
                    <option value="">Select a status</option>
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
            </div>

            <div>
                <button type="button" @click="showEmojiPicker = !showEmojiPicker"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    aria-label="Toggle emoji picker">
                    <SmileIcon class="w-5 h-5 mr-2" />
                    Add Emoji
                </button>
                <div v-if="showEmojiPicker" class="mt-2">
                    <button v-for="emoji in emojis" :key="emoji" @click="insertEmoji(emoji)"
                        class="inline-flex items-center justify-center w-8 h-8 m-1 text-lg hover:bg-gray-200 rounded"
                        :aria-label="`Insert ${emoji} emoji`">
                        {{ emoji }}
                    </button>
                </div>
            </div>

            <div class="flex justify-between">
                <Button type="button" variant="outline" @click="cancelEdit">
                    Cancel
                </Button>
                <Button type="submit" :disabled="isLoading || !isFormValid">
                    {{ isLoading ? "Updating..." : "Update Post" }}
                </Button>
            </div>
        </form>

        <AlertDialog v-model:open="showUnsavedChangesModal">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes. Are you sure you want to leave this page?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="cancelNavigation">Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="discardChanges">Discard Changes</AlertDialogAction>
                    <AlertDialogAction @click="saveChanges">Save Changes</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Alert v-if="successMessage" variant="success" class="mt-4">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{{ successMessage }}</AlertDescription>
        </Alert>

        <Alert v-if="errorMessage" variant="destructive" class="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
        </Alert>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EditIcon, SmileIcon } from 'lucide-vue-next'
import { usePostStore } from '../../stores/postStore'
import apiService from '../../services/api'
import logger from '../../services/logging'
import FileUpload from '../shared/FileUpload.vue'
import { Button } from '../ui/Button.vue'
import {
    Alert,
    AlertTitle,
    AlertDescription,
} from '../ui/alert'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog'

const route = useRoute()
const router = useRouter()
const postStore = usePostStore()

const postId = ref(route.params.id)
const description = ref('')
const status = ref('')
const files = ref([])
const initialFiles = ref([])
const fileError = ref('')
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const showEmojiPicker = ref(false)
const showUnsavedChangesModal = ref(false)

const statusOptions = [
    { value: 'happy', label: 'Happy' },
    { value: 'sad', label: 'Sad' },
    { value: 'excited', label: 'Excited' },
    { value: 'angry', label: 'Angry' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'loved', label: 'Loved' },
]

const emojis = ['😀', '😂', '😍', '🥳', '😎', '🤔', '😊', '👍', '❤️', '🎉']

const isFormValid = computed(() => {
    return (files.value.length > 0 || description.value.trim() !== '') && !fileError.value
})

const hasUnsavedChanges = computed(() => {
    return description.value !== initialDescription.value ||
        status.value !== initialStatus.value ||
        JSON.stringify(files.value) !== JSON.stringify(initialFiles.value)
})

const highlightedDescription = computed(() => {
    return detectLinks(description.value)
})

const initialDescription = ref('')
const initialStatus = ref('')

onMounted(async () => {
    try {
        const postData = await postStore.fetchPost(postId.value)
        description.value = convertTextToEmoticons(postData.described)
        initialDescription.value = description.value
        status.value = postData.status
        initialStatus.value = status.value
        initialFiles.value = postData.media.map(url => ({ url }))
        files.value = [...initialFiles.value]
    } catch (error) {
        logger.error('Failed to load post data', error)
        errorMessage.value = 'Failed to load post data'
    }
})

const handleSubmit = async () => {
    isLoading.value = true
    errorMessage.value = ''
    successMessage.value = ''

    try {
        const updatedPostData = {
            described: convertEmoticonsToText(description.value),
            status: status.value,
            files: files.value.filter(file => file instanceof File)
        }

        const response = await apiService.put(`/posts/edit_post/${postId.value}`, updatedPostData)

        if (response.code === '1000') {
            successMessage.value = 'Post updated successfully!'
            logger.info('Post updated successfully', { postId: postId.value })
            router.push({ name: 'PostDetail', params: { id: postId.value } })
        } else {
            errorMessage.value = response.message || 'An error occurred while updating the post'
            logger.warn('Failed to update post', { responseCode: response.code, message: response.message })
        }
    } catch (error) {
        logger.error('Error in handleSubmit', error)
        errorMessage.value = 'Failed to update post'
    } finally {
        isLoading.value = false
    }
}

const cancelEdit = () => {
    if (hasUnsavedChanges.value) {
        showUnsavedChangesModal.value = true
    } else {
        router.back()
    }
}

const handleDescriptionInput = () => {
    // Update UI or perform any necessary actions when description changes
}

const insertEmoji = (emoji) => {
    description.value += emoji
}

const detectLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(urlRegex, (url) => `<span class="text-primary">${url}</span>`)
}

const convertEmoticonsToText = (text) => {
    const emoticonMap = {
        ':)': '[smile]',
        ':(': '[frown]',
        ':D': '[grin]',
        ':P': '[tongue]',
        ';)': '[wink]',
        // Add more emoticons as needed
    }

    return text.replace(/:\)|:$$|:D|:P|;$$/g, (match) => emoticonMap[match] || match)
}

const convertTextToEmoticons = (text) => {
    const textToEmoticonMap = {
        '[smile]': ':)',
        '[frown]': ':(',
        '[grin]': ':D',
        '[tongue]': ':P',
        '[wink]': ';)',
        // Add more mappings as needed
    }

    return text.replace(/\[(\w+)\]/g, (_, emotion) => textToEmoticonMap[`[${emotion}]`] || `[${emotion}]`)
}

const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges.value) {
        e.preventDefault()
        e.returnValue = ''
    }
}

const handleRouteChange = (to, from, next) => {
    if (hasUnsavedChanges.value) {
        showUnsavedChangesModal.value = true
        next(false)
    } else {
        next()
    }
}

const saveChanges = async () => {
    await handleSubmit()
    showUnsavedChangesModal.value = false
}

const discardChanges = () => {
    description.value = initialDescription.value
    status.value = initialStatus.value
    files.value = [...initialFiles.value]
    showUnsavedChangesModal.value = false
    router.back()
}

const cancelNavigation = () => {
    showUnsavedChangesModal.value = false
}

onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    router.beforeEach(handleRouteChange)
})

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
})

watch([description, status, files], () => {
    // Perform any necessary actions when form data changes
}, { deep: true })
</script>