<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <EditIcon class="w-6 h-6 mr-2 text-indigo-600" />
            Edit Post
        </h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Reuse input fields similar to AddPost, but pre-filled with existing post data -->
            <button type="submit" :disabled="isLoading" class="w-full btn-primary">
                {{ isLoading ? "Updating..." : "Update Post" }}
            </button>
        </form>
        <!-- Error and success messages -->
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EditIcon } from 'lucide-vue-next'
import { usePostStore } from '../../stores/postStore'
import apiService from '../../services/api'

const route = useRoute()
const router = useRouter()
const postStore = usePostStore()

const postId = ref(route.params.id)
const postData = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

onMounted(async () => {
    try {
        postData.value = await postStore.fetchPost(postId.value)
    } catch (error) {
        errorMessage.value = 'Failed to load post data'
    }
})

const handleSubmit = async () => {
    isLoading.value = true
    try {
        await apiService.put(`/posts/edit_post/${postId.value}`, postData.value)
        router.push({ name: 'PostDetail', params: { id: postId.value } })
    } catch (error) {
        errorMessage.value = 'Failed to update post'
    } finally {
        isLoading.value = false
    }
}
</script>