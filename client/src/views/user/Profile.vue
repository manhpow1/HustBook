<template>
  <div class="container mx-auto p-4 space-y-6">
    <Skeleton v-if="loading" class="w-full">
      <div class="space-y-6">
        <div class="h-48 bg-muted rounded-lg" />
        <div class="h-32 bg-muted rounded-lg" />
        <div class="h-64 bg-muted rounded-lg" />
      </div>
    </Skeleton>

    <Alert v-else-if="error" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {{ error }}
        <Button variant="outline" size="sm" class="mt-2" @click="fetchUserData">
          Retry
        </Button>
      </AlertDescription>
    </Alert>

    <template v-else>
      <!-- Cover Image Section -->
      <Card class="relative overflow-hidden">
        <div class="h-48 relative">
          <img :src="user?.cover_image || '/default-cover.jpg'" :alt="`${user?.userName || 'User'}'s cover`"
            class="w-full h-full object-cover" />
          <div class="absolute top-4 right-4 flex space-x-2">
            <Button v-if="isCurrentUser" variant="secondary" size="sm" @click="uploadCoverPhoto">
              <Pencil class="h-4 w-4 mr-2" />
              Edit Cover
            </Button>
            <Button variant="secondary" size="sm" @click="copyProfileLink">
              <Link class="h-4 w-4 mr-2" />
              Share Profile
            </Button>
          </div>
        </div>
      </Card>

      <!-- Profile Info Section -->
      <div class="flex flex-col md:flex-row gap-6">
        <div class="md:w-1/3">
          <Card>
            <CardHeader>
              <div class="flex flex-col items-center">
                <Avatar class="h-24 w-24">
                  <AvatarImage :src="user?.avatar" :alt="user?.userName" />
                  <AvatarFallback>
                    {{ getInitials(user?.userName || '') }}
                  </AvatarFallback>
                </Avatar>
                <CardTitle class="mt-4">{{ user?.userName }}</CardTitle>
                <CardDescription>{{ truncatedDescription }}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div class="flex justify-center space-x-2">
                  <Button v-if="isCurrentUser" variant="outline" @click="router.push('/settings')">
                    <Settings class="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button v-else variant="default" @click="sendMessage">
                    <MessageSquare class="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button v-if="!isCurrentUser" variant="outline" @click="handleFriendAction">
                    <UserPlus class="h-4 w-4 mr-2" />
                    {{ isFriend ? 'Unfriend' : 'Add Friend' }}
                  </Button>
                </div>

                <Separator />

                <div class="space-y-2">
                  <div v-if="user?.city" class="flex items-center text-sm">
                    <MapPin class="h-4 w-4 mr-2" />
                    {{ user.city }}
                  </div>
                  <div v-if="user?.link" class="flex items-center text-sm">
                    <Globe class="h-4 w-4 mr-2" />
                    <a :href="user.link" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                      External Link
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Friends Preview Section -->
          <Card class="mt-6">
            <CardHeader>
              <CardTitle class="text-xl">Friends</CardTitle>
              <CardDescription>{{ user?.friends_count || 0 }} friends</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-3 gap-2">
                <div v-for="friend in friends.slice(0, 6)" :key="friend.id" class="flex flex-col items-center">
                  <Avatar class="h-16 w-16">
                    <AvatarImage :src="friend.avatar" :alt="friend.userName" />
                    <AvatarFallback>{{ getInitials(friend.userName) }}</AvatarFallback>
                  </Avatar>
                  <span class="text-sm mt-1 text-center line-clamp-1">{{ friend.userName }}</span>
                </div>
              </div>
              <Button variant="ghost" class="w-full mt-4" @click="viewAllFriends">
                View All Friends
              </Button>
            </CardContent>
          </Card>
        </div>

        <div class="md:w-2/3">
          <Tabs defaultValue="posts" class="w-full">
            <TabsList>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <Card>
                <CardHeader>
                  <CardTitle>Posts</CardTitle>
                  <div class="flex items-center space-x-2">
                    <Input v-model="postSearchQuery" placeholder="Search posts..." class="max-w-sm" />
                    <Button variant="outline" @click="searchPosts">
                      <Search class="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div v-if="loadingPosts" class="space-y-4">
                    <Skeleton v-for="i in 3" :key="i" class="h-32" />
                  </div>
                  <div v-else-if="postError" class="text-center py-4 text-red-500">
                    {{ postError }}
                  </div>
                  <div v-else-if="filteredPosts.length === 0" class="text-center py-4">
                    No posts found
                  </div>
                  <div v-else class="space-y-4">
                    <Card v-for="post in filteredPosts" :key="post.id" class="overflow-hidden">
                      <CardHeader>
                        <div class="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage :src="post.author?.avatar" :alt="post.author?.userName" />
                            <AvatarFallback>{{ getInitials(post.author?.userName || '') }}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle class="text-base">{{ post.author?.userName }}</CardTitle>
                            <CardDescription>{{ formatDate(post.created) }}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p class="text-sm">{{ post.described }}</p>
                        <div v-if="post.media?.length" class="mt-4">
                          <AspectRatio ratio={16/9}>
                            <img :src="post.media[0]" :alt="post.described"
                              class="rounded-md object-cover w-full h-full" />
                          </AspectRatio>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Button v-if="hasMorePosts && !loadingPosts" variant="outline" class="w-full mt-4"
                    @click="loadMorePosts">
                    Load More
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos">
              <Card>
                <CardHeader>
                  <CardTitle>Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div v-if="!userVideos.length" class="text-center py-8">
                    <Video class="h-12 w-12 mx-auto text-muted-foreground" />
                    <p class="mt-4 text-muted-foreground">No videos found</p>
                  </div>
                  <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card v-for="video in userVideos" :key="video.id"
                      class="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      @click="openVideoModal(video)">
                      <AspectRatio ratio={16/9}>
                        <img :src="video.thumbnail" :alt="video.title" class="object-cover w-full h-full" />
                        <div
                          class="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                          {{ formatDuration(video.duration) }}
                        </div>
                      </AspectRatio>
                      <CardContent class="p-4">
                        <h4 class="font-semibold line-clamp-2">{{ video.title }}</h4>
                        <p class="text-sm text-muted-foreground mt-2">
                          {{ formatViews(video.views) }} views
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="about">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <div class="space-y-4">
                    <div v-if="user?.description" class="space-y-2">
                      <h4 class="font-semibold">Bio</h4>
                      <p class="text-sm">{{ user.description }}</p>
                    </div>

                    <Separator />

                    <div class="space-y-2">
                      <h4 class="font-semibold">Details</h4>
                      <dl class="space-y-2">
                        <div v-if="user?.city" class="flex">
                          <dt class="w-24 text-muted-foreground">Location</dt>
                          <dd>{{ user.city }}</dd>
                        </div>
                        <div v-if="user?.joined" class="flex">
                          <dt class="w-24 text-muted-foreground">Joined</dt>
                          <dd>{{ formatDate(user.joined) }}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </template>

    <Dialog v-model:open="showVideoModal">
      <DialogContent class="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{{ selectedVideo?.title }}</DialogTitle>
        </DialogHeader>
        <video v-if="selectedVideo" :src="selectedVideo.url" controls class="w-full rounded-lg" />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useVideoStore } from '@/stores/videoStore';
import { usePostStore } from '@/stores/postStore';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AspectRatio } from '@/components/ui/aspect-ratio';

// Import icons
import { AlertCircle, Search, MessageSquare, Settings, UserPlus, Video, MapPin, Globe, Pencil, Link } from 'lucide-vue-next';

// Route and stores setup
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const videoStore = useVideoStore();
const postStore = usePostStore();
const { toast } = useToast();

// State management
const loading = ref(true);
const error = ref(null);
const user = ref({});
const friends = ref([]);
const userVideos = ref([]);
const postSearchQuery = ref('');
const showVideoModal = ref(false);
const selectedVideo = ref(null);

// Computed properties
const isCurrentUser = computed(() => userStore.user?.id === route.params.id);

const truncatedDescription = computed(() => {
  const desc = user.value?.description;
  if (!desc) return '';
  return desc.length > 150 ? `${desc.slice(0, 150)}...` : desc;
});

const filteredPosts = computed(() => {
  let posts = postStore.posts;
  if (postSearchQuery.value) {
    const query = postSearchQuery.value.toLowerCase();
    posts = posts.filter(post =>
      post.described?.toLowerCase().includes(query) ||
      post.author?.userName.toLowerCase().includes(query)
    );
  }
  return posts;
});

const hasMorePosts = computed(() => postStore.hasMorePosts);
const isFriend = computed(() => friends.value.some(friend => friend.id === userStore.user?.id));

// Methods
const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const fetchUserData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const userData = await userStore.getUserProfile(route.params.id);
    if (!userData) {
      error.value = 'Failed to load user profile';
      return;
    }

    user.value = userData;
    friends.value = await userStore.getUserFriends(route.params.id);
    userVideos.value = await videoStore.getUserVideos(route.params.id);
    await fetchPostsForUser();
  } catch (err) {
    error.value = 'An error occurred while loading the profile';
    console.error('Error fetching user data:', err);
  } finally {
    loading.value = false;
  }
};

const fetchPostsForUser = async () => {
  try {
    await postStore.resetPosts();
    await postStore.getUserPosts(route.params.id);
  } catch (err) {
    console.error('Error loading posts:', err);
  }
};

const loadMorePosts = () => {
  if (!postStore.hasMorePosts) return;
  postStore.getUserPosts(route.params.id);
};

const searchPosts = () => {
  if (!postSearchQuery.value.trim()) return;
  toast({
    title: "Searching posts",
    description: `Showing results for "${postSearchQuery.value}"`,
  });
};

const handleFriendAction = async () => {
  try {
    if (isFriend.value) {
      // Implement unfriend logic
      await userStore.removeFriend(route.params.id);
      toast({
        title: "Friend Removed",
        description: "User has been removed from your friends list",
      });
    } else {
      // Implement add friend logic
      await userStore.sendFriendRequest(route.params.id);
      toast({
        title: "Friend Request Sent",
        description: "Friend request has been sent successfully",
      });
    }
  } catch (err) {
    toast({
      title: "Error",
      description: "Failed to process friend request",
      variant: "destructive",
    });
  }
};

const sendMessage = () => {
  router.push({
    name: 'Messages',
    query: { userId: route.params.id }
  });
};

const viewAllFriends = () => {
  router.push({
    name: 'Friends',
    query: { userId: route.params.id }
  });
};

const uploadCoverPhoto = () => {
  // Implement cover photo upload logic
  toast({
    description: "Cover photo upload feature coming soon",
  });
};

const copyProfileLink = async () => {
  try {
    const link = `${window.location.origin}/profile/${route.params.id}`;
    await navigator.clipboard.writeText(link);
    toast({
      description: "Profile link copied to clipboard",
    });
  } catch (err) {
    toast({
      description: "Failed to copy profile link",
      variant: "destructive",
    });
  }
};

const openVideoModal = (video) => {
  selectedVideo.value = video;
  showVideoModal.value = true;
};

const formatViews = (views) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(views);
};

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Lifecycle hooks
onMounted(() => {
  if (route.params.id) {
    fetchUserData();
  }
});

watch(() => route.params.id, (newId) => {
  if (newId) {
    fetchUserData();
  }
});
</script>