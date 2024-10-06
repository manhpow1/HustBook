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
                <CommentItem v-for="comment in comments" :key="comment.id" :comment="comment" @update="updateComment"
                    @delete="deleteComment" />
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
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePostStore } from '../../stores/postStore'
import { useUserStore } from '../../stores/userStore'
import { LoaderIcon } from 'lucide-vue-next'
import MarkdownEditor from '../shared/MarkdownEditor.vue'
import CommentItem from '../shared/CommentItem.vue'

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
const postStore = usePostStore()
const userStore = useUserStore()
const newComment = ref('')
const commentInput = ref(null)

const addComment = async () => {
    if (newComment.value.trim()) {
        await postStore.addComment(props.postId, newComment.value)
        newComment.value = ''
    }
}

const updateComment = async (updatedComment) => {
    await postStore.updateComment(props.postId, updatedComment.id, updatedComment.content)
}

const deleteComment = async (commentId) => {
    await postStore.deleteComment(props.postId, commentId)
}

const loadMoreComments = () => {
    postStore.loadMoreComments(props.postId)
}

const retryLoadComments = () => {
    postStore.fetchComments(props.postId)
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