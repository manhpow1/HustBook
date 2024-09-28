<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <UserPlusIcon class="w-6 h-6 mr-2 text-indigo-600" />
            Complete Your Profile
        </h2>
        <form @submit.prevent="handleSubmit" class="space-y-6">
            <div>
                <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                <div class="mt-1 relative rounded-md shadow-sm">
                    <input v-model="username" type="text" id="username" name="username" autocomplete="username" required
                        :class="[
                            'block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm',
                            { 'border-red-300': usernameError }
                        ]" placeholder="Enter your username" />
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <CheckCircleIcon v-if="!usernameError && username" class="h-5 w-5 text-green-500" />
                        <XCircleIcon v-if="usernameError" class="h-5 w-5 text-red-500" />
                    </div>
                </div>
                <p v-if="usernameError" class="mt-2 text-sm text-red-600">{{ usernameError }}</p>
            </div>

            <div>
                <label for="avatar-upload" class="block text-sm font-medium text-gray-700">Avatar</label>
                <div class="mt-1 flex items-center space-x-4">
                    <div v-if="avatarPreview" class="flex-shrink-0">
                        <img :src="avatarPreview" alt="Avatar preview" class="h-16 w-16 rounded-full object-cover" />
                    </div>
                    <label for="avatar-upload"
                        class="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <span>{{ avatar ? 'Change' : 'Upload' }}</span>
                        <input id="avatar-upload" name="avatar-upload" type="file" @change="handleFileChange"
                            accept="image/*" class="sr-only" />
                    </label>
                    <button v-if="avatar" type="button" @click="removeAvatar"
                        class="text-sm text-red-600 hover:text-red-500">
                        Remove
                    </button>
                </div>
                <p v-if="avatarError" class="mt-2 text-sm text-red-600">{{ avatarError }}</p>
            </div>

            <button type="submit" :disabled="isLoading || !!usernameError"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                {{ isLoading ? "Updating..." : "Update Profile" }}
            </button>
        </form>

        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md flex items-start">
            <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
            <p class="text-green-700">{{ successMessage }}</p>
        </div>

        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md flex items-start">
            <XCircleIcon class="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
                <p class="text-red-700">{{ errorMessage }}</p>
                <div v-if="errorMessage.includes('File upload failed')" class="mt-2 flex space-x-2">
                    <button @click="continueWithoutAvatar" class="bg-blue-500 text-white px-4 py-2 rounded text-sm">
                        Continue without avatar
                    </button>
                    <button @click="retryUpload" class="bg-green-500 text-white px-4 py-2 rounded text-sm">
                        Try again
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserState } from '../../store/user-state'
import { API_ENDPOINTS } from '../../config/api'
import { UserPlusIcon, CheckCircleIcon, XCircleIcon, LoaderIcon } from 'lucide-vue-next'
import apiService from '../../services/api'

const router = useRouter()
const { token } = useUserState()

const username = ref('')
const usernameError = ref('')
const avatar = ref(null)
const avatarPreview = ref('')
const avatarError = ref('')
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const checkToken = (tokenValue) => {
    if (!tokenValue) {
        errorMessage.value = 'Invalid token'
        router.push({ name: 'Login' })
    } else {
        errorMessage.value = ''
    }
}

defineExpose({ checkToken })

onMounted(() => {
    checkToken(token.value)
})

watch(() => token.value, (newToken) => {
    checkToken(newToken)
})

const validateUsername = (value) => {
    if (!value.trim()) {
        return 'Username cannot be empty'
    }
    if (value.length < 3 || value.length > 30) {
        return 'Username must be between 3 and 30 characters'
    }
    if (/^\d+$/.test(value)) {
        return 'Username cannot be only numbers'
    }
    // Phone number check (supports various formats)
    if (/^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(value)) {
        return 'Username cannot be a phone number'
    }
    // Address check (basic format)
    if (/^\d+\s+[\w\s]+(?:avenue|ave|street|st|road|rd|boulevard|blvd)\.?$/i.test(value)) {
        return 'Username cannot be an address'
    }
    // Move the special character check to the end
    if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        return 'Username cannot contain special characters'
    }
    return ''
}

const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
        if (file.size > 4 * 1024 * 1024) {
            avatarError.value = 'Avatar file size is too large. Maximum size is 4MB.'
            event.target.value = ''
        } else {
            avatar.value = file
            avatarError.value = ''
            const reader = new FileReader()
            reader.onload = (e) => {
                avatarPreview.value = e.target.result
            }
            reader.readAsDataURL(file)
        }
    }
}

const removeAvatar = () => {
    avatar.value = null
    avatarPreview.value = ''
    avatarError.value = ''
    const fileInput = document.getElementById('avatar-upload')
    if (fileInput) fileInput.value = ''
}

const handleSubmit = async () => {
    if (!token.value) {
        errorMessage.value = 'Invalid token'
        return
    }

    usernameError.value = validateUsername(username.value)
    if (usernameError.value) {
        return
    }

    isLoading.value = true
    errorMessage.value = ''
    successMessage.value = ''

    const formData = new FormData()
    formData.append('username', username.value)
    if (avatar.value) {
        formData.append('avatar', avatar.value)
    }

    try {
        const formData = new FormData();
        formData.append('token', token.value);
        formData.append('username', username.value);
        if (avatar.value) {
            formData.append('avatar', avatar.value);
        }

        const response = await apiService.post(API_ENDPOINTS.CHANGE_INFO_AFTER_SIGNUP, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        })

        if (response.data.code === '1000') {
            if (response.data.data.is_blocked) {
                errorMessage.value = 'Your account has been blocked';
                router.push({ name: 'Login' });
            } else {
                successMessage.value = 'Profile updated successfully!';
                setTimeout(() => {
                    router.push({ name: 'Home' });
                }, 2000);
            }
        } else {
            errorMessage.value = response.data.message;
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        if (error.response?.data?.code === '9998') {
            errorMessage.value = 'Invalid token';
            router.push({ name: 'Login' });
        } else if (error.response?.data?.code === '1004') {
            errorMessage.value = 'Invalid username format';
        } else if (error.response?.data?.code === '1006') {
            errorMessage.value = 'File upload failed. Please try again or proceed without an avatar.';
        } else if (error.request) {
            errorMessage.value = 'Network error. Please check your internet connection and try again.';
        } else {
            errorMessage.value = error.response?.data?.message || 'An error occurred while updating your profile';
        }
    } finally {
        isLoading.value = false;
    }
};

const continueWithoutAvatar = () => {
    removeAvatar()
    handleSubmit()
}

const retryUpload = () => {
    errorMessage.value = ''
    const fileInput = document.getElementById('avatar-upload')
    if (fileInput) fileInput.value = ''
}

watch(username, (newValue) => {
    usernameError.value = validateUsername(newValue)
})
</script>