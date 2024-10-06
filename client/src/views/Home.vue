<template>
  <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold mb-6 text-gray-800">Welcome to HustBook</h1>

    <div v-if="userStore.isLoggedIn">
      <AddPost @post-created="handlePostCreated" />

      <section class="mt-12" aria-labelledby="recent-posts-heading">
        <h2 id="recent-posts-heading" class="text-2xl font-semibold mb-4 text-gray-800">Recent Posts</h2>
        <div v-if="postStore.loading && postStore.posts.length === 0" class="space-y-6">
          <PostSkeleton v-for="i in 3" :key="i" />
        </div>
        <div v-else-if="postStore.error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg"
          role="alert">
          <strong class="font-bold">Error!</strong>
          <span class="block sm:inline">{{ postStore.error }}</span>
          <Button @click="retryFetchPosts" variant="outline" class="mt-2">Retry</Button>
        </div>
        <ul v-else-if="postStore.posts.length > 0" class="space-y-6">
          <TransitionGroup name="post-list" tag="div">
            <li v-for="post in postStore.posts" :key="post.id">
              <Card>
                <template #header>
                  <div class="flex items-center">
                    <img :src="post.userAvatar || '/default-avatar.png'" :alt="`${post.userName}'s avatar`"
                      class="w-10 h-10 rounded-full mr-4">
                    <div>
                      <h3 class="font-semibold text-gray-800">{{ post.userName }}</h3>
                      <time :datetime="post.created" class="text-sm text-gray-500">{{ formatDate(post.created) }}</time>
                    </div>
                  </div>
                </template>

                <p class="mb-4 text-gray-700">{{ post.described }}</p>
                <div v-if="post.media && post.media.length > 0" class="mb-4 grid gap-2"
                  :class="mediaGridClass(post.media.length)">
                  <div v-for="(media, index) in post.media" :key="index" class="relative">
                    <img v-if="isImage(media)" :src="media" :alt="`Post image ${index + 1}`"
                      class="w-full h-48 object-cover rounded-lg" loading="lazy" />
                    <div v-else @click="goToWatchPage(post.id, index)"
                      class="relative w-full h-48 bg-black rounded-lg overflow-hidden cursor-pointer">
                      <video :src="media" class="w-full h-full object-cover" preload="metadata">
                        Your browser does not support the video tag.
                      </video>
                      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <PlayIcon class="w-16 h-16 text-white" aria-hidden="true" />
                        <span class="sr-only">Play video</span>
                      </div>
                    </div>
                  </div>
                </div>

                <template #footer>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <Button @click="likePost(post)" variant="outline" :class="{ 'text-primary-600': post.isLiked }">
                      <ThumbsUpIcon class="w-5 h-5 mr-1" />
                      {{ post.like }} {{ post.like === 1 ? 'Like' : 'Likes' }}
                    </Button>
                    <Button @click="showComments(post.id)" variant="outline">
                      <MessageCircleIcon class="w-5 h-5 mr-1" />
                      {{ post.comment }} {{ post.comment === 1 ? 'Comment' : 'Comments' }}
                    </Button>
                    <router-link :to="{ name: 'PostDetail', params: { id: post.id } }" class="w-full sm:w-auto">
                      <Button variant="primary" class="w-full sm:w-auto">View Full Post</Button>
                    </router-link>
                  </div>
                </template>
              </Card>
            </li>
          </TransitionGroup>
        </ul>
        <p v-else class="text-gray-500">No posts to display yet. Be the first to create a post!</p>
      </section>
      <div v-if="hasMorePosts" ref="loadMoreTrigger" class="h-10 flex justify-center items-center mt-4">
        <LoaderIcon v-if="postStore.loading" class="animate-spin h-8 w-8 text-primary-600" aria-hidden="true" />
        <span class="sr-only">Loading more posts</span>
      </div>
    </div>

    <div v-else class="text-center">
      <p class="mb-4 text-gray-700">Please log in to view and create posts.</p>
      <router-link to="/login">
        <Button>Log In</Button>
      </router-link>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { usePostStore } from '../stores/postStore'
import { useUserStore } from '../stores/userStore'
import { LoaderIcon, ThumbsUpIcon, MessageCircleIcon, PlayIcon } from 'lucide-vue-next'
import { useInfiniteScroll } from '@vueuse/core'
import { formatDistanceToNow } from 'date-fns'
import { Button, Card } from '../components/ui'

const AddPost = defineAsyncComponent(() => import('../components/post/AddPost.vue'))
const PostSkeleton = defineAsyncComponent(() => import('../components/shared/PostSkeleton.vue'))

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

const mediaGridClass = (mediaCount) => {
  if (mediaCount === 1) return 'grid-cols-1'
  if (mediaCount === 2) return 'grid-cols-2'
  if (mediaCount === 3) return 'grid-cols-2 sm:grid-cols-3'
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
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