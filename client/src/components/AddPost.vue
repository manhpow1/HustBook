<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <PencilIcon class="w-6 h-6 mr-2 text-indigo-600" />
            Create a New Post
        </h2>
        <form @submit.prevent="submitPost" class="space-y-6">
            <div>
                <label for="file-upload" class="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images (Max 4)
                </label>
                <div class="image-grid" :class="[`grid-${previewUrls.length}`]">
                    <div v-for="(preview, index) in previewUrls" :key="index" class="image-container">
                        <img :src="preview" alt="Preview" class="preview-image" />
                        <button @click="removeFile(index)" type="button" class="remove-button"
                            aria-label="Remove image">
                            <XIcon class="w-4 h-4" />
                        </button>
                    </div>
                    <label v-if="previewUrls.length < 4" for="file-upload" class="upload-label">
                        <div class="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloudIcon class="w-10 h-10 mb-3 text-gray-400" />
                            <p class="text-xs text-gray-500">Click to add image</p>
                        </div>
                    </label>
                </div>
                <input id="file-upload" type="file" accept="image/*" @change="handleFileUpload" class="hidden" />
                <p v-if="fileError" class="mt-2 text-sm text-red-600">
                    {{ fileError }}
                </p>
            </div>

            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea id="description" v-model="description" rows="3" :maxlength="500"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition duration-300 ease-in-out"
                    placeholder="What's on your mind?" @input="handleDescriptionInput"></textarea>
                <p class="mt-2 text-sm text-gray-500">{{ description.length }}/500 characters</p>
                <div v-html="highlightedDescription" class="mt-2 text-sm text-gray-700"></div>
            </div>

            <div>
                <label for="status-select" class="block text-sm font-medium text-gray-700 mb-2">
                    How are you feeling?
                </label>
                <select id="status-select" v-model="status"
                    class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option value="">Select a status</option>
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
            </div>

            <div>
                <button type="button" @click="showEmojiPicker = !showEmojiPicker"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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

            <button type="submit" :disabled="isLoading || !isFormValid"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 ease-in-out">
                <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                {{ isLoading ? "Posting..." : "Create Post" }}
            </button>
        </form>

        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md flex items-start">
            <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
            <p class="text-green-700">{{ successMessage }}</p>
        </div>

        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md flex items-start">
            <XCircleIcon class="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            <p class="text-red-700">{{ errorMessage }}</p>
        </div>

        <transition name="fade">
            <div v-if="showUploadProgress" class="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-md">
                <p class="text-sm font-medium text-gray-700 mb-2">Uploading post...</p>
                <div class="w-48 h-2 bg-gray-200 rounded-full">
                    <div class="h-full bg-indigo-600 rounded-full" :style="{ width: `${uploadProgress}%` }"></div>
                </div>
            </div>
        </transition>

        <UnsavedChangesModal :model-value="showUnsavedChangesModal"
            @update:model-value="showUnsavedChangesModal = $event" @save="saveChanges" @discard="discardChanges"
            @cancel="cancelNavigation" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, defineExpose } from 'vue'
import { useRouter } from 'vue-router'
import ErrorBoundary from './ErrorBoundary.vue'
import UnsavedChangesModal from './UnsavedChangesModal.vue'
import { useUserState } from '../store/user-state'
import { PencilIcon, UploadCloudIcon, XIcon, LoaderIcon, CheckCircleIcon, XCircleIcon, SmileIcon } from 'lucide-vue-next'
import { API_ENDPOINTS } from '../config/api'
import apiService from '../services/api'
import { logError, logInfo, logWarning } from '../services/logging'

const router = useRouter()
const showUnsavedChangesModal = ref(false)
const pendingNavigation = ref(null)
const { token } = useUserState()

const description = ref('')
const status = ref('')
const files = ref([])
const previewUrls = ref([])
const fileError = ref('')
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const showEmojiPicker = ref(false)
const showUploadProgress = ref(false)
const uploadProgress = ref(0)

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

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
    return description.value.trim() !== '' || files.value.length > 0 || status.value !== ''
})

const highlightedDescription = computed(() => {
    return detectLinks(description.value)
})

const handleError = (error) => {
    console.error('Error:', error)
    if (error.response?.status === 401 || error.response?.data?.code === '9998') {
        errorMessage.value = 'Invalid session. Please log in again.'
        router.push('/login')
    } else if (error.response) {
        errorMessage.value = error.response.data?.message || 'Server error'
    } else if (error.request) {
        errorMessage.value = 'Network connection error. Please check your internet connection and try again.'
    } else {
        errorMessage.value = 'An error occurred while setting up the request. Please try again.'
    }
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
        pendingNavigation.value = { to, from, next }
    } else {
        next()
    }
}

const saveChanges = async () => {
    await submitPost()
    if (!errorMessage.value) {
        showUnsavedChangesModal.value = false
        pendingNavigation.value.next()
    }
}

const discardChanges = () => {
    description.value = ''
    status.value = ''
    files.value = []
    previewUrls.value = []
    showUnsavedChangesModal.value = false
    localStorage.removeItem('postDraft')
    pendingNavigation.value.next()
}

const cancelNavigation = () => {
    showUnsavedChangesModal.value = false
    pendingNavigation.value.next(false)
}

const handleFileUpload = (event) => {
    try {
        const uploadedFile = event.target.files[0]

        if (!uploadedFile) {
            logInfo('No file selected')
            return
        }

        if (previewUrls.value.length >= 4) {
            fileError.value = "You can upload a maximum of 4 images"
            logWarning('Max image limit reached', { currentCount: previewUrls.value.length })
            return
        }

        if (uploadedFile.size > MAX_FILE_SIZE) {
            fileError.value = "File size is too big (max 5MB for images, 10MB for videos)"
            logWarning('File size too large', { size: uploadedFile.size, maxSize: MAX_FILE_SIZE })
            return
        }

        if (!uploadedFile.type.startsWith("image/") && !uploadedFile.type.startsWith("video/")) {
            fileError.value = "Only image and video files are allowed"
            logWarning('Invalid file type', { type: uploadedFile.type })
            return
        }

        if (uploadedFile.type.startsWith("video/")) {
            if (uploadedFile.size > 10 * 1024 * 1024) {
                fileError.value = "File size is too big (max 10MB for videos)"
                logWarning('Video file size too large', { size: uploadedFile.size, maxSize: 10 * 1024 * 1024 })
                return
            }

            const video = document.createElement("video")
            video.preload = "metadata"
            video.onloadedmetadata = () => {
                if (video.duration > 10) {
                    fileError.value = "Video duration is too long (max 10 seconds)"
                    logWarning('Video duration too long', { duration: video.duration })
                } else {
                    processFile(uploadedFile)
                }
                URL.revokeObjectURL(video.src)
            }
            video.onerror = () => {
                fileError.value = "Error processing video file"
                logError('Error processing video file', { fileName: uploadedFile.name })
                URL.revokeObjectURL(video.src)
            }
            video.src = URL.createObjectURL(uploadedFile)
        } else if (uploadedFile.type.startsWith("image/")) {
            processFile(uploadedFile)
        }

        fileError.value = ""
        logInfo('File upload initiated', { fileName: uploadedFile.name, fileType: uploadedFile.type, fileSize: uploadedFile.size })
    } catch (error) {
        logError('Error in handleFileUpload', error)
        errorMessage.value = 'An error occurred while processing the file. Please try again.'
    }
}

const processFile = (file) => {
    files.value.push(file)
    const reader = new FileReader()
    reader.onload = (e) => {
        previewUrls.value.push(e.target.result)
        logInfo('File processed successfully', { fileName: file.name })
    }
    reader.onerror = (e) => {
        logError('Error reading file', { fileName: file.name, error: e.target.error })
        errorMessage.value = 'Error reading file. Please try again.'
    }
    reader.readAsDataURL(file)
}

const removeFile = (index) => {
    files.value.splice(index, 1)
    previewUrls.value.splice(index, 1)
}

const handleDescriptionInput = () => {
    saveDraft()
}

const insertEmoji = (emoji) => {
    description.value += emoji
    saveDraft()
}

const detectLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
}

const convertEmoticonsToText = (text) => {
    const emoticonMap = {
        ':)': 'smile',
        ':(': 'frown',
        ':D': 'grin',
        ':P': 'tongue',
        ';)': 'wink',
        // Add more emoticons as needed
    }

    return text.replace(/:\)|:$$|:D|:P|;$$/g, (match) => `[${emoticonMap[match]}]`)
}

const saveDraft = () => {
    localStorage.setItem('postDraft', JSON.stringify({
        description: description.value,
        status: status.value,
        files: previewUrls.value
    }))
}

const loadDraft = () => {
    const draft = JSON.parse(localStorage.getItem('postDraft'))
    if (draft) {
        description.value = draft.description
        status.value = draft.status
        previewUrls.value = draft.files
    }
}

const submitPost = async () => {
    if (files.value.length === 0 && description.value.trim() === '') {
        errorMessage.value = "Please add an image or write a description"
        logWarning('Attempted to submit empty post')
        return
    }

    if (description.value.length > 500) {
        errorMessage.value = "Description cannot exceed 500 characters"
        logWarning('Description too long', { length: description.value.length })
        return
    }

    isLoading.value = true
    errorMessage.value = ''
    successMessage.value = ''
    showUploadProgress.value = true

    const formData = new FormData()
    formData.append("described", convertEmoticonsToText(description.value))
    formData.append("status", status.value)
    files.value.forEach((file) => formData.append("files", file))

    try {
        const response = await apiService.upload(API_ENDPOINTS.ADD_POST, formData, (progress) => {
            uploadProgress.value = progress
        })

        if (response.data.code === '1000') {
            successMessage.value = 'Post created successfully!'
            logInfo('Post created successfully', { postId: response.data.data.id })
            description.value = ''
            status.value = ''
            files.value = []
            previewUrls.value = []
            localStorage.removeItem('postDraft')
            router.push('/') // Navigate to home page after successful post
        } else {
            errorMessage.value = response.data.message || 'An error occurred while creating the post'
            logWarning('Failed to create post', { responseCode: response.data.code, message: response.data.message })
        }
    } catch (error) {
        logError('Error in submitPost', error)
        handleError(error)
    } finally {
        isLoading.value = false
        showUploadProgress.value = false
        uploadProgress.value = 0
    }
}

// Expose the handleRouteChange function to make it accessible to the router
defineExpose({ handleRouteChange })

onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    loadDraft()
})

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    // We don't need to manually remove the navigation guard anymore
})

watch([description, status, files], () => {
    saveDraft()
}, { deep: true })
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
    opacity: 0;
}

.image-grid {
    display: grid;
    gap: 4px;
    margin-bottom: 1rem;
}

.grid-1 {
    grid-template-columns: 1fr;
}

.grid-2 {
    grid-template-columns: 1fr 1fr;
}

.grid-3 {
    grid-template-columns: 1fr 1fr 1fr;
}

.grid-4 {
    grid-template-columns: 1fr 1fr 1fr 1fr;
}

.image-container {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border: 2px solid white;
}

.preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.remove-button {
    position: absolute;
    top: 4px;
    right: 4px;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    border-radius: 50%;
    padding: 4px;
}

.upload-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    cursor: pointer;
    background-color: #f3f4f6;
    transition: background-color 0.3s ease;
}

.upload-label:hover {
    background-color: #e5e7eb;
}
</style>