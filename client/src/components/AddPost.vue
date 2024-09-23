<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <PencilIcon class="w-6 h-6 mr-2 text-indigo-600" />
            Create a New Post
        </h2>
        <form @submit.prevent="submitPost" class="space-y-6">
            <div>
                <label for="file-upload" class="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images or Video
                </label>
                <div class="flex items-center justify-center w-full">
                    <label for="file-upload"
                        class="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition duration-300 ease-in-out">
                        <div class="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloudIcon class="w-10 h-10 mb-3 text-gray-400" />
                            <p class="mb-2 text-sm text-gray-500">
                                <span class="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p class="text-xs text-gray-500">
                                Images or video (max 4 files, 5MB each, 10s for video)
                            </p>
                        </div>
                        <input id="file-upload" type="file" multiple accept="image/*,video/*" @change="handleFileUpload"
                            class="hidden" />
                    </label>
                </div>
                <p v-if="fileError" class="mt-2 text-sm text-red-600">
                    {{ fileError }}
                </p>
            </div>

            <div v-if="previewUrls.length > 0" class="grid grid-cols-2 gap-4">
                <div v-for="(url, index) in previewUrls" :key="index" class="relative">
                    <img v-if="isImage(url)" :src="url" alt="Preview" class="w-full h-40 object-cover rounded-lg" />
                    <video v-else :src="url" class="w-full h-40 object-cover rounded-lg" controls></video>
                    <button @click="removeFile(index)"
                        class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-300 ease-in-out">
                        <XIcon class="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea id="description" v-model="description" rows="3" :maxlength="500"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition duration-300 ease-in-out"
                    placeholder="What's on your mind?"></textarea>
                <p class="mt-2 text-sm text-gray-500">{{ description.length }}/500 characters</p>
            </div>

            <div>
                <label for="status" class="block text-sm font-medium text-gray-700 mb-2">
                    How are you feeling?
                </label>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    <button v-for="option in statusOptions" :key="option.value" type="button"
                        @click="status = option.value"
                        class="flex flex-col items-center justify-center p-3 rounded-lg border-2 transition duration-300 ease-in-out"
                        :class="status === option.value ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'">
                        <component :is="option.icon" class="w-8 h-8 mb-2" :class="option.iconColor" />
                        <span class="text-sm font-medium text-gray-700">{{ option.label }}</span>
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
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserState } from '../store/user-state'
import axios from 'axios'
import { PencilIcon, UploadCloudIcon, XIcon, LoaderIcon, CheckCircleIcon, XCircleIcon, SmileIcon, FrownIcon, ZapIcon, AngryIcon, MehIcon, HeartIcon } from 'lucide-vue-next'
import { API_ENDPOINTS } from '../config/api'

const router = useRouter()
const { token } = useUserState()

const description = ref('')
const status = ref('')
const files = ref([])
const previewUrls = ref([])
const fileError = ref('')
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_DURATION = 10 // 10 seconds

const statusOptions = [
    { value: 'happy', label: 'Happy', icon: SmileIcon, iconColor: 'text-yellow-500' },
    { value: 'sad', label: 'Sad', icon: FrownIcon, iconColor: 'text-blue-500' },
    { value: 'excited', label: 'Excited', icon: ZapIcon, iconColor: 'text-yellow-500' },
    { value: 'angry', label: 'Angry', icon: AngryIcon, iconColor: 'text-red-500' },
    { value: 'neutral', label: 'Neutral', icon: MehIcon, iconColor: 'text-gray-500' },
    { value: 'loved', label: 'Loved', icon: HeartIcon, iconColor: 'text-pink-500' },
]

const isFormValid = computed(() => {
    return files.value.length > 0 && description.value.trim() !== '' && !fileError.value
})

const handleFileUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files)

    if (uploadedFiles.length > 4) {
        fileError.value = "You can upload a maximum of 4 files"
        return
    }

    const hasImage = uploadedFiles.some((file) => file.type.startsWith("image/"))
    const hasVideo = uploadedFiles.some((file) => file.type.startsWith("video/"))

    if (hasImage && hasVideo) {
        fileError.value = "You cannot mix images and videos in the same post"
        return
    }

    if (hasVideo && uploadedFiles.length > 1) {
        fileError.value = "You can only upload one video"
        return
    }

    for (const file of uploadedFiles) {
        if (file.size > MAX_FILE_SIZE) {
            fileError.value = "File size is too big"
            return
        }

        if (file.type.startsWith("video/")) {
            const video = document.createElement("video")
            video.preload = "metadata"
            video.onloadedmetadata = () => {
                if (video.duration > MAX_VIDEO_DURATION) {
                    fileError.value = "Video duration is too long"
                }
            }
            video.src = URL.createObjectURL(file)
        }
    }

    fileError.value = ""
    files.value = uploadedFiles
    previewUrls.value = uploadedFiles.map(file => URL.createObjectURL(file))
}

const removeFile = (index) => {
    files.value.splice(index, 1)
    URL.revokeObjectURL(previewUrls.value[index])
    previewUrls.value.splice(index, 1)
}

const isImage = (url) => {
    return url.startsWith('blob:') && !url.endsWith('.mp4')
}

const submitPost = async () => {
    if (files.value.length === 0) {
        fileError.value = "Please upload at least one image or video"
        return
    }

    if (description.value.length > 500) {
        errorMessage.value = "Description cannot exceed 500 characters"
        return
    }

    isLoading.value = true
    errorMessage.value = ''
    successMessage.value = ''

    const formData = new FormData()
    formData.append("described", description.value)
    formData.append("status", status.value)
    files.value.forEach((file) => formData.append("files", file))

    try {
        const response = await axios.post(API_ENDPOINTS.ADD_POST, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token.value}`
            }
        })

        if (response.data.code === '1000') {
            successMessage.value = 'Post created successfully!'
            description.value = ''
            status.value = ''
            files.value = []
            previewUrls.value = []
        } else {
            errorMessage.value = response.data.message || 'An error occurred while creating the post'
        }
    } catch (error) {
        console.error('Error creating post:', error)
        if (error.response?.status === 401 || error.response?.data?.code === '9998') {
            errorMessage.value = 'Invalid session. Please log in again.'
            await router.push('/login')
        } else if (error.response) {
            errorMessage.value = error.response.data?.message || 'Server error'
        } else if (error.request) {
            errorMessage.value = 'Network connection error. Please check your internet connection and try again.'
        } else {
            errorMessage.value = 'An error occurred while setting up the request. Please try again.'
        }
    } finally {
        isLoading.value = false
    }
}
</script>