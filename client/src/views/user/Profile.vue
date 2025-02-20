<template>
  <div class="container mx-auto p-4 space-y-6">
    <ErrorBoundary>
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
          <Button variant="outline" size="sm" class="mt-2" @click="initializeProfile">
            Retry
          </Button>
        </AlertDescription>
      </Alert>

      <template v-else>
        <!-- Cover Image Section -->
        <Card class="relative overflow-hidden">
          <div class="h-48 relative">
            <img :src="user?.coverPhoto || '../../assets/default-cover.png'"
              :alt="`${user?.userName || 'User'}'s cover`" class="w-full h-full object-cover" />
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
                    <AvatarFallback>{{
                      getInitials(user?.userName || "")
                    }}</AvatarFallback>
                  </Avatar>
                  <CardTitle class="mt-4">{{ user?.userName }}</CardTitle>
                  <CardDescription>{{ truncatedDescription }}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <!-- Action Buttons -->
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
                      {{ isFriend ? "Unfriend" : "Add Friend" }}
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
                      <a :href="user.link" target="_blank" rel="noopener noreferrer"
                        class="text-primary hover:underline">
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
                <CardDescription>{{ friends.length || 0 }} friends</CardDescription>
              </CardHeader>
              <CardContent>
                <div v-if="loading" class="grid grid-cols-3 gap-2">
                  <Skeleton v-for="i in 6" :key="i" class="h-24 w-full" />
                </div>
                <div v-else-if="error" class="text-center text-red-500 p-4">
                  {{ error }}
                </div>
                <div v-else class="grid grid-cols-3 gap-2">
                  <div v-for="friend in friends?.slice(0, 6)" :key="friend.userId"
                    class="flex flex-col items-center">
                    <Avatar class="h-16 w-16">
                      <AvatarImage :src="friend.avatar" :alt="friend.userName" />
                      <AvatarFallback>{{
                        getInitials(friend.userName)
                      }}</AvatarFallback>
                    </Avatar>
                    <span class="text-sm mt-1 text-center line-clamp-1">{{
                      friend.userName
                    }}</span>
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
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>

              <TabsContent value="posts">
                <Card>
                  <CardHeader>
                    <CardTitle>Posts</CardTitle>
                    <div class="flex items-center space-x-2">
                      <Input v-model="postSearchQuery" placeholder="Search posts..." class="max-w-sm" />
                      <Button variant="outline" @click="() => searchStore.searchPosts({ keyword: postSearchQuery })">
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
                      <Card v-for="post in filteredPosts" :key="post.postId" class="overflow-hidden">
                        <CardHeader>
                          <div class="flex items-center space-x-4">
                            <Avatar>
                              <AvatarImage :src="post.author?.avatar" :alt="post.author?.userName" />
                              <AvatarFallback>{{
                                getInitials(post.author?.userName || "")
                              }}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle class="text-base">{{
                                post.author?.userName
                              }}</CardTitle>
                              <CardDescription>{{
                                formatDate(post.created)
                              }}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p class="text-sm">{{ post.content }}</p>
                          <div v-if="post.media?.length" class="mt-4">
                            <AspectRatio :ratio="16 / 9">
                              <img :src="post.media[0]" :alt="post.content"
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

              <TabsContent value="about">
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div class="space-y-4">
                      <div v-if="user?.bio" class="space-y-2">
                        <h4 class="font-semibold">Bio</h4>
                        <p class="text-sm">{{ user.bio }}</p>
                      </div>

                      <Separator />

                      <div class="space-y-2">
                        <h4 class="font-semibold">Details</h4>
                        <dl class="space-y-2">
                          <div v-if="user?.address" class="flex">
                            <dt class="w-24 text-muted-foreground">Address</dt>
                            <dd>{{ user.address }}</dd>
                          </div>
                          <div v-if="user?.city" class="flex">
                            <dt class="w-24 text-muted-foreground">City</dt>
                            <dd>{{ user.city }}</dd>
                          </div>
                          <div v-if="user?.country" class="flex">
                            <dt class="w-24 text-muted-foreground">Country</dt>
                            <dd>{{ user.country }}</dd>
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
    </ErrorBoundary>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import logger from "@/services/logging";
import { useRoute, useRouter } from "vue-router";
import { useErrorHandler } from "@/utils/errorHandler";
import { useUserStore } from "@/stores/userStore";
import { useSearchStore } from "@/stores/searchStore";
import { useFriendStore } from "@/stores/friendStore";
import { usePostStore } from "@/stores/postStore";
import { useToast } from "@/components/ui/toast";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../components/ui/avatar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { Separator } from "../../components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { AspectRatio } from "../../components/ui/aspect-ratio";
import {
  AlertCircle,
  Search,
  MessageSquare,
  Settings,
  UserPlus,
  MapPin,
  Globe,
  Pencil,
  Link,
  RefreshCw,
} from "lucide-vue-next";
import ErrorBoundary from "@/components/shared/ErrorBoundary.vue";
import { formatDate } from "@/utils/helpers";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const searchStore = useSearchStore();
const friendStore = useFriendStore();
const postStore = usePostStore();
const { toast } = useToast();
const { handleError } = useErrorHandler();
const props = defineProps({
  limit: {
    type: Number,
    default: 20
  },
  index: {
    type: Number,
    default: 0
  }
});
// States
const loading = ref(true);
const loadingPosts = ref(false);
const error = ref(null);
const postError = ref(null);
const user = ref(null);
const friends = ref([]);
const postSearchQuery = ref("");
const targetUserId = computed(() => route.params.userId || userStore.userData?.userId);

const isCurrentUser = computed(() => {
  const targetUserId = route.params.userId;
  const currentUserId = userStore.user?.userId;
  return !targetUserId || targetUserId === currentUserId;
});

const isFriend = computed(() => {
  return friendStore.isFriend(targetUserId.value);
});

const truncatedDescription = computed(() => {
  const desc = user.value?.bio;
  if (!desc) return "";
  return desc.length > 150 ? `${desc.slice(0, 150)}...` : desc;
});

const filteredPosts = computed(() => {
  let posts = postStore.getUserPosts(targetUserId.value);
  if (!Array.isArray(posts)) {
    posts = [];
  }
  if (postSearchQuery.value) {
    const query = postSearchQuery.value.toLowerCase();
    posts = posts.filter(
      (post) =>
        post.content?.toLowerCase().includes(query) ||
        post.author?.userName.toLowerCase().includes(query)
    );
  }
  return posts;
});

const hasMorePosts = computed(() => postStore.hasMorePosts);

// Methods
const getInitials = (name) => {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const initializeProfile = async () => {
  loading.value = true;
  error.value = null;

  try {
    logger.debug("Initializing profile view", {
      targetUserId: targetUserId.value,
      currentUser: userStore.userData,
    });

    // Verify auth state first
    const isAuthenticated = await userStore.verifyAuthState();
    if (!isAuthenticated) {
      logger.debug("User not authenticated, redirecting to login");
      router.push({
        name: "Login",
        query: { redirect: route.fullPath },
      });
      return;
    }

    // If viewing own profile, ensure we have latest user data
    if (isCurrentUser.value) {
      logger.debug("Fetching current user profile");
      const currentUserData = await userStore.fetchUserProfile();
      if (!currentUserData) {
        throw new Error("Failed to fetch current user data");
      }
      user.value = currentUserData;
    } else {
      // Fetch target user's profile
      logger.debug("Fetching target user profile", {
        userId: targetUserId.value,
      });
      const profileData = await userStore.getUserProfile(targetUserId.value);
      if (!profileData) {
        throw new Error("Failed to fetch user profile");
      }
      user.value = profileData;
    }

    // Fetch additional data in parallel
    logger.debug("Fetching additional profile data");
    await Promise.all([
      fetchFriendsData().catch((err) => {
        logger.warn("Failed to fetch friends data:", err);
        friends.value = [];
      }),
      fetchPostsData().catch((err) => {
        logger.warn("Failed to fetch posts data:", err);
        postError.value = "Failed to load posts";
      }),
    ]);
  } catch (err) {
    const errorMessage =
      err.response?.data?.message || err.message || "An error occurred";
    error.value = errorMessage;
    logger.error("Profile initialization failed:", {
      error: err,
      userId: targetUserId.value,
    });

    if (err.response?.status === 401) {
      await userStore.logout(true);
      router.push({
        name: "Login",
        query: { redirect: route.fullPath },
      });
    }

    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    loading.value = false;
  }
};

const fetchFriendsData = async () => {
  try {
    if (!targetUserId.value) {
      const error = new Error("No target user ID available for fetching friends");
      logger.warn(error.message);
      throw error;
    }

    logger.debug("Fetching friends data for profile", {
      targetUserId: targetUserId.value,
      limit: props.limit,
      index: props.index
    });

    const response = await friendStore.getUserFriends({
      userId: targetUserId.value,
      index: 0,
      count: props.limit || 6
    });

    if (response && response.friends) {
      friends.value = response.friends;
    } else {
      throw new Error('Failed to fetch friends data');
    }
    logger.debug("Friends data fetched successfully", {
      friendsCount: friends.value.length,
      total: friendStore.total,
    });
  } catch (err) {
    friends.value = [];

    const errorDetails = {
      code: err.code || 'UNKNOWN',
      message: err.message,
      targetUserId: targetUserId.value,
      storeError: friendStore.error
    };

    logger.error("Error fetching friends data:", errorDetails);

    let errorMessage = "Failed to load friends list";
    if (err.code === 'STORE_ERROR') {
      errorMessage = friendStore.error;
    } else if (!targetUserId.value) {
      errorMessage = "User ID not available";
    }

    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  }
};

const fetchPostsData = async () => {
  try {
    loadingPosts.value = true;
    await postStore.fetchPosts(targetUserId.value);
  } catch (err) {
    logger.error("Error fetching posts:", err);
    postError.value = "Failed to load posts";
  } finally {
    loadingPosts.value = false;
  }
};

const handleFriendAction = async () => {
  try {
    await friendStore.sendFriendRequest(targetUserId.value);
    toast({
      title: "Success",
      description: isFriend.value ? "Friend removed" : "Friend request sent",
    });
  } catch (err) {
    toast({
      title: "Error",
      description: "Failed to process friend action",
      variant: "destructive",
    });
  }
};

const fetchPostsForUser = async (userId) => {
  try {
    loadingPosts.value = true;
    postStore.resetPosts();
    await postStore.fetchPosts({
      userId: userId,
      limit: props.limit || 20,
      index: props.index || 0
    });
  } catch (err) {
    postError.value = "Failed to load user posts";
    logger.error("Error fetching user posts:", err);
    toast({
      title: "Error",
      description: postError.value,
      variant: "destructive",
    });
  } finally {
    loadingPosts.value = false;
  }
};

const loadMorePosts = () => {
  if (!postStore.hasMorePosts) return;
  postStore.getUserPosts();
};

const sendMessage = () => {
  router.push({ name: "Messages" });
};

const viewAllFriends = () => {
  router.push({ name: "Friends" });
};

const uploadCoverPhoto = async () => {
  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/gif";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size should not exceed 5MB",
          variant: "destructive",
        });
        return;
      }

      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        toast({
          title: "Error",
          description: "Only accepts image files in JPG, PNG or GIF format",
          variant: "destructive",
        });
        return;
      }

      try {
        loading.value = true;
        const formData = new FormData();
        formData.append("coverPhoto", file);
        const response = await userStore.updateUserProfile(formData);
        if (response) {
          user.value = {
            ...user.value,
            coverPhoto: response.coverPhoto,
          };
          toast({
            title: "Success",
            description: "Cover photo updated successfully",
          });
        }
      } catch (err) {
        const errorMessage = err.message || "Failed to update cover photo";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        console.error("Upload cover photo error:", err);
      } finally {
        loading.value = false;
      }
    };
    input.click();
  } catch (err) {
    console.error("Upload cover photo error:", err);
    toast({
      title: "Error",
      description: "An error occurred while uploading the image",
      variant: "destructive",
    });
  }
};

const copyProfileLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Success",
      description: "Profile link copied to clipboard",
    });
  } catch (err) {
    toast({
      title: "Error",
      description: "Failed to copy profile link",
      variant: "destructive",
    });
  }
};

const formatViews = (views) => {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(views);
};

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

watch(
  () => route.params.userId,
  () => {
    logger.debug("Route params changed, reinitializing profile");
    initializeProfile();
  }
);

onMounted(() => {
  logger.debug("Profile component mounted");
  initializeProfile();
});
</script>
