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
                        <PostHeader :post="post" :isOwnPost="isOwnPost"
                            @showAdvancedOptions="showAdvancedOptionsModal = true" />

                        <PostContent :post="post" :showFullContent="showFullContent" @toggleContent="toggleContent"
                            @hashtagClick="handleHashtagClick" />

                        <PostMedia :post="post" @openLightbox="openLightbox" @openVideoPlayer="openVideoPlayer"
                            @uncoverMedia="handleUncoverMedia" />

                        <PostActions :post="post" :formattedLikes="formattedLikes"
                            :formattedComments="formattedComments" @like="handleLike" @comment="focusCommentInput" />

                        <PostBanWarning v-if="post.banned !== '0'" :banStatus="post.banned" />

                        <CommentSection v-if="post.can_comment === '1'" :postId="post.id" :comments="comments"
                            @addComment="handleComment" @updateComment="handleCommentUpdate"
                            @deleteComment="handleCommentDelete" @loadMore="loadMoreComments"
                            :loading="loadingMoreComments" :error="commentError" @retry="retryLoadComments" />
                    </div>
                </div>
            </template>

            <MediaViewer v-if="showMediaViewer" :post="post" :initialMediaIndex="currentMediaIndex"
                @close="closeMediaViewer" />

            <AdvancedOptionsModal v-if="showAdvancedOptionsModal" :isOwnPost="isOwnPost" :post="post"
                @close="showAdvancedOptionsModal = false" @edit="editPost" @delete="deletePost"
                @toggleComments="toggleComments" @report="handleReportPost" @hide="hidePost" />
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
import { formatNumber } from '../../utils/numberFormat'
import { useConfirm } from '@vueuse/core'
import PostSkeleton from '../shared/PostSkeleton.vue'
import ErrorBoundary from '../shared/ErrorBoundary.vue'
import PostHeader from './PostHeader.vue'
import PostContent from './PostContent.vue'
import PostMedia from './PostMedia.vue'
import PostActions from './PostActions.vue'
import PostBanWarning from './PostBanWarning.vue'
import CommentSection from './CommentSection.vue'
import MediaViewer from '../shared/MediaViewer.vue'
import AdvancedOptionsModal from './AdvancedOptionsModal.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const postStore = usePostStore()
const userStore = useUserStore()

const post = computed(() => postStore.currentPost)
const comments = computed(() => postStore.comments)
const loading = computed(() => postStore.loading)
const error = computed(() => postStore.error)
const loadingMoreComments = computed(() => postStore.loadingMoreComments)
const commentError = computed(() => postStore.commentError)

const formattedLikes = computed(() => formatNumber(post.value?.like || 0))
const formattedComments = computed(() => formatNumber(post.value?.comment || 0))

const showMediaViewer = ref(false)
const currentMediaIndex = ref(0)
const showAdvancedOptionsModal = ref(false)
const isOwnPost = computed(() => post.value?.author?.id === userStore.currentUser?.id)

const { confirm } = useConfirm()

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
    showFullContent.value = !showFullContent.value
}

const openLightbox = (index) => {
    currentMediaIndex.value = index
    showMediaViewer.value = true
}

const openVideoPlayer = (index) => {
    currentMediaIndex.value = index
    showMediaViewer.value = true
}

const closeMediaViewer = () => {
    showMediaViewer.value = false
}

const handleCommentUpdate = async (commentId, content) => {
    await postStore.updateComment(post.value.id, commentId, content)
}

const handleCommentDelete = async (commentId) => {
    await postStore.deleteComment(post.value.id, commentId)
}

const handleUncoverMedia = async (mediaId) => {
    try {
        await postStore.uncoverMedia(post.value.id, mediaId)
    } catch (error) {
        console.error('Failed to uncover media:', error)
        // You might want to show an error message to the user here
    }
}

const handleHashtagClick = (hashtag) => {
    // Remove the '#' symbol if it's included
    const tag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag
    router.push({ name: 'Hashtag', params: { hashtag: tag } })
}

const editPost = () => {
    router.push({ name: 'EditPost', params: { id: post.value.id } })
    showAdvancedOptionsModal.value = false
}

const deletePost = async () => {
    if (await confirm(t('confirmDeletePost'))) {
        try {
            await postStore.deletePost(post.value.id)
            router.push({ name: 'Home' })
        } catch (error) {
            console.error('Failed to delete post:', error)
            // Show an error message to the user
        }
    }
    showAdvancedOptionsModal.value = false
}

const handleReportPost = async () => {
    try {
        await postStore.reportPost(post.value.id)
        // Show a success message to the user
    } catch (error) {
        console.error('Failed to report post:', error)
        // Show an error message to the user
    }
    showAdvancedOptionsModal.value = false
}

const hidePost = async () => {
    try {
        await postStore.hidePost(post.value.id)
        // Remove the post from the current view or update its visibility
    } catch (error) {
        console.error('Failed to hide post:', error)
        // Show an error message to the user
    }
    showAdvancedOptionsModal.value = false
}

const handleSavePost = async () => {
    try {
        await postStore.savePost(post.value.id)
        // Show a success message to the user
    } catch (error) {
        console.error('Failed to save post:', error)
        // Show an error message to the user
    }
}

const handleReportPost = async () => {
    try {
        await postStore.reportPost(post.value.id)
        // Show a success message to the user
    } catch (error) {
        console.error('Failed to report post:', error)
        // Show an error message to the user
    }
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