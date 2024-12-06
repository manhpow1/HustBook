<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="loading" class="text-center">
      <LoaderIcon class="animate-spin h-10 w-10 text-indigo-600 mx-auto" />
      <p class="text-xl mt-4">Loading profile...</p>
    </div>
    <div v-else-if="error" class="text-center text-red-500">
      <AlertCircleIcon class="h-10 w-10 mx-auto mb-4" />
      <p class="text-xl">{{ error }}</p>
      <button @click="fetchUserData"
        class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
        Retry
      </button>
    </div>
    <template v-else>
      <!-- Cover Image -->
      <div v-if="user.cover_image" class="mb-6">
        <img :src="user.cover_image" :alt="`${user.username}'s cover image`"
          class="w-full h-48 object-cover rounded-lg shadow" loading="lazy" />
      </div>
      <div class="flex flex-col lg:flex-row gap-8">
        <section class="lg:w-2/3">
          <!-- User Card -->
          <div class="bg-white shadow rounded-lg p-6 mb-6">
            <img :src="user.avatar || '../../assets/avatar-default.svg'" :alt="user.username"
              class="w-32 h-32 rounded-full mx-auto mb-4 object-cover">
            <h1 class="text-3xl font-bold text-center mb-2 text-gray-800">{{ user.username }}</h1>
            <p class="text-gray-600 text-center mb-4">{{ user.description || 'No description available' }}</p>
            <!-- User Info: Listing (Friends), Link, Address, etc. -->
            <div class="flex flex-wrap justify-center space-x-4 mb-4">
              <div class="text-center">
                <p class="text-2xl font-semibold">{{ user.listing }}</p>
                <p class="text-gray-600">Friends</p>
              </div>
              <div v-if="user.link" class="text-center">
                <a :href="user.link" target="_blank" rel="noopener noreferrer"
                  class="text-indigo-600 hover:underline inline-block mt-2 break-all">
                  Profile Link
                </a>
              </div>
            </div>
            <div class="text-center text-gray-700">
              <p v-if="user.address">Address: {{ user.address }}</p>
              <p v-if="user.city">City: {{ user.city }}</p>
              <p v-if="user.country">Country: {{ user.country }}</p>
            </div>
            <SendFriendRequest v-if="!isCurrentUser" :userId="userId" class="mt-6" />
          </div>
          <!-- Videos Section -->
          <div class="mt-8">
            <h2 class="text-2xl font-semibold mb-4">Videos</h2>
            <div v-if="userVideos.length === 0" class="text-center text-gray-500 bg-white shadow rounded-lg p-6">
              <VideoOffIcon class="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No videos found.</p>
            </div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div v-for="video in userVideos" :key="video.id"
                class="bg-white shadow rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out transform hover:scale-105"
                @click="openVideoModal(video)">
                <div class="relative">
                  <img :src="video.thumbnail" :alt="video.title" class="w-full h-48 object-cover" loading="lazy">
                  <div class="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {{ formatDuration(video.duration) }}
                  </div>
                </div>
                <div class="p-4">
                  <h4 class="font-semibold text-lg mb-2 line-clamp-2">{{ video.title }}</h4>
                  <p class="text-gray-600 text-sm flex items-center">
                    <EyeIcon class="h-4 w-4 mr-1" />
                    {{ formatViews(video.views) }} views
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <!-- Friend List Section -->
        <aside class="lg:w-1/3">
          <div class="bg-white shadow rounded-lg p-6">
            <h2 class="text-2xl font-semibold mb-4">Friends</h2>
            <FriendList :userId="userId" />
          </div>
        </aside>
      </div>
      <!-- Video Modal -->
      <VideoModal v-if="isVideoModalOpen" v-model:isOpen="isVideoModalOpen" :video="selectedVideo" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useVideoStore } from '../../stores/videoStore';
import FriendList from '../../components/friend/FriendList.vue';
import VideoModal from '../../components/shared/VideoModal.vue';
import SendFriendRequest from '../../components/friend/SendFriendRequest.vue';
import { LoaderIcon, AlertCircleIcon, VideoOffIcon, EyeIcon } from 'lucide-vue-next';
import { useToast } from '../../composables/useToast';
import { useErrorHandler } from '../../composables/useErrorHandler';

const route = useRoute();
const userStore = useUserStore();
const videoStore = useVideoStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

const userId = ref(route.params.id);
const user = ref({});
const userVideos = ref([]);
const isVideoModalOpen = ref(false);
const selectedVideo = ref(null);
const loading = ref(true);
const error = ref(null);

const isCurrentUser = computed(() => {
  // Assuming userStore.user?.id is the logged-in user ID
  return userStore.user && userStore.user.id === userId.value;
});

async function fetchUserData() {
  loading.value = true;
  error.value = null;
  try {
    const userData = await userStore.getUserProfile(userId.value);
    if (!userData) {
      error.value = userStore.error || 'Failed to load user profile. Please try again later.';
      return;
    }
    user.value = userData;

    // Fetch user videos if needed
    userVideos.value = await videoStore.getUserVideos(userId.value) || [];
  } catch (err) {
    await handleError(err);
    error.value = 'Failed to load user profile. Please try again later.';
    console.error('Error fetching user data:', err);
  } finally {
    loading.value = false;
  }
}

const openVideoModal = (video) => {
  selectedVideo.value = video;
  isVideoModalOpen.value = true;
};

const formatViews = (views) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(views);
};

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

watch(() => route.params.id, (newId) => {
  if (newId) {
    userId.value = newId;
    fetchUserData();
  }
});

onMounted(() => {
  if (route.params.id) {
    userId.value = route.params.id;
    fetchUserData();
  }
});
</script>