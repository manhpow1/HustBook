<template>
    <div>
        <button @click="showConfirmation = true" class="text-red-600 hover:text-red-800 transition-colors duration-200">
            Delete Post
        </button>

        <teleport to="body">
            <div v-if="showConfirmation"
                class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
                    <h3 class="text-lg font-semibold mb-4">Confirm Delete</h3>
                    <p class="mb-6">Are you sure you want to delete this post? This action cannot be undone.</p>
                    <div class="flex justify-end space-x-4">
                        <button @click="confirmDelete"
                            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
                            :disabled="isDeleting">
                            {{ isDeleting ? 'Deleting...' : 'Delete' }}
                        </button>
                        <button @click="showConfirmation = false"
                            class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors duration-200">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </teleport>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePostStore } from '../../stores/postStore'
import { useRouter } from 'vue-router'
import apiService from '../../services/api'

const props = defineProps({
    postId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['post-deleted'])

const showConfirmation = ref(false)
const isDeleting = ref(false)
const postStore = usePostStore()
const router = useRouter()

const confirmDelete = async () => {
    isDeleting.value = true;
    try {
        await apiService.deletePost(props.postId);
        postStore.removePost(props.postId);
        emit('post-deleted');
        router.push({ name: 'Home' });
    } catch (error) {
        console.error('Error deleting post:', error);
        // Display appropriate error message based on error code
    } finally {
        isDeleting.value = false;
    }
};
</script>