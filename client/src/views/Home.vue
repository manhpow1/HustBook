<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6 text-gray-800">Welcome to HustBook</h1>

    <div v-if="isLoggedIn">
      <AddPost @post-created="handlePostCreated" />

      <div class="mt-12">
        <h2 class="text-2xl font-semibold mb-4 text-gray-800">Recent Posts</h2>
        <div v-if="isLoading" class="flex justify-center items-center h-32">
          <LoaderIcon class="animate-spin h-8 w-8 text-indigo-600" />
        </div>
        <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert">
          <strong class="font-bold">Error!</strong>
          <span class="block sm:inline">{{ error }}</span>
        </div>
        <div v-else-if="posts.length > 0">
          <div v-for="post in posts" :key="post.id" class="bg-white shadow rounded-lg p-6 mb-6">
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
              <div v-for="(media, index) in post.media" :key="index">
                <img v-if="isImage(media)" :src="media" :alt="`Post image ${index + 1}`"
                  class="w-full h-48 object-cover rounded-lg" />
                <video v-else controls class="w-full h-48 object-cover rounded-lg">
                  <source :src="media" type="video/mp4">
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
            <div class="flex items-center text-gray-500">
              <button @click="likePost(post.id)"
                class="flex items-center mr-4 hover:text-indigo-600 transition-colors duration-200">
                <ThumbsUpIcon :class="{ 'text-indigo-600': post.isLiked }" class="w-5 h-5 mr-1" />
                <span>{{ post.like }} {{ post.like === 1 ? 'Like' : 'Likes' }}</span>
              </button>
              <button @click="showComments(post.id)"
                class="flex items-center hover:text-indigo-600 transition-colors duration-200">
                <MessageCircleIcon class="w-5 h-5 mr-1" />
                <span>{{ post.comment }} {{ post.comment === 1 ? 'Comment' : 'Comments' }}</span>
              </button>
            </div>
          </div>
          <div v-if="hasMorePosts" class="flex justify-center mt-4">
            <button @click="loadMorePosts"
              class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors duration-200">
              Load More
            </button>
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
import { useUserState } from '../store/user-state'
import AddPost from '../components/AddPost.vue'
import axios from 'axios'
import { LoaderIcon, ThumbsUpIcon, MessageCircleIcon } from 'lucide-vue-next'
import api from '../services/api'

const { isLoggedIn, token } = useUserState()
const posts = ref([])
const isLoading = ref(false)
const error = ref(null)
const page = ref(1)
const hasMorePosts = ref(true)

const fetchPosts = async () => {
  if (!isLoggedIn.value || isLoading.value) return

  isLoading.value = true
  error.value = null

  try {
    const response = await api.get('/posts/get_list_posts', {
      params: { page: page.value, limit: 10 }
    })

    if (response.data.data.length === 0) {
      hasMorePosts.value = false
    } else {
      posts.value = [...posts.value, ...response.data.data]
      page.value++
    }
  } catch (err) {
    console.error('Error fetching posts:', err)
    error.value = 'Failed to load posts. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

const handlePostCreated = (newPost) => {
  posts.value.unshift(newPost)
}

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  return new Date(dateString).toLocaleDateString(undefined, options)
}

const isImage = (url) => {
  return url.match(/\.(jpeg|jpg|gif|png)$/) != null
}

const likePost = async (postId) => {
  try {
    await api.post(`/posts/like`, { id: postId })
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      post.isLiked = !post.isLiked
      post.like += post.isLiked ? 1 : -1
    }
  } catch (err) {
    console.error('Error liking post:', err)
  }
}

const showComments = (postId) => {
  // Implement comment functionality
  console.log(`Show comments for post ${postId}`)
}

const loadMorePosts = () => {
  fetchPosts()
}

onMounted(() => {
  if (isLoggedIn.value) {
    fetchPosts()
  }
})

watch(isLoggedIn, (newValue) => {
  if (newValue) {
    fetchPosts()
  } else {
    posts.value = []
    page.value = 1
    hasMorePosts.value = true
  }
})
</script>