<template>
  <ErrorBoundary component-name="Home">
    <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-3xl font-bold mb-6 text-gray-800">Welcome to HustBook</h1>
      <div v-if="userStore.isLoggedIn">
        <!-- Lazy Loaded AddPost Component with Suspense -->
        <Suspense>
          <template #default>
            <AddPost @post-created="handlePostCreated" />
          </template>
          <template #fallback>
            <div class="animate-pulse">
              <PostSkeleton />
            </div>
          </template>
        </Suspense>
        <!-- Recent Posts Section -->
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
              <li v-for="post in sortedSearchResults" :key="post.id">
                <Card>
                  <template #header>
                    <div class="flex items-center">
                      <img :src="sanitizeUrl(post.userAvatar) || '../assets/avatar-default.svg'"
                        :alt="`${sanitizeText(post.userName)}'s avatar`" class="w-10 h-10 rounded-full mr-4"
                        loading="lazy" />
                      <div>
                        <h3 class="font-semibold text-gray-800">{{ sanitizeText(post.userName) }}</h3>
                        <time :datetime="post.created" class="text-sm text-gray-500">{{ formatDate(post.created)
                          }}</time>
                      </div>
                    </div>
                  </template>

                  <p class="mb-4 text-gray-700">{{ sanitizeText(post.described) }}</p>
                  <!-- Media Section -->
                  <div v-if="post.media && post.media.length > 0" class="mb-4 grid gap-2"
                    :class="mediaGridClass(post.media.length)">
                    <div v-for="(media, index) in post.media" :key="index" class="relative">
                      <img v-if="isImage(media)" :src="sanitizeUrl(media)" :alt="`Post image ${index + 1}`"
                        class="w-full h-48 object-cover rounded-lg" loading="lazy" />
                      <div v-else @click="goToWatchPage(post.id, index)"
                        class="relative w-full h-48 bg-black rounded-lg overflow-hidden cursor-pointer">
                        <video :src="sanitizeUrl(media)" class="w-full h-full object-cover" preload="metadata">
                          Your browser does not support the video tag.
                        </video>
                        <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                          <PlayIcon class="w-16 h-16 text-white" aria-hidden="true" />
                          <span class="sr-only">Play video</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Footer with Actions -->
                  <template #footer>
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <Button @click="likePost(post)" variant="outline" :class="{ 'text-primary-600': post.isLiked }"
                        aria-label="Like Post">
                        <ThumbsUpIcon class="w-5 h-5 mr-1" aria-hidden="true" />
                        {{ post.like }} {{ post.like === 1 ? 'Like' : 'Likes' }}
                      </Button>
                      <Button @click="showComments(post.id)" variant="outline" aria-label="View Comments">
                        <MessageCircleIcon class="w-5 h-5 mr-1" aria-hidden="true" />
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
        <!-- Load More Button -->
        <div v-if="postStore.hasMorePosts && !postStore.loading" class="mt-4 text-center">
          <Button @click="loadMorePosts" variant="outline">Load More</Button>
        </div>
        <div v-if="postStore.loading && postStore.posts.length > 0" class="mt-4 text-center" role="status"
          aria-live="polite">
          <span class="loading loading-spinner loading-md"></span>
        </div>
      </div>
      <!-- Prompt to Log In -->
      <div v-else class="text-center">
        <p class="mb-4 text-gray-700">Please log in to view and create posts.</p>
        <router-link to="/login">
          <Button>Log In</Button>
        </router-link>
      </div>
    </main>
  </ErrorBoundary>
</template>

<script setup>
import { onMounted, watch, defineAsyncComponent, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePostStore } from '../stores/postStore';
import { useUserStore } from '../stores/userStore';
import { ThumbsUpIcon, MessageCircleIcon, PlayIcon } from 'lucide-vue-next';
import { formatDistanceToNow } from 'date-fns';
import { Button, Card } from '../components/ui';
import ErrorBoundary from '../components/shared/ErrorBoundary.vue';
import { sanitizeOutput } from '../utils/sanitize';
import { handleError } from '../utils/errorHandler';

// Lazy Loaded Components
const AddPost = defineAsyncComponent(() => import('../components/post/AddPost.vue'));
const PostSkeleton = defineAsyncComponent(() => import('../components/shared/PostSkeleton.vue'));

const router = useRouter();
const postStore = usePostStore();
const userStore = useUserStore();

const loadMorePosts = () => {
  console.log("Load more posts triggered");
  postStore.fetchPosts({}, router);
};

const retryFetchPosts = () => {
  console.log("Retry fetching posts triggered");
  postStore.resetPosts();
  postStore.fetchPosts({}, router);
};

const handlePostCreated = (newPost) => {
  postStore.posts.unshift(newPost);
};

const isImage = (url) => {
  return url.match(/\.(jpeg|jpg|gif|png)$/i) != null;
};

const likePost = async (post) => {
  console.log(`Like post triggered for post ID: ${post.id}`);
  await postStore.toggleLike(post.id, router);
};

const showComments = (postId) => {
  console.log(`Show comments triggered for post ID: ${postId}`);
};

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

const goToWatchPage = (postId, mediaIndex) => {
  router.push({ name: 'Watch', params: { id: `${postId}-${mediaIndex}` } });
};

const mediaGridClass = (mediaCount) => {
  if (mediaCount === 1) return 'grid-cols-1';
  if (mediaCount === 2) return 'grid-cols-2';
  if (mediaCount === 3) return 'grid-cols-2 sm:grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
};

const sanitizeText = (text) => {
  return sanitizeOutput(text);
};

const sanitizeUrl = (url) => {
  return sanitizeOutput(url);
};

onMounted(() => {
  console.log("Mounted: Checking if user is logged in and fetching posts if necessary");
  console.log("userStore.isLoggedIn:", userStore.isLoggedIn);
  console.log("postStore.posts.length:", postStore.posts.length);

  if (userStore.isLoggedIn && postStore.posts.length === 0) {
    console.log("User is logged in, fetching posts...");
    postStore.fetchPosts({}, router);
  } else {
    console.log("User is not logged in or posts are already loaded.");
  }
});

watch(() => userStore.isLoggedIn, (newValue) => {
  console.log("User login status changed:", newValue);
  if (newValue) {
    console.log("User logged in. Resetting and fetching posts.");
    postStore.resetPosts();
    postStore.fetchPosts({}, router);
  } else {
    console.log("User logged out. Resetting posts.");
    postStore.resetPosts();
  }
});

watch(() => postStore.error, (newError) => {
  if (newError) {
    handleError(newError);
  }
});
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

/* Media Queries for Responsive Design */
@media (max-width: 640px) {
  /* Styles for mobile devices */
}

@media (min-width: 641px) and (max-width: 1024px) {
  /* Styles for tablets */
}

@media (min-width: 1025px) {
  /* Styles for desktops */
}
</style>