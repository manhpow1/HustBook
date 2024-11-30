<template>
    <div>
        <button @click="openModal"
            class="text-red-600 hover:text-red-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
            type="button">
            Delete Post
        </button>

        <teleport to="body">
            <div v-if="showConfirmation"
                class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeModal">
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full" @click.stop role="dialog"
                    aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description">
                    <h3 id="modal-title" class="text-lg font-semibold mb-4">Confirm Delete</h3>
                    <p id="modal-description" class="mb-6">Are you sure you want to delete this post? This action cannot
                        be undone.</p>
                    <div class="flex justify-end space-x-4">
                        <button @click="confirmDelete"
                            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="isDeleting" type="button">
                            <span v-if="isDeleting" class="flex items-center">
                                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                        stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                    </path>
                                </svg>
                                Deleting...
                            </span>
                            <span v-else>Delete</span>
                        </button>
                        <button @click="closeModal"
                            class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="isDeleting" type="button">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </teleport>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { usePostStore } from '../../stores/postStore'
import { useRouter } from 'vue-router'
import apiService from '../../services/api'
import { handleError } from '../../utils/errorHandler'

const props = defineProps({
    postId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: 'Confirm Delete'
    },
    message: {
        type: String,
        default: 'Are you sure you want to delete this post? This action cannot be undone.'
    },
    redirectAfterDelete: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits(['post-deleted'])

const showConfirmation = ref(false)
const isDeleting = ref(false)
const postStore = usePostStore()
const router = useRouter()

const openModal = () => {
    showConfirmation.value = true
    setTimeout(() => {
        const deleteButton = document.querySelector('button[type="button"]:not(:disabled)')
        if (deleteButton) {
            deleteButton.focus()
        }
    }, 50)
}

const closeModal = () => {
    if (!isDeleting.value) {
        showConfirmation.value = false
        document.querySelector('button:first-of-type')?.focus()
    }
}

const confirmDelete = async () => {
    isDeleting.value = true
    try {
        const response = await apiService.deletePost(props.postId)

        if (response.data.code === '1000') {
            postStore.removePost(props.postId)
            emit('post-deleted')
            closeModal()
            if (props.redirectAfterDelete) {
                router.push({ name: 'Home' })
            }
        } else {
            await handleError({ response: { data: response.data } }, router)
        }
    } catch (error) {
        await handleError(error, router)
    } finally {
        isDeleting.value = false
    }
}

const handleKeyDown = (event) => {
    if (event.key === 'Escape' && showConfirmation.value) {
        closeModal()
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
