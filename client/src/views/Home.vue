<template>
  <ErrorBoundary component-name="Home">
    <main class="container mx-auto p-4 md:p-6 lg:p-8">
      <ScrollArea class="w-full">
        <div v-if="userStore.isLoggedIn">
          <AddPost @post-created="handlePostCreated" />

          <div class="mt-8">
            <h2 class="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">Recent Posts</h2>

            <!-- Loading State -->
            <div v-if="postStore.loading && !postStore.posts.length">
              <Skeleton v-for="i in 3" :key="i" class="w-full h-32 mb-4" />
            </div>

            <!-- Error State -->
            <Alert v-else-if="postStore.error" variant="destructive">
              <AlertCircle class="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{{ postStore.error }}</AlertDescription>
              <Button @click="retryFetchPosts" variant="outline" class="mt-2">Retry</Button>
            </Alert>

            <!-- Posts List -->
            <TransitionGroup v-else-if="postStore.posts.length" name="post-list" tag="ul" class="space-y-4">
              <li v-for="post in postStore.posts" :key="post.id">
                <PostCard :post="post" @like="likePost" @comment="showComments"/>
              </li>
            </TransitionGroup>

            <!-- Empty State -->
            <Alert v-else>
              <AlertDescription>No posts to display yet. Be the first to create a post!</AlertDescription>
            </Alert>

            <!-- Load More -->
            <div v-if="postStore.hasMorePosts && !postStore.loading" class="mt-6 text-center">
              <Button @click="loadMorePosts" variant="outline">Load More</Button>
            </div>

            <!-- Loading More -->
            <div v-if="postStore.loading && postStore.posts.length" class="mt-6 flex justify-center">
              <div class="loading loading-spinner loading-md"></div>
            </div>
          </div>
        </div>

        <!-- Auth State -->
        <Card v-else class="text-center p-6">
          <CardContent class="space-y-4">
            <p class="text-muted-foreground">Please log in to view and create posts.</p>
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
import { onMounted, watch, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, ThumbsUp, MessageCircle, PenBox } from 'lucide-vue-next'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { usePostStore } from '../stores/postStore'
import { useUserStore } from '../stores/userStore'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Skeleton } from '@/components/ui/skeleton'
// Lazy Components
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

// Methods
const loadMorePosts = async () => {
  try {
    await postStore.fetchPosts();
  } catch (err) {
    handleError(err);
  }
}

const retryFetchPosts = async () => {
  postStore.resetPosts();
  try {
    await postStore.fetchPosts();
  } catch (err) {
    handleError(err);
  }
}

const mediaGridClass = (count) => ({
  'grid-cols-1': count === 1,
  'grid-cols-2': count === 2,
  'grid-cols-3': count >= 3,
  'md:grid-cols-4': count >= 4
});

const handlePostCreated = (newPost) => {
  postStore.resetPosts();
  postStore.fetchPosts();
}

const likePost = async (postId) => {
  try {
    await postStore.toggleLike(postId);
  } catch (err) {
    handleError(err);
  }
}

const showComments = (postId) => {
  router.push({
    name: 'PostDetail',
    params: { id: postId },
    hash: '#comments'
  });
}

const formatDate = (date) => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: vi
  })
}

const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const sanitizeText = (text) => sanitizeOutput(text)
const sanitizeUrl = (url) => sanitizeOutput(url)

// Lifecycle
onMounted(async () => {
  if (userStore.isLoggedIn) {
    await retryFetchPosts();
  }
});

watch(() => userStore.isLoggedIn, async (isLoggedIn) => {
  if (isLoggedIn) {
    await retryFetchPosts();
  } else {
    postStore.resetPosts();
  }
});

watch(() => postStore.error, (newError) => {
  if (newError) handleError(newError);
});
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