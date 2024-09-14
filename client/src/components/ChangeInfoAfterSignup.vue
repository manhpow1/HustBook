<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800">Complete Your Profile</h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
                <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                <input v-model="username" type="text" id="username" required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    :class="{ 'border-red-500': usernameError }" />
                <p v-if="usernameError" class="mt-2 text-sm text-red-600">{{ usernameError }}</p>
            </div>
            <div>
                <label for="avatar" class="block text-sm font-medium text-gray-700">Avatar</label>
                <input type="file" id="avatar" @change="handleFileChange" accept="image/*"
                    class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            </div>
            <button type="submit" :disabled="isLoading"
                class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ isLoading ? "Updating..." : "Update Profile" }}
            </button>
        </form>
        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md">
            <p class="text-green-700">{{ successMessage }}</p>
        </div>
        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md">
            <p class="text-red-700">{{ errorMessage }}</p>
            <div v-if="errorMessage.includes('File upload failed')" class="mt-2">
                <button @click="continueWithoutAvatar" class="mr-2 bg-blue-500 text-white px-4 py-2 rounded">Continue
                    without avatar</button>
                <button @click="retryUpload" class="bg-green-500 text-white px-4 py-2 rounded">Try again</button>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, watch } from 'vue'
import axios from 'axios'
import { useUserState } from '../userState'
import { useRouter } from 'vue-router'

export default {
    setup() {
        const { token } = useUserState()
        const router = useRouter()
        const username = ref('')
        const usernameError = ref('')
        const avatar = ref(null)
        const isLoading = ref(false)
        const successMessage = ref('')
        const errorMessage = ref('')

        // Watch for changes in the token
        watch(() => token.value, (newToken) => {
            if (!newToken) {
                errorMessage.value = 'Invalid token'
            } else {
                errorMessage.value = ''
            }
        }, { immediate: true })

        const validateUsername = (value) => {
            if (value.length < 3 || value.length > 30) {
                return 'Username must be between 3 and 30 characters'
            }
            if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
                return 'Username cannot contain special characters'
            }
            if (/^\d+$/.test(value)) {
                return 'Username cannot be only numbers'
            }
            if (/^\d{3}-\d{3}-\d{4}$/.test(value)) {
                return 'Username cannot be a phone number'
            }
            if (/^\d+\s+[\w\s]+(?:avenue|street|road)$/i.test(value)) {
                return 'Username cannot be an address'
            }
            return ''
        }

        const handleFileChange = (event) => {
            const file = event.target.files[0]
            if (file && file.size > 4 * 1024 * 1024) {
                errorMessage.value = 'Avatar file size is too large. Maximum size is 4MB.'
                event.target.value = ''
            } else {
                avatar.value = file
                errorMessage.value = ''
            }
        }

        const handleSubmit = async () => {
            if (!token.value) {
                errorMessage.value = 'Invalid token'
                return
            }

            usernameError.value = validateUsername(username.value)
            if (usernameError.value) {
                errorMessage.value = usernameError.value
                return
            }

            isLoading.value = true
            errorMessage.value = ''
            successMessage.value = ''

            const formData = new FormData()
            formData.append('token', token.value)
            formData.append('username', username.value)
            if (avatar.value) {
                formData.append('avatar', avatar.value)
            }

            try {
                const response = await axios.post('http://localhost:3000/api/auth/change_info_after_signup', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                })

                if (response.data.code === '1000') {
                    if (response.data.data.is_blocked) {
                        errorMessage.value = 'Your account has been blocked'
                        router.push('/login')
                    } else {
                        successMessage.value = 'Profile updated successfully!'
                    }
                } else {
                    errorMessage.value = response.data.message
                }
            } catch (error) {
                console.error('Error updating profile:', error)
                if (error.response?.data?.code === '9998') {
                    errorMessage.value = 'Invalid token'
                    router.push('/login')
                } else if (error.response?.data?.code === '1004') {
                    errorMessage.value = 'Invalid username format'
                } else if (error.response?.data?.code === '1006') {
                    errorMessage.value = 'File upload failed. Please try again or proceed without an avatar.'
                } else {
                    errorMessage.value = error.response?.data?.message || 'An error occurred while updating your profile'
                }
            } finally {
                isLoading.value = false
            }
        }

        const continueWithoutAvatar = () => {
            avatar.value = null
            handleSubmit()
        }

        const retryUpload = () => {
            errorMessage.value = ''
            // Reset file input
            const fileInput = document.querySelector('input[type="file"]')
            if (fileInput) fileInput.value = ''
        }

        return {
            username,
            usernameError,
            isLoading,
            successMessage,
            errorMessage,
            handleFileChange,
            handleSubmit,
            continueWithoutAvatar,
            retryUpload
        }
    }
}
</script>