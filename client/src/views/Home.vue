<template>
  <ErrorBoundary component-name="Home">
    <main class="container mx-auto p-4 md:p-6 lg:p-8">
      <ScrollArea class="w-full">
        <Card class="mb-6">
          <CardHeader>
            <CardTitle>Welcome to HustBook</CardTitle>
          </CardHeader>
        </Card>

        <div v-if="userStore.isLoggedIn">
          <AddPost @post-created="handlePostCreated" />

          <section class="mt-8" aria-labelledby="recent-posts-heading">
            <h2 id="recent-posts-heading" class="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">
              Recent Posts
            </h2>

            <!-- Loading State -->
            <div v-if="postStore.loading && postStore.posts.length === 0">
              <Skeleton v-for="i in 3" :key="i" class="w-full h-32 mb-4" />
            </div>

            <!-- Error State -->
            <Alert v-else-if="postStore.error" variant="destructive">
              <AlertCircleIcon class="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{{ postStore.error }}</AlertDescription>
              <Button @click="retryFetchPosts" variant="outline" class="mt-2">
                Retry
              </Button>
            </Alert>

            <!-- Posts List -->
            <TransitionGroup v-else-if="postStore.posts.length > 0" name="post-list" tag="ul" class="space-y-4">
              <li v-for="post in sortedSearchResults" :key="post.id">
                <Card>
                  <CardHeader>
                    <div class="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage :src="sanitizeUrl(post.userAvatar)" />
                        <AvatarFallback>{{ post.userName?.charAt(0) }}</AvatarFallback>
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
                    <AspectRatio v-if="post.media?.length" :ratio="16 / 9" class="mt-4">
                      <div class="grid gap-2" :class="mediaGridClass(post.media.length)">
                        <div v-for="(media, index) in post.media" :key="index"
                          class="relative rounded-lg overflow-hidden">
                          <img v-if="isImage(media)" :src="sanitizeUrl(media)" :alt="`Post image ${index + 1}`"
                            class="w-full h-full object-cover" loading="lazy" />

                          <div v-else @click="goToWatchPage(post.id, index)" class="relative h-full cursor-pointer">
                            <video :src="sanitizeUrl(media)" class="w-full h-full object-cover" preload="metadata">
                            </video>
                            <div class="absolute inset-0 flex items-center justify-center bg-black/50">
                              <PlayIcon class="w-12 h-12 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </AspectRatio>
                  </CardContent>

                  <CardFooter class="flex flex-wrap gap-2">
                    <Button @click="likePost(post)" variant="outline" :class="{ 'text-primary': post.isLiked }">
                      <ThumbsUpIcon class="w-4 h-4 mr-2" />
                      {{ post.like }} {{ post.like === 1 ? 'Like' : 'Likes' }}
                    </Button>

                    <Button @click="showComments(post.id)" variant="outline">
                      <MessageCircleIcon class="w-4 h-4 mr-2" />
                      {{ post.comment }} {{ post.comment === 1 ? 'Comment' : 'Comments' }}
                    </Button>

                    <RouterLink :to="{ name: 'PostDetail', params: { id: post.id } }" class="w-full sm:w-auto">
                      <Button variant="default" class="w-full">View Full Post</Button>
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

          <div v-if="postStore.loading && postStore.posts.length > 0" class="mt-6 flex justify-center">
            <div class="flex justify-center">
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
const loadMorePosts = () => postStore.fetchPosts({}, router);

const retryFetchPosts = () => {
  postStore.resetPosts();
  postStore.fetchPosts({}, router);
};

const mediaGridClass = (count) => ({
  'grid-cols-1': count === 1,
  'grid-cols-2': count === 2,
  'grid-cols-3': count >= 3,
  'md:grid-cols-4': count >= 4
});

const handlePostCreated = (newPost) => {
  postStore.posts.unshift(newPost)
}

const likePost = async (post) => {
  await postStore.toggleLike(post.id, router)
}

const showComments = (postId) => {
  router.push({
    name: 'PostDetail',
    params: { id: postId },
    hash: '#comments'
  })
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
onMounted(() => {
  if (userStore.isLoggedIn && !postStore.posts.length) {
    postStore.fetchPosts({}, router);
  }
});

watch(() => userStore.isLoggedIn, async (newValue) => {
  console.log("User login status changed:", newValue);
  if (newValue) {
    console.log("User logged in. Resetting and fetching posts.");
    postStore.resetPosts();
    const response = await postStore.fetchPosts({}, router);
    if (!response || (Array.isArray(postStore.posts) && postStore.posts.length === 0)) {
      console.log("No posts available.");
    }
  } else {
    console.log("User logged out. Resetting posts.");
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