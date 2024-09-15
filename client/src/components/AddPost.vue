<template>
    <div class="add-post-container">
        <h2 class="text-2xl font-bold mb-4">Create a New Post</h2>
        <form @submit.prevent="submitPost" class="space-y-4">
            <div>
                <label for="file-upload" class="block text-sm font-medium text-gray-700">
                    Upload Images or Video
                </label>
                <input type="file" id="file-upload" @change="handleFileUpload" multiple accept="image/*,video/*"
                    class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <p v-if="fileError" class="mt-2 text-sm text-red-600">
                    {{ fileError }}
                </p>
            </div>

            <div>
                <label for="description" class="block text-sm font-medium text-gray-700">
                    Description
                </label>
                <textarea id="description" v-model="description" rows="3"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"></textarea>
            </div>

            <div>
                <label for="status" class="block text-sm font-medium text-gray-700">
                    Emotional Status
                </label>
                <select id="status" v-model="status"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                    <option value="">Select a status</option>
                    <option value="happy">Happy</option>
                    <option value="sad">Sad</option>
                    <option value="excited">Excited</option>
                    <option value="angry">Angry</option>
                </select>
            </div>

            <button type="submit" :disabled="isLoading"
                class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {{ isLoading ? "Posting..." : "Create Post" }}
            </button>
        </form>

        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md">
            <p class="text-green-700">{{ successMessage }}</p>
        </div>

        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md">
            <p class="text-red-700">{{ errorMessage }}</p>
        </div>
    </div>
</template>

<script>
import { ref } from 'vue'
import axios from 'axios'
import { useUserState } from '../userState'
import { useRouter } from 'vue-router'

export default {
    name: 'AddPost',
    setup() {
        const { token } = useUserState()
        const router = useRouter()
        const description = ref('')
        const status = ref('')
        const files = ref([])
        const fileError = ref('')
        const isLoading = ref(false)
        const successMessage = ref('')
        const errorMessage = ref('')

        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        const MAX_VIDEO_DURATION = 10; // 10 seconds

        const handleFileUpload = (event) => {
            const uploadedFiles = Array.from(event.target.files);

            if (uploadedFiles.length > 4) {
                fileError.value = "You can upload a maximum of 4 files";
                return;
            }

            const hasImage = uploadedFiles.some((file) =>
                file.type.startsWith("image/")
            );
            const hasVideo = uploadedFiles.some((file) =>
                file.type.startsWith("video/")
            );

            if (hasImage && hasVideo) {
                fileError.value = "You cannot mix images and videos in the same post";
                return;
            }

            if (hasVideo && uploadedFiles.length > 1) {
                fileError.value = "You can only upload one video";
                return;
            }

            for (const file of uploadedFiles) {
                if (file.size > MAX_FILE_SIZE) {
                    fileError.value = "File size is too big";
                    return;
                }

                if (file.type.startsWith("video/")) {
                    const video = document.createElement("video");
                    video.preload = "metadata";
                    video.onloadedmetadata = () => {
                        if (video.duration > MAX_VIDEO_DURATION) {
                            fileError.value = "Video duration is too long";
                        }
                    };
                    video.src = URL.createObjectURL(file);
                }
            }

            fileError.value = "";
            files.value = uploadedFiles;
        };

        const submitPost = async () => {
            if (files.value.length === 0) {
                fileError.value = "Please upload at least one image or video";
                return;
            }

            if (description.value.length > 500) {
                errorMessage.value = "Description cannot exceed 500 characters";
                return;
            }

            isLoading.value = true
            errorMessage.value = ''
            successMessage.value = ''

            const formData = new FormData();
            formData.append("described", description.value);
            formData.append("status", status.value);
            files.value.forEach((file) => formData.append("files", file));

            try {
                console.log('Attempting to post...')
                const response = await axios.post('http://localhost:3000/api/posts/add_post', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token.value}`
                    }
                })

                console.log('Response received:', response)

                if (response.data.code === '1000') {
                    successMessage.value = 'Post created successfully!'
                    description.value = ''
                    status.value = ''
                    files.value = []
                } else {
                    errorMessage.value = response.data.message || 'An error occurred while creating the post'
                }
            } catch (error) {
                console.error('Error caught:', error)

                if (error.response) {
                    console.log('Error response:', error.response)
                    if (error.response.status === 401 || error.response.data?.code === '9998') {
                        errorMessage.value = 'Invalid session. Please log in again.'
                        await router.push('/login')
                    } else {
                        errorMessage.value = error.response.data?.message || 'Server error'
                    }
                } else if (error.request) {
                    console.log('Error request:', error.request)
                    errorMessage.value = 'Network connection error. Please check your internet connection and try again.'
                } else {
                    console.log('Error message:', error.message)
                    errorMessage.value = 'An error occurred while setting up the request. Please try again.'
                }
            } finally {
                isLoading.value = false
                console.log('Final error message:', errorMessage.value)
            }
        };

        return {
            description,
            status,
            fileError,
            isLoading,
            successMessage,
            errorMessage,
            handleFileUpload,
            submitPost,
        };
    },
};
</script>

<style scoped>
.add-post-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
}
</style>
