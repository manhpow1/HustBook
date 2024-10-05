<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6 text-gray-800">Welcome to HustBook</h1>

    <div v-if="userStore.isLoggedIn">
      <AddPost @post-created="handlePostCreated" />

      <div class="mt-12">
        <h2 class="text-2xl font-semibold mb-4 text-gray-800">Recent Posts</h2>
        <div v-if="postStore.loading && postStore.posts.length === 0" class="space-y-6">
          <PostSkeleton v-for="i in 3" :key="i" />
        </div>
        <div v-else-if="postStore.error"
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong class="font-bold">Error!</strong>
          <span class="block sm:inline">{{ postStore.error }}</span>
          <button @click="retryFetchPosts" class="mt-2 text-sm underline">Retry</button>
        </div>
        <div v-else-if="postStore.posts.length > 0">
          <TransitionGroup name="post-list" tag="div" class="space-y-6">
            <div v-for="post in postStore.posts" :key="post.id" class="bg-white shadow rounded-lg p-6">
              <div class="flex items-center mb-4">
                <img :src="post.userAvatar || '/default-avatar.png'" :alt="`${post.userName}'s avatar`"
                  class="w-10 h-10 rounded-full mr-4">
                <div>
                  <p class="font-semibold text-gray-800">{{ post.userName }}</p>
                  <p class="text-sm text-gray-500">{{ formatDate(post.created) }}</p>
                </div>
              </div>
              <p class="mb-4 text-gray-700">{{ post.described }}</p>
              <div v-if="post.media && post.media.length > 0" class="mb-4 grid grid-cols-2 gap-2">
                <div v-for="(media, index) in post.media" :key="index" class="relative">
                  <img v-if="isImage(media)" :src="media" :alt="`Post image ${index + 1}`"
                    class="w-full h-48 object-cover rounded-lg" loading="lazy" />
                  <div v-else @click="goToWatchPage(post.id, index)"
                    class="relative w-full h-48 bg-black rounded-lg overflow-hidden cursor-pointer">
                    <video :src="media" class="w-full h-full object-cover" preload="metadata">
                      Your browser does not support the video tag.
                    </video>
                    <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <PlayIcon class="w-16 h-16 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center text-gray-500">
                <button @click="likePost(post)"
                  class="flex items-center mr-4 hover:text-indigo-600 transition-colors duration-200"
                  :aria-label="post.isLiked ? 'Unlike post' : 'Like post'">
                  <ThumbsUpIcon :class="{ 'text-indigo-600': post.isLiked }" class="w-5 h-5 mr-1" />
                  <span>{{ post.like }} {{ post.like === 1 ? 'Like' : 'Likes' }}</span>
                </button>
                <button @click="showComments(post.id)"
                  class="flex items-center hover:text-indigo-600 transition-colors duration-200">
                  <MessageCircleIcon class="w-5 h-5 mr-1" />
                  <span>{{ post.comment }} {{ post.comment === 1 ? 'Comment' : 'Comments' }}</span>
                </button>
              </div>
              <div class="mt-4">
                <router-link :to="{ name: 'PostDetail', params: { id: post.id } }"
                  class="text-indigo-600 hover:text-indigo-800 transition-colors duration-200">
                  View Full Post
                </router-link>
              </div>
            </div>
          </TransitionGroup>
          <div v-if="hasMorePosts" ref="loadMoreTrigger" class="h-10 flex justify-center items-center mt-4">
            <LoaderIcon v-if="postStore.loading" class="animate-spin h-8 w-8 text-indigo-600" />
          </div>
        </div>
        <p v-else class="text-gray-500">No posts to display yet. Be the first to create a post!</p>
      </div>
    </div>

    <div v-else class="text-center">
      <p class="mb-4 text-gray-700">Please log in to view and create posts.</p>
      <router-link to="/login"
        class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200">
        Log In
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePostStore } from '../stores/postStore'
import { useUserStore } from '../stores/userStore'
import AddPost from '../components/post/AddPost.vue'
import PostSkeleton from '../components/shared/PostSkeleton.vue'
import { LoaderIcon, ThumbsUpIcon, MessageCircleIcon, PlayIcon } from 'lucide-vue-next'
import { useInfiniteScroll } from '@vueuse/core'
import { formatDistanceToNow } from 'date-fns'

const router = useRouter()
const postStore = usePostStore()
const userStore = useUserStore()

const hasMorePosts = ref(true)
const loadMoreTrigger = ref(null)

const fetchPosts = async () => {
  if (!userStore.isLoggedIn || postStore.loading) return

  try {
    const newPosts = await postStore.fetchPosts()
    if (newPosts.length === 0) {
      hasMorePosts.value = false
    }
  } catch (err) {
    console.error('Error fetching posts:', err)
  }
}

const retryFetchPosts = () => {
  postStore.error = null
  fetchPosts()
}

useInfiniteScroll(
  loadMoreTrigger,
  () => {
    if (hasMorePosts.value && !postStore.loading) {
      fetchPosts()
    }
  },
  { distance: 10 }
)

const handlePostCreated = (newPost) => {
  postStore.posts.unshift(newPost)
}

const isImage = (url) => {
  return url.match(/\.(jpeg|jpg|gif|png)$/) != null
}

const likePost = async (post) => {
  await postStore.likePost(post.id)
}

const showComments = (postId) => {
  console.log(`Show comments for post ${postId}`)
}

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

const goToWatchPage = (postId, mediaIndex) => {
  router.push({ name: 'Watch', params: { id: `${postId}-${mediaIndex}` } })
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchPosts()
  }
})

watch(() => userStore.isLoggedIn, (newValue) => {
  if (newValue) {
    fetchPosts()
  } else {
    postStore.$reset()
    hasMorePosts.value = true
  }
})
</script>

<style scoped>
.post-list-enter-active,
.post-list-leave-active {
  transition: all 0.5s ease;
}

.post-list-enter-from,
.post-list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>