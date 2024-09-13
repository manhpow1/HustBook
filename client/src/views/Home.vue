<!-- src/views/Home.vue -->
<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold mb-4 text-blue-600">Welcome to HustBook</h1>

    <div v-if="!isLoggedIn">
      <p class="mb-6 text-gray-600">A social network for HUST students and alumni. Sign in to connect with your peers!
      </p>
      <div class="space-y-4">
        <router-link to="/login"
          class="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300">
          Sign In
        </router-link>
        <router-link to="/signup"
          class="inline-block ml-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300">
          Sign Up
        </router-link>
      </div>
    </div>

    <div v-else>
      <p class="mb-6 text-gray-600">Welcome back! Here's what's new in your network:</p>
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-2xl font-semibold mb-4 text-gray-800">Recent Posts</h2>
        <!-- Add a component or logic here to display recent posts -->
        <p class="text-gray-600">No posts to display yet. Start by creating your first post!</p>
        <button
          class="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300">
          Create Post
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useUserState } from '../userState'

export default {
  name: 'Home',
  setup() {
    const { isLoggedIn } = useUserState()
    return { isLoggedIn }
  }
}
</script>