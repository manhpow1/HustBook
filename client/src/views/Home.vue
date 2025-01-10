<template>
  <ErrorBoundary component-name="Home">
    <main class="container mx-auto p-4 md:p-6 lg:p-8">
      <ScrollArea class="w-full">
        <div v-if="userStore.isLoggedIn">
          <AddPost @post-created="handlePostCreated" />
          <section class="mt-8" aria-labelledby="recent-posts-heading">
            <h2 id="recent-posts-heading" class="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">Recent Posts
            </h2>
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
            <Alert v-else-if="postStore.error" variant="destructive" class="animate-in fade-in-50">
              <AlertCircle class="h-4 w-4" />
              <AlertTitle>Unable to load posts</AlertTitle>
              <AlertDescription class="mt-2">
                {{ postStore.error }}
                <Button @click="retryFetchPosts" variant="outline" class="mt-3 w-full" :disabled="postStore.loading">
                  <RefreshCw v-if="postStore.loading" class="mr-2 h-4 w-4 animate-spin" />
                  {{ postStore.loading ? "Retrying..." : "Try Again" }}
                </Button>
              </AlertDescription>
            </Alert>
            <TransitionGroup v-else-if="mappedPosts.length > 0" name="post-list" tag="ul" class="space-y-4">
              <li v-for="post in mappedPosts" :key="post.postId">
                <Card>
                  <CardHeader>
                    <div class="flex items-center gap-4">
                      <RouterLink v-if="post.userId" :to="{ name: 'UserProfile', params: { userId: post.userId } }"
                        class="flex items-center gap-4 hover:opacity-80">
                        <Avatar>
                          <AvatarImage :src="post.userAvatar" />
                          <AvatarFallback>
                            {{ post.userName ? post.userName.charAt(0) : "U" }}
                          </AvatarFallback>
                        </Avatar>
                        <div class="space-y-1">
                          <h3 class="font-semibold">
                            {{ sanitizeOutput(post.userName) }}
                          </h3>
                          <time :datetime="post.created" class="text-sm text-muted-foreground">
                            {{ formatDate(post.created) }}
                          </time>
                        </div>
                      </RouterLink>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p class="text-card-foreground whitespace-pre-wrap break-words">
                      {{ sanitizeOutput(post.described) }}
                    </p>
                    <div v-if="post.media.length" class="mt-4">
                      <div class="grid gap-2 media-grid" :class="mediaGridClass(post.media.length)">
                        <div v-for="(media, index) in post.media" :key="index"
                          class="relative rounded-lg overflow-hidden media-item">
                          <AspectRatio :ratio="16 / 9">
                            <img v-if="isImage(media)" :src="media" :alt="`Post image ${index + 1}`"
                              class="w-full h-full object-contain min-h-[200px] max-h-[512px]" loading="lazy" />
                            <div v-else @click="goToWatchPage(post.postId, index)"
                              class="relative h-full cursor-pointer">
                              <video :src="media" class="w-full h-full object-cover max-h-[512px]"
                                preload="metadata"></video>
                              <div class="absolute inset-0 flex items-center justify-center bg-black/50">
                                <Play class="w-12 h-12 text-white" />
                              </div>
                            </div>
                          </AspectRatio>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter class="flex flex-wrap gap-2">
                    <Button @click="likePost(post.postId)" variant="outline"
                      :class="{ 'text-primary': post.isLiked === '1' }">
                      <ThumbsUp class="w-4 h-4 mr-2" />
                      {{ post.likes }}
                      {{ post.likes === 1 ? "Like" : "Likes" }}
                    </Button>
                    <Button @click="showComments(post.postId)" variant="outline">
                      <MessageCircle class="w-4 h-4 mr-2" />
                      {{ post.comments }}
                      {{ post.comments === 1 ? "Comment" : "Comments" }}
                    </Button>
                    <RouterLink :to="{
                      name: 'PostDetail',
                      params: { postId: post.postId },
                    }" class="w-full sm:w-auto">
                      <Button variant="default" class="w-full">View Full Post</Button>
                    </RouterLink>
                  </CardFooter>
                </Card>
              </li>
            </TransitionGroup>
            <Alert v-else>
              <AlertDescription>No posts to display yet. Be the first to create a post!</AlertDescription>
            </Alert>
          </section>
          <div v-if="postStore.hasMorePosts && !postStore.loading" class="mt-6 text-center">
            <Button @click="loadMorePosts" variant="outline">Load More</Button>
          </div>
          <div v-if="postStore.loading && postStore.posts.length > 0" class="mt-6 flex justify-center">
            <div class="flex justify-center">
              <div class="loading loading-spinner loading-md"></div>
            </div>
          </div>
        </div>
        <Card v-else class="text-center p-6">
          <CardContent class="space-y-4">
            <p class="text-muted-foreground">Please sign in to view and create posts.</p>
            <RouterLink to="/login">
              <Button>Sign In</Button>
            </RouterLink>
          </CardContent>
        </Card>
      </ScrollArea>
    </main>
  </ErrorBoundary>
</template>

<script setup>
import { onMounted, watch, computed } from "vue";
import { useRouter, RouterLink } from "vue-router";
import ErrorBoundary from "@/components/shared/ErrorBoundary.vue";
import { AlertCircle, ThumbsUp, MessageCircle, Play, RefreshCw } from "lucide-vue-next";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { usePostStore } from "../stores/postStore";
import { useUserStore } from "../stores/userStore";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { defineAsyncComponent } from "vue";
import { sanitizeInput, sanitizeOutput } from "../utils/sanitize";
import { useErrorHandler } from "@/utils/errorHandler";

const AddPost = defineAsyncComponent(() => import("../components/post/AddPost.vue"));
const router = useRouter();
const postStore = usePostStore();
const userStore = useUserStore();
const { handleError } = useErrorHandler();

const getMediaArray = (post) => !post ? [] : [...(Array.isArray(post.images) ? post.images : []), ...(post.video ? [post.video] : [])];

const mappedPosts = computed(() =>
  postStore.posts.map((p) => ({
    postId: p.postId,
    userId: p.author?.userId || p.userId,
    created: p.created ?? p.createdAt ?? new Date().toISOString(),
    userName: p.author?.userName || "Unknown",
    userAvatar: p.author?.avatar || "",
    described: p.content || "",
    media: getMediaArray(p),
    likes: p.likes || 0,
    comments: p.comments || 0,
    isLiked: p.isLiked || "0",
  }))
);

const handlePostCreated = async () => {
  postStore.posts.unshift(newPost);
  postStore.resetPosts();
  await postStore.fetchPosts();
};

const loadMorePosts = () => postStore.fetchPosts();

const retryFetchPosts = async () => {
  postStore.resetPosts();
  await postStore.fetchPosts();
};

const mediaGridClass = (count) => ({
  "grid-cols-1": count === 1,
  "grid-cols-2": count === 2 || count === 4,
  "grid-cols-3": count === 3,
  "grid-rows-2": count === 4,
  "aspect-square": count > 1,
  "gap-1": count > 2,
});

const likePost = async (postId) => {
  try {
    await postStore.toggleLike(postId);
  } catch (err) {
    handleError(err);
  }
};

const showComments = (postId) => {
  router.push({
    name: "PostDetail",
    params: { postId },
    hash: "#comments",
  });
};

const formatDate = (date) => formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi });

const isImage = (fileUrl) => {
  try {
    if (!fileUrl) return false;
    return /(jpg|jpeg|png|gif)/i.test(fileUrl);
  } catch {
    return false;
  }
};

const goToWatchPage = (postId, mediaIndex) => {
  router.push({
    name: "PostDetail",
    params: { postId },
    query: { mediaIndex },
  });
};

onMounted(async () => {
  if (userStore.isLoggedIn) {
    try {
      await postStore.fetchPosts({ reset: true });
    } catch (error) {
      handleError(error);
    }
  }
});

watch(
  () => userStore.isLoggedIn,
  async (newValue) => {
    if (newValue) {
      postStore.resetPosts();
      await postStore.fetchPosts();
    } else {
      postStore.resetPosts();
    }
  }
);

watch(
  () => postStore.error,
  (newError) => {
    if (newError) handleError(newError);
  }
);
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
