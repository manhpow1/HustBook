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
            <div v-if="postStore.loading">
              <Skeleton v-for="i in 3" :key="i" class="w-full h-32 mb-4" />
            </div>

            <!-- Error State -->
            <Alert v-else-if="postStore.error" variant="destructive">
              <AlertCircle class="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{{ postStore.error }}</AlertDescription>
              <Button @click="retryFetchPosts" variant="outline" class="mt-2">
                Retry
              </Button>
            </Alert>

            <!-- Posts List -->
            <TransitionGroup v-else-if="mappedPosts.length > 0" name="post-list" tag="ul" class="space-y-4">
              <li v-for="post in mappedPosts" :key="post.id">
                <Card>
                  <CardHeader>
                    <div class="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage :src="sanitizeUrl(post.userAvatar)" />
                        <AvatarFallback>
                          {{ post.userName ? post.userName.charAt(0) : 'U' }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="space-y-1">
                        <h3 class="font-semibold">{{ sanitizeText(post.userName) }}</h3>
                        <time :datetime="post.created" class="text-sm text-muted-foreground">
                          {{ formatDate(post.created) }}
                        </time>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p class="text-card-foreground">{{ sanitizeText(post.described) }}</p>

                    <!-- Media Grid -->
                    <AspectRatio v-if="post.media.length" :ratio="16 / 9" class="mt-4">
                      <div class="grid gap-2" :class="mediaGridClass(post.media.length)">
                        <div v-for="(media, index) in post.media" :key="index"
                          class="relative rounded-lg overflow-hidden">
                          <!-- If it's an image -->
                          <img v-if="isImage(media)" :src="sanitizeUrl(media)" :alt="`Post image ${index + 1}`"
                            class="w-full h-full object-cover" loading="lazy" />

                          <!-- If it's a video -->
                          <div v-else @click="goToWatchPage(post.id, index)" class="relative h-full cursor-pointer">
                            <video :src="sanitizeUrl(media)" class="w-full h-full object-cover" preload="metadata">
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
                    <Button @click="likePost(post.id)" variant="outline"
                      :class="{ 'text-primary': post.isLiked === '1' }">
                      <ThumbsUp class="w-4 h-4 mr-2" />
                      {{ post.likes }}
                      {{ post.likes === 1 ? 'Like' : 'Likes' }}
                    </Button>

                    <Button @click="showComments(post.id)" variant="outline">
                      <MessageCircle class="w-4 h-4 mr-2" />
                      {{ post.comments }}
                      {{ post.comments === 1 ? 'Comment' : 'Comments' }}
                    </Button>

                    <RouterLink :to="{ name: 'PostDetail', params: { id: post.id } }" class="w-full sm:w-auto">
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
import { AlertCircle, ThumbsUp, MessageCircle, Play } from 'lucide-vue-next'
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
import { sanitizeOutput } from '../utils/sanitize'
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
    id: p.id,
    // Some API responses might store time in `p.created`, others in `p.createdAt`
    created: p.created ?? p.createdAt ?? new Date().toISOString(),

    // Author fields
    userName: p.author?.name || 'Unknown',
    userAvatar: p.author?.avatar || '',

    // Content fields
    described: p.content || '',
    media: getMediaArray(p),

    // Engagement fields
    likes: p.likes || 0,
    comments: p.comments || 0,
    isLiked: p.isLiked || '0' // '0' or '1'
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
  'grid-cols-2': count === 2,
  'grid-cols-3': count >= 3,
  'md:grid-cols-4': count >= 4
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
    params: { id: postId },
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
    params: { id: postId },
    // e.g., you can pass the mediaIndex in query or hash
    query: { mediaIndex }
  })
}

// Basic sanitizing
const sanitizeText = (text) => sanitizeOutput(text)
const sanitizeUrl = (url) => sanitizeOutput(url)

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
