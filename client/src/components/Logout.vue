<template>
    <div>
        <button @click="showConfirmation = true"
            class="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-300">
            <LogOut class="w-5 h-5 mr-2" />
            Logout
        </button>

        <!-- Confirmation Dialog -->
        <div v-if="showConfirmation"
            class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
            <div class="bg-white p-5 rounded-lg shadow-xl max-w-sm w-full">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Confirm Logout</h3>
                <p class="text-sm text-gray-500 mb-4">Are you sure you want to log out?</p>
                <div class="flex justify-end space-x-3">
                    <button @click="cancelLogout"
                        class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors duration-300">
                        Cancel
                    </button>
                    <button @click="handleLogout" :disabled="isLoading"
                        class="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Loader v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                        {{ isLoading ? 'Logging out...' : 'Confirm Logout' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Toast Notification -->
        <div v-if="message" :class="[
            'fixed bottom-4 right-4 px-4 py-2 rounded-md text-white transition-all duration-500 ease-in-out',
            messageClass
        ]">
            <div class="flex items-center">
                <CheckCircle v-if="messageClass.includes('bg-green')" class="w-5 h-5 mr-2" />
                <AlertCircle v-else class="w-5 h-5 mr-2" />
                {{ message }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserState } from '../userState'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'
import { LogOut, Loader, CheckCircle, AlertCircle } from 'lucide-vue-next'

const router = useRouter()
const { logout } = useUserState()

const isLoading = ref(false)
const message = ref('')
const messageClass = ref('')
const showConfirmation = ref(false)

const handleLogout = async () => {
    isLoading.value = true
    message.value = ''
    showConfirmation.value = false

    try {
        const token = localStorage.getItem('token')
        const response = await axios.post(API_ENDPOINTS.LOGOUT, null, {
            headers: { Authorization: `Bearer ${token}` }
        })

        if (response.data.code === '1000') {
            message.value = 'Logout successful. Redirecting...'
            messageClass.value = 'bg-green-500'
            localStorage.removeItem('token')
            logout()
            await navigateToLogin()
        } else {
            throw new Error(response.data.message)
        }
    } catch (error) {
        message.value = error.response?.data?.message || 'An error occurred during logout'
        messageClass.value = 'bg-red-500'
    } finally {
        isLoading.value = false
    }
}

const navigateToLogin = () => {
    return new Promise(resolve => {
        setTimeout(() => {
            router.push('/login')
            resolve()
        }, 2000)
    })
}

const cancelLogout = () => {
    showConfirmation.value = false
}
</script>