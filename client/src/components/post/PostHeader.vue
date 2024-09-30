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
                </div>
            </transition>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { MoreVerticalIcon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

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

const emit = defineEmits(['editPost', 'deletePost'])

const { t } = useI18n()
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
    if (confirm(t('confirmDeletePost'))) {
        emit('deletePost')
    }
    showAdvancedOptions.value = false
}

const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) return t('justNow')
    if (diffInSeconds < 3600) return t('minutesAgo', { minutes: Math.floor(diffInSeconds / 60) })
    if (diffInSeconds < 86400) return t('hoursAgo', { hours: Math.floor(diffInSeconds / 3600) })
    if (diffInSeconds < 604800) return t('daysAgo', { days: Math.floor(diffInSeconds / 86400) })
    if (diffInSeconds < 31536000) return t('monthsAgo', { months: Math.floor(diffInSeconds / 2592000) })
    return t('yearsAgo', { years: Math.floor(diffInSeconds / 31536000) })
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