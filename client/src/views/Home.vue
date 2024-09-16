<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Welcome to HustBook</h1>

    <div v-if="isLoggedIn">
      <AddPost @post-created="handlePostCreated" />

      <div class="mt-12">
        <h2 class="text-2xl font-semibold mb-4">Recent Posts</h2>
        <div v-if="posts.length > 0">
          <div v-for="post in posts" :key="post.id" class="bg-white shadow rounded-lg p-6 mb-6">
            <div class="flex items-center mb-4">
              <img :src="post.userAvatar" alt="User Avatar" class="w-10 h-10 rounded-full mr-4">
              <div>
                <p class="font-semibold">{{ post.userName }}</p>
                <p class="text-sm text-gray-500">{{ formatDate(post.created) }}</p>
              </div>
            </div>
            <p class="mb-4">{{ post.described }}</p>
            <div v-if="post.media.length > 0" class="mb-4">
              <img v-if="isImage(post.media[0])" :src="post.media[0]" alt="Post image" class="w-full rounded-lg">
              <video v-else controls class="w-full rounded-lg">
                <source :src="post.media[0]" type="video/mp4">
                Your browser does not support the video tag.
              </video>
            </div>
            <div class="flex items-center text-gray-500">
              <button class="flex items-center mr-4">
                <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5">
                  </path>
                </svg>
                Like
              </button>
              <button class="flex items-center">
                <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z">
                  </path>
                </svg>
                Comment
              </button>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">No posts to display yet. Be the first to create a post!</p>
      </div>
    </div>

    <div v-else class="text-center">
      <p class="mb-4">Please log in to view and create posts.</p>
      <router-link to="/login" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Log In
      </router-link>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useUserState } from '../userState'
import AddPost from '../components/AddPost.vue'
import axios from 'axios'

export default {
  name: 'Home',
  components: {
    AddPost
  },
  setup() {
    const { isLoggedIn, token } = useUserState()
    const posts = ref([])

    const fetchPosts = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/posts/get_list_posts', {
          headers: { Authorization: `Bearer ${token.value}` }
        })
        posts.value = response.data.data
      } catch (error) {
        console.error('Error fetching posts:', error)
      }
    }

    const handlePostCreated = (newPost) => {
      posts.value.unshift(newPost)
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString()
    }

    const isImage = (url) => {
      return url.match(/\.(jpeg|jpg|gif|png)$/) != null
    }

    onMounted(() => {
      if (isLoggedIn.value) {
        fetchPosts()
      }
    })

    return {
      isLoggedIn,
      posts,
      handlePostCreated,
      formatDate,
      isImage
    }
  }
}
</script>