<template>
    <div class="container mx-auto px-4 py-8 font-roboto">
        <ErrorBoundary>
            <template v-if="loading">
                <PostSkeleton avatarSize="w-16 h-16" nameWidth="w-40" :contentLines="['w-full', 'w-4/5', 'w-3/5']"
                    :numberOfImages="2" imageHeight="h-64" buttonSize="w-24 h-10" commentBoxHeight="h-32" />
            </template>

            <div v-else-if="error" class="text-red-500 text-center">
                <AlertCircleIcon class="w-8 h-8 mx-auto mb-2" />
                <p>{{ error }}</p>
                <button @click="fetchPost"
                    class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200">
                    {{ t('retry') }}
                </button>
            </div>

            <template v-else-if="post">
                <div class="bg-white shadow-lg rounded-lg overflow-hidden">
                    <div class="p-6">
                        <PostHeader :post="post" :isOwnPost="isOwnPost" @showAdvancedOptions="showAdvancedOptions" />

                        <PostContent :post="post" @toggleContent="toggleContent" />

                        <PostMedia :post="post" @openLightbox="openLightbox" @openVideoPlayer="openVideoPlayer" />

                        <PostActions :post="post" @like="handleLike" @comment="focusCommentInput" />

                        <PostBanWarning v-if="post.banned !== '0'" :banStatus="post.banned" />

                        <CommentSection v-if="post.can_comment === '1'" :postId="post.id" :comments="comments"
                            @addComment="handleComment" @updateComment="handleCommentUpdate"
                            @deleteComment="handleCommentDelete" @loadMore="loadMoreComments"
                            :loading="loadingMoreComments" :error="commentError" @retry="retryLoadComments" />
                    </div>
                </div>
            </template>

            <button v-if="isOwnPost" @click="editPost" class="btn-secondary">
                Edit Post
            </button>

            <MediaViewer :lightboxImage="lightboxImage" :videoPlayerUrl="videoPlayerUrl" @close="closeMediaViewer" />
        </ErrorBoundary>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePostStore } from '../../stores/post'
import { useUserStore } from '../../stores/user'
import { AlertCircleIcon } from 'lucide-vue-next'
import PostSkeleton from '../shared/PostSkeleton.vue'
import ErrorBoundary from '../shared/ErrorBoundary.vue'
import PostHeader from './PostHeader.vue'
import PostContent from './PostContent.vue'
import PostMedia from './PostMedia.vue'
import PostActions from './PostActions.vue'
import PostBanWarning from './PostBanWarning.vue'
import CommentSection from './CommentSection.vue'
import MediaViewer from '../shared/MediaViewer.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const postStore = usePostStore()
const userStore = useUserStore()
const isOwnPost = computed(() => post.value?.userId === currentUserId)

const post = computed(() => postStore.currentPost)
const comments = computed(() => postStore.comments)
const loading = computed(() => postStore.loading)
const error = computed(() => postStore.error)
const loadingMoreComments = computed(() => postStore.loadingMoreComments)
const commentError = computed(() => postStore.commentError)

const lightboxImage = ref(null)
const videoPlayerUrl = ref(null)
const isOwnPost = computed(() => post.value?.author?.id === userStore.currentUser?.id)

const editPost = () => {
    router.push({ name: 'EditPost', params: { id: post.value.id } })
}

const fetchPost = async () => {
    await postStore.fetchPost(route.params.id)
}

const loadMoreComments = () => {
    postStore.loadMoreComments(route.params.id)
}

const retryLoadComments = () => {
    postStore.retryLoadComments(route.params.id)
}

const handleLike = async () => {
    await postStore.likePost(post.value.id)
}

const handleComment = async (content) => {
    await postStore.addComment(post.value.id, content)
}

const focusCommentInput = () => {
    nextTick(() => {
        document.querySelector('.comment-input')?.focus()
    })
}

const toggleContent = () => {
    postStore.togglePostContent(post.value.id)
}

const openLightbox = (imageUrl) => {
    lightboxImage.value = imageUrl
}

const openVideoPlayer = (videoUrl) => {
    videoPlayerUrl.value = videoUrl
}

const closeMediaViewer = () => {
    lightboxImage.value = null
    videoPlayerUrl.value = null
}

const showAdvancedOptions = () => {
    // Implement advanced options menu for post owner
    console.log('Show advanced options')
}

const handleCommentUpdate = async (commentId, content) => {
    await postStore.updateComment(post.value.id, commentId, content)
}

const handleCommentDelete = async (commentId) => {
    await postStore.deleteComment(post.value.id, commentId)
}

onMounted(async () => {
    await fetchPost()
})
</script>

<style scoped>
.font-roboto {
    font-family: 'Roboto', sans-serif;
}

@media (min-width: 640px) {
    .container {
        max-width: 640px;
    }
}

@media (min-width: 768px) {
    .container {
        max-width: 768px;
    }
}

@media (min-width: 1024px) {
    .container {
        max-width: 1024px;
    }
}

@media (min-width: 1280px) {
    .container {
        max-width: 1280px;
    }
}
</style>