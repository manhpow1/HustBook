<template>
    <div>
        <button @click="showConfirmation = true"
            class="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-300">
            <LogOutIcon class="w-5 h-5 mr-2" />
            <slot>Logout</slot>
        </button>

        <!-- Confirmation Dialog -->
        <TransitionRoot appear :show="showConfirmation" as="template">
            <Dialog as="div" @close="cancelLogout" class="relative z-10">
                <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0"
                    enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                    <div class="fixed inset-0 bg-black bg-opacity-25" />
                </TransitionChild>

                <div class="fixed inset-0 overflow-y-auto">
                    <div class="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                            enter-to="opacity-100 scale-100" leave="duration-200 ease-in"
                            leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
                            <DialogPanel
                                class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                                    Confirm Logout
                                </DialogTitle>
                                <div class="mt-2">
                                    <p class="text-sm text-gray-500">
                                        Are you sure you want to log out? You will be redirected to the login page.
                                    </p>
                                </div>

                                <div class="mt-4 flex justify-end space-x-3">
                                    <button type="button"
                                        class="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                        @click="cancelLogout">
                                        Cancel
                                    </button>
                                    <button type="button"
                                        class="inline-flex justify-center rounded-md border border-transparent bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                        @click="handleLogout" :disabled="isLoading">
                                        <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5" />
                                        {{ isLoading ? 'Logging out...' : 'Confirm Logout' }}
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </TransitionRoot>

        <!-- Toast Notification -->
        <TransitionRoot appear :show="!!message" as="template">
            <div :class="[
                'fixed bottom-4 right-4 px-4 py-2 rounded-md text-white transition-all duration-500 ease-in-out',
                messageClass
            ]">
                <div class="flex items-center">
                    <CheckCircleIcon v-if="messageClass.includes('bg-green')" class="w-5 h-5 mr-2" />
                    <AlertCircleIcon v-else class="w-5 h-5 mr-2" />
                    {{ message }}
                </div>
            </div>
        </TransitionRoot>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUserState } from '../../store/user-state'
import { API_ENDPOINTS } from '../../config/api'
import { LogOutIcon, LoaderIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-vue-next'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import api from '../../services/api'

const props = defineProps({
    onLogoutSuccess: {
        type: Function,
        default: () => { }
    }
})

const emit = defineEmits(['logout-success', 'logout-error'])

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
        const response = await api.post(API_ENDPOINTS.LOGOUT)

        if (response.data.code === '1000') {
            message.value = 'Logout successful.'
            messageClass.value = 'bg-green-500'
            localStorage.removeItem('token')
            logout()
            emit('logout-success')
            props.onLogoutSuccess()
        } else {
            throw new Error(response.data.message || 'Logout failed')
        }
    } catch (error) {
        console.error('Logout error:', error)
        message.value = error.response?.data?.message || 'An error occurred during logout'
        messageClass.value = 'bg-red-500'
        emit('logout-error', error)
    } finally {
        isLoading.value = false
    }
}

const cancelLogout = () => {
    showConfirmation.value = false
}
</script>