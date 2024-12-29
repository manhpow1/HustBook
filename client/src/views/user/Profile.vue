<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="text-center">
      <LoaderIcon class="animate-spin h-10 w-10 text-indigo-600 mx-auto" />
      <p class="text-xl mt-4">Loading profile...</p>
    </div>
    <!-- Error State -->
    <div v-else-if="error" class="text-center text-red-500">
      <AlertCircleIcon class="h-10 w-10 mx-auto mb-4" />
      <p class="text-xl">{{ error }}</p>
      <Button variant="outline" @click="fetchUserData" class="mt-4" aria-label="Retry">
        Retry
      </Button>
    </div>
    <!-- Profile Content -->
    <template v-else>
      <!-- Cover Section -->
      <div class="relative mb-6">
        <img v-if="user.cover_image" :src="user.cover_image" :alt="`${user.userName}'s cover image`"
          class="w-full h-48 object-cover rounded-lg shadow cursor-pointer" @click="viewFullScreen(user.cover_image)"
          loading="lazy" aria-label="View cover photo in full screen" />
        <div class="absolute top-4 right-4 flex space-x-2">
          <Button variant="outline" size="small" aria-label="Upload new cover photo" @click="uploadCoverPhoto">
            Change Cover
          </Button>
          <CopyLinkButton :link="profileLink" />
        </div>
      </div>
      <div class="flex flex-col lg:flex-row gap-8">
        <section class="lg:w-2/3">
          <!-- User Card -->
          <div class="bg-white shadow rounded-lg p-6 mb-6">
            <div class="flex flex-col items-center mb-4">
              <div class="relative">
                <img :src="user.avatar || '../../assets/avatar-default.svg'" :alt="user.userName"
                  class="w-32 h-32 rounded-full object-cover shadow cursor-pointer" @click="selectNewProfilePicture"
                  aria-label="Select a new profile picture" />
              </div>
              <h1 class="text-3xl font-bold text-center mt-4 text-gray-800">{{ user.userName }}</h1>
              <p class="text-gray-600 text-center mt-2">
                {{ truncatedDescription }}
              </p>
              <p v-if="user.city" class="text-gray-500 text-center mt-1" aria-label="City">
                {{ user.city }}
              </p>
            </div>
            <div class="text-center text-gray-700 flex justify-center space-x-4 mb-4">
              <div class="text-center">
                <p class="text-2xl font-semibold">{{ user.listing }}</p>
                <p class="text-gray-600">Friends</p>
              </div>
              <div v-if="user.link" class="text-center">
                <a :href="user.link" target="_blank" rel="noopener noreferrer"
                  class="text-indigo-600 hover:underline inline-block mt-2 break-all" aria-label="User external link">
                  External Link
                </a>
              </div>
            </div>
            <!-- Friend interaction options -->
            <div class="text-center space-x-2">
              <Button variant="outline" size="small" @click="viewAllFriends" aria-label="View all friends">
                View All Friends
              </Button>
              <Button variant="outline" size="small" @click="goToMessages" aria-label="Send message">
                Message
              </Button>
              <Button variant="outline" size="small" @click="blockOrUnblockUser" aria-label="Block/Unblock user">
                Block/Unblock
              </Button>
              <Button variant="outline" size="small" @click="openEllipsisMenu" aria-label="More actions">
                ...
              </Button>
            </div>
            <SendFriendRequest v-if="!isCurrentUser" :userId="userId" class="mt-6" />
          </div>
          <!-- Search Posts -->
          <div class="mb-4 flex items-center space-x-2">
            <Input id="postSearch" v-model="postSearchQuery" type="text" placeholder="Search posts"
              label="Search Posts" />
            <Button variant="outline" @click="searchPosts" aria-label="Search posts">Search</Button>
          </div>

          <!-- Locked Posts Toggle for Owner -->
          <div v-if="isCurrentUser" class="mb-4">
            <Button variant="outline" size="small" @click="toggleLockedPosts" aria-label="View locked posts">
              {{ lockedPostsVisible ? 'Hide Locked Posts' : 'View Locked Posts' }}
            </Button>
          </div>

          <!-- Personal Posts -->
          <div class="mt-8">
            <h2 class="text-2xl font-semibold mb-4">Posts</h2>
            <div v-if="loadingPosts" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PostSkeleton v-for="i in 4" :key="i" />
            </div>
            <div v-else-if="postError" class="text-red-500 py-4">
              {{ postError }}
            </div>
            <div v-else>
              <ul class="space-y-4">
                <li v-for="post in filteredPosts" :key="post.id" class="bg-white shadow rounded-lg p-4">
                  <PostContent :post="post" @click="viewPostDetail(post.id)" />
                </li>
              </ul>
              <div v-if="hasMorePosts && !loadingPosts" class="text-center mt-4">
                <Button variant="outline" @click="loadMorePosts" aria-label="Load more posts">
                  Load More Posts
                </Button>
              </div>
            </div>
          </div>
          <!-- Videos -->
          <div class="mt-8">
            <h2 class="text-2xl font-semibold mb-4">Videos</h2>
            <div v-if="userVideos.length === 0" class="text-center text-gray-500 bg-white shadow rounded-lg p-6">
              <VideoOffIcon class="h-12 w-12 mx-auto mb-4 text-gray-400" aria-hidden="true" />
              <p>No videos found.</p>
            </div>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div v-for="video in userVideos" :key="video.id"
                class="bg-white shadow rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out transform hover:scale-105"
                @click="openVideoModal(video)" aria-label="Open video modal">
                <div class="relative">
                  <img :src="video.thumbnail" :alt="video.title" class="w-full h-48 object-cover" loading="lazy">
                  <div class="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {{ formatDuration(video.duration) }}
                  </div>
                </div>
                <div class="p-4">
                  <h4 class="font-semibold text-lg mb-2 line-clamp-2">{{ video.title }}</h4>
                  <p class="text-gray-600 text-sm flex items-center">
                    <EyeIcon class="h-4 w-4 mr-1" aria-hidden="true" />
                    {{ formatViews(video.views) }} views
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <!-- Friends Section -->
        <aside class="lg:w-1/3 space-y-4">
          <div class="bg-white shadow rounded-lg p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-semibold">Friends</h2>
              <Button variant="outline" size="small" @click="viewAllFriends" aria-label="View all friends">
                View All
              </Button>
            </div>
            <FriendList :userId="userId" :limit="6" :sortBy="initialSort" />
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
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { useVideoStore } from '../../stores/videoStore';
import { usePostStore } from '../../stores/postStore';
import FriendList from '../../components/friend/FriendList.vue';
import VideoModal from '../../components/shared/VideoModal.vue';
import PostSkeleton from '../../components/shared/PostSkeleton.vue';
import PostContent from '../../components/post/PostContent.vue';
import SendFriendRequest from '../../components/friend/SendFriendRequest.vue';
import { LoaderIcon, AlertCircleIcon, VideoOffIcon, EyeIcon } from 'lucide-vue-next';
import { useErrorHandler } from '@/utils/errorHandler';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import CopyLinkButton from '../../components/ui/CopyLinkButton.vue';
import { Input } from '@/components/ui/input';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const videoStore = useVideoStore();
const postStore = usePostStore();
const { handleError } = useErrorHandler();
const toast = useToast();

const userId = ref(route.params.id);
const user = ref({});
const userVideos = ref([]);
const isVideoModalOpen = ref(false);
const selectedVideo = ref(null);
const loading = ref(true);
const error = ref(null);

const lockedPostsVisible = ref(false);
const loadingPosts = ref(false);
const postError = ref(null);
const hasMorePosts = computed(() => postStore.hasMorePosts);
const posts = computed(() => postStore.posts);

const postSearchQuery = ref('');
const filteredPosts = computed(() => {
  let allPosts = lockedPostsVisible.value
    ? posts.value
    : posts.value.filter(p => !p.locked);

  if (postSearchQuery.value.trim() !== '') {
    const query = postSearchQuery.value.toLowerCase();
    allPosts = allPosts.filter(p =>
      (p.content && p.content.toLowerCase().includes(query)) ||
      (p.author && p.author.userName.toLowerCase().includes(query))
    );
  }

  return allPosts;
});

const isCurrentUser = computed(() => {
  return userStore.user && userStore.user.id === userId.value;
});

// For description truncation
const truncatedDescription = computed(() => {
  if (user.value.description) {
    return user.value.description.slice(0, 150);
  }
  return '';
});

const initialSort = 'recent';

// Profile Link
const profileLink = computed(() => `${window.location.origin}/profile/${userId.value}`);

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

    // Fetch user videos
    userVideos.value = await videoStore.getUserVideos(userId.value) || [];

    // Fetch posts
    await fetchPostsForUser();
  } catch (err) {
    await handleError(err);
    error.value = 'Failed to load user profile. Please try again later.';
    console.error('Error fetching user data:', err);
  } finally {
    loading.value = false;
  }
}

async function fetchPostsForUser() {
  loadingPosts.value = true;
  postError.value = null;
  try {
    await postStore.resetPosts();
    await postStore.getUserPosts(userId.value, { limit: 10 });
  } catch (err) {
    postError.value = 'Failed to load user posts';
    console.error('Error loading posts:', err);
  } finally {
    loadingPosts.value = false;
  }
}

function loadMorePosts() {
  if (!postStore.hasMorePosts) return;
  postStore.fetchPosts({ userId }).catch((err) => {
    console.error('Error loading more posts:', err);
  });
}

function viewPostDetail(postId) {
  router.push({ name: 'PostDetail', params: { id: postId } });
}

function toggleLockedPosts() {
  lockedPostsVisible.value = !lockedPostsVisible.value;
}

function openVideoModal(video) {
  selectedVideo.value = video;
  isVideoModalOpen.value = true;
}

function formatViews(views) {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(views);
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Friend and Navigation Actions
function viewAllFriends() {
  router.push({ name: 'Friends', query: { userId: userId.value, view: 'all', sort: 'alphabetical' } });
}

function goToMessages() {
  router.push({ name: 'Messages', query: { userId: userId.value } });
}

function blockOrUnblockUser() {
  toast('Block/Unblock user not implemented', 'info');
}

function openEllipsisMenu() {
  toast('Ellipsis menu not implemented', 'info');
}

// Upload Actions
function uploadCoverPhoto() {
  // Implement cover photo upload logic
  // Possibly use FileUpload component or similar approach
  toast('Cover photo upload not implemented', 'info');
}

function selectNewProfilePicture() {
  // Implement avatar selection logic
  toast('Select new profile picture not implemented', 'info');
}

function viewFullScreen(imageUrl) {
  // Show image in a full-screen viewer (e.g. MediaViewer)
  toast('Full-screen view not implemented', 'info');
}

// Searching posts
function searchPosts() {
  // postSearchQuery is already bound, computed filteredPosts will reactively update
  // Just ensure that postSearchQuery is used in filteredPosts computation
  toast(`Searching posts for "${postSearchQuery.value}"`, 'info');
}

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