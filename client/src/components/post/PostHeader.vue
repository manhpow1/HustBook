<template>
    <div class="flex items-center mb-4">
        <img :src="post.author?.avatar || defaultAvatar" :alt="post.author?.name || 'Unknown'"
            class="w-12 h-12 rounded-full mr-4">
        <div>
            <h2 class="font-bold text-lg">{{ post.author?.name || 'Unknown' }}</h2>
            <p class="text-sm text-gray-500">{{ formatDate(post.created) }}</p>
        </div>
        <div v-if="isOwnPost" class="ml-auto relative">
            <button @click="toggleAdvancedOptions" class="text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Advanced options">
                <MoreVerticalIcon class="w-5 h-5" />
            </button>
            <transition name="fade">
                <div v-if="showAdvancedOptions"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1 text-sm">
                    <button @click="editPost" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left">
                        Edit Post
                    </button>
                    <button @click="deletePost" class="block px-4 py-2 text-red-600 hover:bg-gray-100 w-full text-left">
                        Delete Post
                    </button>
                    <button @click="reportPost"
                        class="block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left">
                        Report Post
                    </button>
                    <button @click="sharePost" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left">
                        Share Post
                    </button>
                </div>
            </transition>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { MoreVerticalIcon } from 'lucide-vue-next'
import { usePostStore } from '../../stores/postStore'
import { formatDate } from '../../utils/helpers';

const props = defineProps({
    post: {
        type: Object,
        required: true
    },
    isOwnPost: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['editPost', 'deletePost', 'reportPost', 'sharePost'])

const showAdvancedOptions = ref(false)

const defaultAvatar = '/path/to/default/avatar.jpg'

const toggleAdvancedOptions = () => {
    showAdvancedOptions.value = !showAdvancedOptions.value
}

const editPost = () => {
    emit('editPost')
    showAdvancedOptions.value = false
}

const deletePost = () => {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        emit('deletePost')
    }
    showAdvancedOptions.value = false
}

const reportPost = () => {
    emit('reportPost')
    showAdvancedOptions.value = false
}

const sharePost = () => {
    emit('sharePost')
    showAdvancedOptions.value = false
}
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