<template>
    <button @click="toggleSave"
        class="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200">
        <BookmarkIcon :class="{ 'fill-current text-blue-500': isSaved }" class="w-5 h-5" />
        <span>{{ isSaved ? 'Saved' : 'Save' }}</span>
    </button>
</template>

<script setup>
import { ref } from 'vue'
import { BookmarkIcon } from 'lucide-vue-next'
import { useUserState } from '../../stores/userState'
import axios from 'axios'

const props = defineProps({
    postId: {
        type: String,
        required: true
    },
    initialSavedState: {
        type: Boolean,
        default: false
    }
})

const { token } = useUserState()
const isSaved = ref(props.initialSavedState)

const toggleSave = async () => {
    try {
        const response = await axios.post(
            'http://localhost:3000/api/posts/save_post',
            { id: props.postId },
            { headers: { Authorization: `Bearer ${token.value}` } }
        )

        if (response.data.code === '1000') {
            isSaved.value = !isSaved.value
        } else {
            console.error('Error saving post:', response.data.message)
        }
    } catch (error) {
        console.error('Error saving post:', error)
    }
}
</script>