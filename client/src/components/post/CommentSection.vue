<template>
    <div>
        <div class="mb-4">
            <MarkdownEditor v-model="newComment" :rows="3" ref="commentInput" :placeholder="$t('writeComment')" />
            <button @click="addComment"
                class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!newComment.trim()" :aria-label="t('postComment')">
                {{ t('comment') }}
            </button>
        </div>

        <div v-if="comments.length > 0" class="mt-6">
            <h3 class="text-lg font-semibold mb-4">{{ t('comments') }}</h3>
            <TransitionGroup name="comment-list" tag="div">
                <div v-for="comment in comments" :key="comment.id" class="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-start">
                        <img :src="comment.user.avatar" :alt="comment.user.name" class="w-8 h-8 rounded-full mr-3">
                        <div class="flex-grow">
                            <p class="font-semibold">{{ comment.user.name }}</p>
                            <p v-html="sanitizeContent(comment.content)"></p>
                            <p class="text-sm text-gray-500 mt-1">{{ formatDate(comment.created) }}</p>
                        </div>
                        <div v-if="isOwnComment(comment)" class="ml-2">
                            <button @click="editComment(comment)"
                                class="text-blue-500 hover:text-blue-700 mr-2">Edit</button>
                            <button @click="deleteComment(comment.id)"
                                class="text-red-500 hover:text-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            </TransitionGroup>
            <div v-if="loading" class="text-center py-4">
                <LoaderIcon class="animate-spin h-5 w-5 mx-auto text-gray-500" />
            </div>
            <div v-if="error" class="text-center py-4 text-red-500">
                {{ error }}
                <button @click="$emit('retry')" class="ml-2 text-blue-500 hover:underline">
                    {{ t('retry') }}
                </button>
            </div>
            <button v-if="!loading && !error" @click="$emit('loadMore')"
                class="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors duration-200">
                {{ t('loadMoreComments') }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LoaderIcon } from 'lucide-vue-next'
import MarkdownEditor from '@/components/shared/MarkdownEditor.vue'
import DOMPurify from 'dompurify'

const props = defineProps({
    postId: {
        type: String,
        required: true
    },
    comments: {
        type: Array,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    },
    error: {
        type: String,
        default: null
    }
})

const emit = defineEmits(['addComment', 'updateComment', 'deleteComment', 'loadMore', 'retry'])

const { t } = useI18n()
const newComment = ref('')
const commentInput = ref(null)

const addComment = () => {
    if (newComment.value.trim()) {
        emit('addComment', newComment.value)
        newComment.value = ''
    }
}

const editComment = (comment) => {
    // Implement edit functionality
    console.log('Edit comment:', comment)
}

const deleteComment = (commentId) => {
    if (confirm(t('confirmDeleteComment'))) {
        emit('deleteComment', commentId)
    }
}

const isOwnComment = (comment) => {
    // Implement logic to check if the comment belongs to the current user
    return true // Placeholder
}

const sanitizeContent = (content) => {
    return DOMPurify.sanitize(content)
}

const formatDate = (dateString) => {
    // Implement date formatting logic
    return new Date(dateString).toLocaleString()
}
</script>

<style scoped>
.comment-list-enter-active,
.comment-list-leave-active {
    transition: all 0.5s ease;
}

.comment-list-enter-from,
.comment-list-leave-to {
    opacity: 0;
    transform: translateY(30px);
}
</style>