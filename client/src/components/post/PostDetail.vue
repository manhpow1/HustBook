<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
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
            <div class="flex items-center mb-4">
                <img :src="post.author?.avatar || defaultAvatar" :alt="post.author?.name || 'Unknown'"
                    class="w-12 h-12 rounded-full mr-4">
                <div>
                    <h2 class="font-bold text-lg">{{ post.author?.name || 'Unknown' }}</h2>
                    <p class="text-sm text-gray-500">{{ formatDate(post.created) }}</p>
                </div>
            </div>

            <p class="mb-4 text-gray-800 whitespace-pre-wrap">{{ post.described }}</p>

            <div v-if="post.image && post.image.length > 0" class="mb-4 grid gap-2" :class="gridClass">
                <div v-for="(img, index) in post.image" :key="img.id" class="relative overflow-hidden rounded-lg">
                    <img v-if="img.isVisible" :src="img.url" :alt="post.described"
                        class="w-full h-full object-cover cursor-pointer" @click="openLightbox(img.url)">
                    <div v-else :ref="el => { if (el) imgRefs[index] = el }" class="w-full h-full bg-gray-200"></div>
                </div>
            </div>

            <div v-if="post.video && post.video.length > 0" class="mb-4">
                <video v-for="vid in post.video" :key="vid.url" :src="vid.url" controls
                    class="max-w-full h-auto rounded-lg"></video>
            </div>

            <div class="flex items-center justify-between mb-4">
                <button @click="handleLike"
                    class="flex items-center text-blue-500 hover:text-blue-700 transition-colors duration-200"
                    :aria-label="post.is_liked === '1' ? t('unlike') : t('like')">
                    <ThumbsUpIcon :class="{ 'text-blue-500 fill-current': post.is_liked === '1' }"
                        class="w-5 h-5 mr-1" />
                    {{ post.like }} {{ t('likes') }}
                </button>
                <button @click="focusCommentInput"
                    class="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    :aria-label="t('comment')">
                    <MessageSquareIcon class="w-5 h-5 mr-1" />
                    {{ post.comment }} {{ t('comments') }}
                </button>
                <button @click="sharePost"
                    class="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    :aria-label="t('share')">
                    <ShareIcon class="w-5 h-5 mr-1" />
                    {{ t('share') }}
                </button>
            </div>

            <div v-if="post.banned !== '0'" class="mt-4 p-4 bg-red-100 rounded-lg">
                <p class="text-red-700 flex items-center">
                    <AlertTriangleIcon class="w-5 h-5 mr-2" />
                    {{ getBanReason(post.banned) }}
                </p>
            </div>

            <div v-if="post.can_comment === '1'" class="mb-4">
                <MarkdownEditor v-model="newComment" :rows="3" ref="commentInput" :placeholder="$t('writeComment')" />
                <button @click="handleComment"
                    class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="!newComment.trim()" :aria-label="t('postComment')">
                    {{ t('comment') }}
                </button>
            </div>

            <div v-if="comments.length > 0" class="mt-6">
                <h3 class="text-lg font-semibold mb-4">{{ t('comments') }}</h3>
                <RecycleScroller class="h-[400px] overflow-auto" :items="comments" :item-size="70" key-field="id"
                    v-slot="{ item }" @bottom="loadMoreComments">
                    <CommentItem :comment="item" @update="handleCommentUpdate" @delete="handleCommentDelete" />
                </RecycleScroller>
                <div v-if="loadingMoreComments" class="text-center py-4">
                    <LoaderIcon class="animate-spin h-5 w-5 mx-auto text-gray-500" />
                </div>
                <div v-if="commentError" class="text-center py-4 text-red-500">
                    {{ commentError }}
                    <button @click="retryLoadComments" class="ml-2 text-blue-500 hover:underline">
                        {{ t('retry') }}
                    </button>
                </div>
            </div>
        </template>

        <Teleport to="body">
            <div v-if="lightboxImage" @click="closeLightbox"
                class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <img :src="lightboxImage" :alt="t('enlargedView')" class="max-w-full max-h-full object-contain">
            </div>
        </Teleport>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { RecycleScroller } from 'vue-virtual-scroller'
import { useIntersectionObserver } from '@vueuse/core'
import apiService from '../../services/api'
import { ThumbsUpIcon, MessageSquareIcon, ShareIcon, AlertCircleIcon, AlertTriangleIcon, LoaderIcon } from 'lucide-vue-next'
import PostSkeleton from '../shared/PostSkeleton.vue'
import CommentItem from '../shared/CommentItem.vue'
import MarkdownEditor from '../shared/MarkdownEditor.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const imgRefs = ref([])

const post = ref(null)
const newComment = ref('')
const comments = ref([])
const commentInput = ref(null)
const loading = ref(true)
const error = ref(null)
const lightboxImage = ref(null)
const lastCommentId = ref(null)
const loadingMoreComments = ref(false)
const hasMoreComments = ref(true)
const commentError = ref(null)

const gridClass = computed(() => {
    const count = post.value?.image?.length || 0
    if (count === 1) return ''
    if (count === 2) return 'grid-cols-2'
    if (count === 3) return 'grid-cols-2'
    if (count >= 4) return 'grid-cols-2'
    return ''
})

const fetchPost = async () => {
    loading.value = true
    error.value = null
    try {
        const response = await apiService.getPost(route.params.id)
        if (response.data.code === '1000') {
            post.value = {
                ...response.data.data,
                like: isNaN(parseInt(response.data.data.like)) ? '0' : response.data.data.like,
                comment: isNaN(parseInt(response.data.data.comment)) ? '0' : response.data.data.comment,
                is_liked: ['0', '1'].includes(response.data.data.is_liked) ? response.data.data.is_liked : '0',
                described: response.data.data.described || '',
                author: {
                    id: response.data.data.author?.id || '',
                    name: response.data.data.author?.name || 'Unknown',
                    avatar: response.data.data.author?.avatar || '/path/to/default/avatar.jpg'
                }
            }
            if (post.value.image) {
                post.value.image = post.value.image.map(img => ({ ...img, isVisible: false }))
            }
        } else if (response.data.code === '9992' || response.data.code === '9993') {
            error.value = t('postNotAvailable')
            post.value = null
        } else {
            throw new Error(response.data.message)
        }
    } catch (err) {
        if (err.response && err.response.status === 401) {
            error.value = t('invalidSession')
            await router.push('/login')
        } else if (err.response && err.response.status === 404) {
            error.value = t('postNotFound')
            await router.push('/')
        } else {
            error.value = t('errorLoadingPost')
        }
        post.value = null
    } finally {
        loading.value = false
    }
}

const fetchComments = async () => {
    if (!hasMoreComments.value || loadingMoreComments.value) return

    loadingMoreComments.value = true
    commentError.value = null
    try {
        const response = await apiService.getComments(route.params.id, lastCommentId.value)
        if (response.data && response.data.data) {
            const newComments = response.data.data
            comments.value = [...comments.value, ...newComments]
            if (newComments.length > 0) {
                lastCommentId.value = newComments[newComments.length - 1].id
            }
            hasMoreComments.value = newComments.length === 10 // Assuming 10 is the page size
        } else {
            throw new Error('Invalid response format')
        }
    } catch (err) {
        console.error('Error fetching comments:', err)
        commentError.value = t('errorFetchingComments')
    } finally {
        loadingMoreComments.value = false
    }
}

const loadMoreComments = () => {
    if (hasMoreComments.value && !loadingMoreComments.value) {
        fetchComments()
    }
}

const retryLoadComments = () => {
    commentError.value = null
    fetchComments()
}

const handleLike = async () => {
    const originalLikeStatus = post.value.is_liked
    const originalLikeCount = parseInt(post.value.like)

    // Optimistic update
    post.value.is_liked = post.value.is_liked === '1' ? '0' : '1'
    post.value.like = (originalLikeCount + (post.value.is_liked === '1' ? 1 : -1)).toString()

    try {
        await apiService.likePost(post.value.id)
    } catch (err) {
        // Revert optimistic update on error
        post.value.is_liked = originalLikeStatus
        post.value.like = originalLikeCount.toString()
        console.error('Error liking post:', err)
    }
}

const handleComment = async () => {
    if (!newComment.value.trim()) return

    const tempId = Date.now().toString()
    const tempComment = {
        id: tempId,
        content: newComment.value,
        user: { name: 'You', avatar: '/path/to/your/avatar.jpg' },
        created: new Date().toISOString()
    }

    // Optimistic update
    comments.value.unshift(tempComment)
    post.value.comment = (parseInt(post.value.comment) + 1).toString()
    const originalComment = newComment.value
    newComment.value = ''

    try {
        const response = await apiService.addComment(post.value.id, originalComment)
        const index = comments.value.findIndex(c => c.id === tempId)
        if (index !== -1) {
            comments.value[index] = response.data.data
        }
    } catch (err) {
        // Revert optimistic update on error
        comments.value = comments.value.filter(c => c.id !== tempId)
        post.value.comment = (parseInt(post.value.comment) - 1).toString()
        newComment.value = originalComment
        console.error('Error adding comment:', err)
    }
}


const focusCommentInput = () => {
    nextTick(() => {
        commentInput.value?.focus()
    })
}

const sharePost = () => {
    if (navigator.share) {
        navigator.share({
            title: t('postBy', { author: post.value.author.name }),
            text: post.value.described,
            url: window.location.href
        }).catch(console.error)
    } else {
        // Fallback for browsers that don't support Web Share API
        alert(t('shareLink', { url: window.location.href }))
    }
}

const openLightbox = (imageUrl) => {
    lightboxImage.value = imageUrl
}

const closeLightbox = () => {
    lightboxImage.value = null
}

const getBanReason = (banStatus) => {
    if (banStatus === '1') return t('banReasonViolation')
    if (banStatus === '2') return t('banReasonBlocked')
    if (banStatus.includes(',')) return t('banReasonPartialBlock')
    return t('banReasonFlagged')
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Invalid date';
    }
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

const handleError = (error) => {
    console.error('Error:', error)
    if (error.response?.status === 401) {
        error.value = t('errorUnauthorized')
    } else if (error.response?.status === 404) {
        error.value = t('errorNotFound')
    } else if (error.response) {
        error.value = t('errorServer')
    } else if (error.request) {
        error.value = t('errorNetwork')
    } else {
        error.value = t('errorUnknown')
    }
}

const handleCommentUpdate = async (updatedComment) => {
    try {
        // Call API to update the comment
        const response = await apiService.updateComment(updatedComment.id, updatedComment)

        // Update local state
        const index = comments.value.findIndex(c => c.id === updatedComment.id)
        if (index !== -1) {
            comments.value[index] = { ...comments.value[index], ...response.data.data }
        }
    } catch (error) {
        console.error('Failed to update comment:', error)
        // Handle error (show notification, etc.)
        alert(t('commentUpdateError'))
    }
}

const handleCommentDelete = async (commentId) => {
    try {
        // Call API to delete the comment
        await apiService.deleteComment(commentId)

        // Update local state
        comments.value = comments.value.filter(c => c.id !== commentId)

        // Update post comment count
        if (post.value) {
            post.value.comment = (parseInt(post.value.comment) - 1).toString()
        }
    } catch (error) {
        console.error('Failed to delete comment:', error)
        // Handle error (show notification, etc.)
        alert(t('commentDeleteError'))
    }
}

onMounted(async () => {
    await fetchPost()
    await fetchComments()
})

onMounted(() => {
    nextTick(() => {
        imgRefs.value.forEach((el, index) => {
            if (el) {
                const { stop } = useIntersectionObserver(
                    el,
                    ([{ isIntersecting }]) => {
                        if (isIntersecting) {
                            post.value.image[index].isVisible = true
                            stop()
                        }
                    },
                    { threshold: 0.1 }
                )
            }
        })
    })
})
</script>

<style scoped>
.grid-cols-2 img:first-child:nth-last-child(3),
.grid-cols-2 img:first-child:nth-last-child(3)~img {
    @apply col-span-1;
}

.grid-cols-2 img:first-child:nth-last-child(3) {
    @apply row-span-2;
}

.grid-cols-2 img:first-child:nth-last-child(n+4),
.grid-cols-2 img:first-child:nth-last-child(n+4)~img {
    @apply col-span-1;
}
</style>