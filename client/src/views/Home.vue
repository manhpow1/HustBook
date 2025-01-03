<template>
  <ErrorBoundary component-name="Home">
    <main class="container mx-auto p-4 md:p-6 lg:p-8">
      <ScrollArea class="w-full">
        <div v-if="userStore.isLoggedIn">
          <!-- Post Creation -->
          <AddPost @post-created="handlePostCreated" />

          <!-- Recent Posts -->
          <section class="mt-8" aria-labelledby="recent-posts-heading">
            <h2 id="recent-posts-heading" class="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">
              Recent Posts
            </h2>

            <!-- Loading State -->
            <div v-if="postStore.loading && !postStore.posts.length" class="space-y-4">
              <Skeleton v-for="i in 3" :key="i">
                <div class="space-y-3">
                  <div class="flex items-center space-x-4">
                    <div class="h-12 w-12 rounded-full bg-muted" />
                    <div class="space-y-2">
                      <div class="h-4 w-[200px] bg-muted rounded" />
                      <div class="h-4 w-[150px] bg-muted rounded" />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div class="h-4 w-[100%] bg-muted rounded" />
                    <div class="h-4 w-[80%] bg-muted rounded" />
                  </div>
                </div>
              </Skeleton>
            </div>

            <!-- Error State -->
            <Alert v-else-if="postStore.error" variant="destructive" class="animate-in fade-in-50">
              <AlertCircle class="h-4 w-4" />
              <AlertTitle>Unable to load posts</AlertTitle>
              <AlertDescription class="mt-2">
                {{ postStore.error }}
                <Button @click="retryFetchPosts" variant="outline" class="mt-3 w-full" :disabled="postStore.loading">
                  <RefreshCw v-if="postStore.loading" class="mr-2 h-4 w-4 animate-spin" />
                  {{ postStore.loading ? 'Retrying...' : 'Try Again' }}
                </Button>
              </AlertDescription>
            </Alert>

            <!-- Posts List -->
            <TransitionGroup v-else-if="mappedPosts.length > 0" name="post-list" tag="ul" class="space-y-4">
              <li v-for="post in mappedPosts" :key="post.postId">
                <Card>
                  <CardHeader>
                    <div class="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage :src="post.userAvatar" />
                        <AvatarFallback>
                          {{ post.userName ? post.userName.charAt(0) : 'U' }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="space-y-1">
                        <h3 class="font-semibold">{{ sanitizeOutput(post.userName) }}</h3>
                        <time :datetime="post.created" class="text-sm text-muted-foreground">
                          {{ formatDate(post.created) }}
                        </time>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p class="text-card-foreground">{{ sanitizeOutput(post.described) }}</p>

                    <AspectRatio v-if="post.media.length" :ratio="16 / 9" class="mt-4">
                      <div class="grid gap-2" :class="mediaGridClass(post.media.length)">
                        <div v-for="(media, index) in post.media" :key="index"
                          class="relative rounded-lg overflow-hidden">
                          <img v-if="isImage(media)" :src="media" :alt="`Post image ${index + 1}`"
                            class="w-full h-full object-cover" loading="lazy" />

                          <div v-else @click="goToWatchPage(post.postId, index)" class="relative h-full cursor-pointer">
                            <video :src="media" class="w-full h-full object-cover" preload="metadata">
                            </video>
                            <div class="absolute inset-0 flex items-center justify-center bg-black/50">
                              <Play class="w-12 h-12 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </AspectRatio>
                  </CardContent>

                  <CardFooter class="flex flex-wrap gap-2">
                    <Button @click="likePost(post.postId)" variant="outline"
                      :class="{ 'text-primary': post.isLiked === '1' }">
                      <ThumbsUp class="w-4 h-4 mr-2" />
                      {{ post.likes }}
                      {{ post.likes === 1 ? 'Like' : 'Likes' }}
                    </Button>

                    <Button @click="showComments(post.postId)" variant="outline">
                      <MessageCircle class="w-4 h-4 mr-2" />
                      {{ post.comments }}
                      {{ post.comments === 1 ? 'Comment' : 'Comments' }}
                    </Button>

                    <RouterLink :to="{ name: 'PostDetail', params: { postId: post.postId } }" class="w-full sm:w-auto">
                      <Button variant="default" class="w-full">
                        View Full Post
                      </Button>
                    </RouterLink>
                  </CardFooter>
                </Card>
              </li>
            </TransitionGroup>

            <!-- Empty State -->
            <Alert v-else>
              <AlertDescription>
                No posts to display yet. Be the first to create a post!
              </AlertDescription>
            </Alert>
          </section>

          <!-- Load More -->
          <div v-if="postStore.hasMorePosts && !postStore.loading" class="mt-6 text-center">
            <Button @click="loadMorePosts" variant="outline">Load More</Button>
          </div>

          <!-- Spinner if loading more -->
          <div v-if="postStore.loading && postStore.posts.length > 0" class="mt-6 flex justify-center">
            <div class="flex justify-center">
              <div class="loading loading-spinner loading-md"></div>
            </div>
          </div>
        </div>

        <!-- Auth State -->
        <Card v-else class="text-center p-6">
          <CardContent class="space-y-4">
            <p class="text-muted-foreground">
              Please log in to view and create posts.
            </p>
            <RouterLink to="/login">
              <Button>Log In</Button>
            </RouterLink>
          </CardContent>
        </Card>
      </ScrollArea>
    </main>
  </ErrorBoundary>
</template>

<script setup>
import { onMounted, watch, computed, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, ThumbsUp, MessageCircle, Play, RefreshCw } from 'lucide-vue-next'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { usePostStore } from '../stores/postStore'
import { useUserStore } from '../stores/userStore'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy loaded AddPost component
const AddPost = defineAsyncComponent(() =>
  import('../components/post/AddPost.vue')
)
// Utils
import { sanitizeInput, sanitizeOutput } from '../utils/sanitize';
import { useErrorHandler } from '@/utils/errorHandler'

const router = useRouter()
const postStore = usePostStore()
const userStore = useUserStore()
const { handleError } = useErrorHandler()

/**
 * ==================
 * METHODS / HELPERS
 * ==================
 */

// Merge images + video into a single array for the media gallery
const getMediaArray = (post) => {
  if (!post) return []
  const imgArr = Array.isArray(post.images) ? post.images : []
  const vidArr = post.video ? [post.video] : []
  return [...imgArr, ...vidArr]
}

// Provide a computed version of posts that matches template expectations
// e.g., rename `content -> described`, combine images/video into `media`, etc.
const mappedPosts = computed(() =>
  postStore.posts.map((p) => ({
    postId: p.postId,
    created: p.created ?? p.createdAt ?? new Date().toISOString(),
    userName: p.author?.userName || 'Unknown',
    userAvatar: p.author?.avatar || '',
    described: p.content || '',
    media: getMediaArray(p),
    likes: p.likes || 0,
    comments: p.comments || 0,
    isLiked: p.isLiked || '0'
  }))
)

// Called after a new post is created
const handlePostCreated = (newPost) => {
  // If `newPost` is in the same shape as store posts, push it. Otherwise, adapt it first.
  // For example, if `newPost` has .content, .images, .video, .author, etc.
  postStore.posts.unshift(newPost)
}

// Load more posts from store
const loadMorePosts = () => {
  postStore.fetchPosts({})
}

const retryFetchPosts = () => {
  postStore.resetPosts()
  postStore.fetchPosts({})
}

const mediaGridClass = (count) => ({
  'grid-cols-1': count === 1,
  'grid-cols-2': count === 2 || count === 4,
  'grid-cols-3': count === 3,
  'grid-rows-2': count === 4,
  'aspect-square': count > 1,
  'gap-1': count > 2
})

// Toggle post like
const likePost = async (postId) => {
  try {
    await postStore.toggleLike(postId)
  } catch (err) {
    console.error('Error toggling like:', err)
  }
}

// Show comments in PostDetail
const showComments = (postId) => {
  router.push({
    name: 'PostDetail',
    params: { postId: postId },
    hash: '#comments'
  })
}

// Format date using date-fns
const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: vi
  })
}

// Simple image detection
const isImage = (fileUrl) => {
  if (!fileUrl) return false
  return /\.(jpg|jpeg|png|gif|webp|avif|tiff|svg)$/i.test(fileUrl)
}

// Navigate to watch page for the selected video
const goToWatchPage = (postId, mediaIndex) => {
  router.push({
    name: 'PostDetail',
    params: { postId: postId },
    // e.g., you can pass the mediaIndex in query or hash
    query: { mediaIndex }
  })
}

/**
 * ================
 * LIFECYCLE HOOKS
 * ================
 */
onMounted(async () => {
  if (userStore.isLoggedIn) {
    try {
      await postStore.fetchPosts({ reset: true });
    } catch (error) {
      handleError(error);
    }
  }
})

// Watch user login status
watch(
  () => userStore.isLoggedIn,
  async (newValue) => {
    console.log('User login status changed:', newValue)
    if (newValue) {
      console.log('User logged in. Resetting and fetching posts.')
      postStore.resetPosts()
      await postStore.fetchPosts({})
    } else {
      console.log('User logged out. Resetting posts.')
      postStore.resetPosts()
    }
  }
)

// Watch for store error
watch(
  () => postStore.error,
  (newError) => {
    if (newError) handleError(newError)
  }
)
</script>

<style>
.post-list-enter-active,
.post-list-leave-active {
  @apply transition-all duration-500;
}

.post-list-enter-from,
.post-list-leave-to {
  @apply opacity-0 translate-y-8;
}
</style>
