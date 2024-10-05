<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6 text-gray-800">{{ user.username }}'s Profile</h1>

    <div class="bg-white shadow rounded-lg p-6 mb-6">
      <img :src="user.avatar" :alt="user.username" class="w-32 h-32 rounded-full mx-auto mb-4">
      <h2 class="text-2xl font-semibold text-center mb-2">{{ user.username }}</h2>
      <p class="text-gray-600 text-center">{{ user.bio }}</p>
    </div>

    <div class="mt-8">
      <h3 class="text-2xl font-semibold mb-4">Videos</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="video in userVideos" :key="video.id"
          class="bg-white shadow rounded-lg overflow-hidden cursor-pointer" @click="openVideoModal(video)">
          <img :src="video.thumbnail" :alt="video.title" class="w-full h-48 object-cover">
          <div class="p-4">
            <h4 class="font-semibold text-lg mb-2">{{ video.title }}</h4>
            <p class="text-gray-600 text-sm">{{ video.views }} views</p>
          </div>
        </div>
      </div>
    </div>

    <VideoModal v-model="isVideoModalOpen" :video="selectedVideo" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import VideoModal from '../components/shared/VideoModal.vue'
const route = useRoute()
const user = ref({})
const userVideos = ref([])
const isVideoModalOpen = ref(false)
const selectedVideo = ref(null)

const fetchUserData = async (userId) => {
  // Simulate API call
  return {
    id: userId,
    username: `User${userId}`,
    avatar: 'https://example.com/avatar.jpg',
    bio: 'This is a sample user bio.'
  }
}

const fetchUserVideos = async (userId) => {
  // Simulate API call
  return Array.from({ length: 8 }, (_, i) => ({
    id: `video-${i + 1}`,
    title: `Video ${i + 1}`,
    thumbnail: 'https://example.com/thumbnail.jpg',
    views: Math.floor(Math.random() * 10000),
    url: 'https://example.com/video.mp4'
  }))
}

const openVideoModal = (video) => {
  selectedVideo.value = video
  isVideoModalOpen.value = true
}

onMounted(async () => {
  const userId = route.params.id
  user.value = await fetchUserData(userId)
  userVideos.value = await fetchUserVideos(userId)
})
</script>