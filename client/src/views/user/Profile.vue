<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="loading" class="text-center">
      <p class="text-xl">Loading profile...</p>
    </div>

    <div v-else-if="error" class="text-center text-red-500">
      <p class="text-xl">{{ error }}</p>
    </div>

    <template v-else>
      <h1 class="text-3xl font-bold mb-6 text-gray-800">{{ user.username }}'s Profile</h1>

      <div class="flex flex-col lg:flex-row gap-8">
        <section class="lg:w-2/3">
          <div class="bg-white shadow rounded-lg p-6 mb-6">
            <img :src="user.avatar" :alt="user.username" class="w-32 h-32 rounded-full mx-auto mb-4">
            <h2 class="text-2xl font-semibold text-center mb-2">{{ user.username }}</h2>
            <p class="text-gray-600 text-center">{{ user.bio }}</p>
          </div>

          <div class="mt-8">
            <h3 class="text-2xl font-semibold mb-4">Videos</h3>
            <div v-if="userVideos.length === 0" class="text-center text-gray-500">
              <p>No videos found.</p>
            </div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div v-for="video in userVideos" :key="video.id"
                class="bg-white shadow rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out transform hover:scale-105"
                @click="openVideoModal(video)">
                <img :src="video.thumbnail" :alt="video.title" class="w-full h-48 object-cover">
                <div class="p-4">
                  <h4 class="font-semibold text-lg mb-2">{{ video.title }}</h4>
                  <p class="text-gray-600 text-sm">{{ formatViews(video.views) }} views</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside class="lg:w-1/3">
          <FriendList :userId="userId" />
        </aside>
      </div>

      <VideoModal v-model:isOpen="isVideoModalOpen" :video="selectedVideo" />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { useVideoStore } from '../stores/videoStore'
import FriendList from '../../components/user/FriendList.vue'
import VideoModal from '../../components/shared/VideoModal.vue'

const route = useRoute()
const userStore = useUserStore()
const videoStore = useVideoStore()

const userId = ref(null)
const user = ref({})
const userVideos = ref([])
const isVideoModalOpen = ref(false)
const selectedVideo = ref(null)
const loading = ref(true)
const error = ref(null)

const fetchUserData = async () => {
  try {
    loading.value = true
    error.value = null
    user.value = await userStore.getUserProfile(userId.value)
    userVideos.value = await videoStore.getUserVideos(userId.value)
  } catch (err) {
    error.value = 'Failed to load user profile. Please try again later.'
    console.error('Error fetching user data:', err)
  } finally {
    loading.value = false
  }
}

const openVideoModal = (video) => {
  selectedVideo.value = video
  isVideoModalOpen.value = true
}

const formatViews = (views) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(views)
}

watch(() => route.params.id, (newId) => {
  if (newId) {
    userId.value = newId
    fetchUserData()
  }
})

onMounted(() => {
  if (route.params.id) {
    userId.value = route.params.id
    fetchUserData()
  }
})
</script>