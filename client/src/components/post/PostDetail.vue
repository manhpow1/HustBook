<template>
    <div class="container mx-auto px-4 py-6">
        <ErrorBoundary component-name="PostDetail">
            <div v-if="loading" class="space-y-6">
                <Card>
                    <CardContent class="p-6 space-y-6">
                        <div class="flex items-center space-x-4">
                            <Skeleton class="h-12 w-12 rounded-full" />
                            <div class="space-y-2">
                                <Skeleton class="h-4 w-[200px]" />
                                <Skeleton class="h-4 w-[140px]" />
                            </div>
                        </div>

                        <div class="space-y-3">
                            <Skeleton class="h-4 w-full" />
                            <Skeleton class="h-4 w-[90%]" />
                            <Skeleton class="h-4 w-[80%]" />
                        </div>

                        <Skeleton class="h-[300px] w-full rounded-lg" />

                        <div class="flex items-center space-x-4">
                            <Skeleton class="h-10 w-20" />
                            <Skeleton class="h-10 w-20" />
                            <Skeleton class="h-10 w-20" />
                        </div>

                        <div class="space-y-4">
                            <div class="flex items-center space-x-4">
                                <Skeleton class="h-10 w-10 rounded-full" />
                                <div class="space-y-2 flex-1">
                                    <Skeleton class="h-4 w-full" />
                                    <Skeleton class="h-4 w-[90%]" />
                                </div>
                            </div>
                            <div class="flex items-center space-x-4">
                                <Skeleton class="h-10 w-10 rounded-full" />
                                <div class="space-y-2 flex-1">
                                    <Skeleton class="h-4 w-full" />
                                    <Skeleton class="h-4 w-[90%]" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Alert v-else-if="error" variant="destructive" role="alert">
                <AlertCircle class="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription class="flex flex-col gap-3">
                    {{ error }}
                    <Button @click="fetchPost" variant="outline" size="sm">
                        <RefreshCw class="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>

            <div v-else-if="post" class="space-y-6">
                <Card>
                    <CardContent class="p-6 space-y-6">
                        <PostHeader :post="post" />

                        <Separator />

                        <PostContent :post="post" :showFullContent="showFullContent" @toggleContent="toggleContent"
                            @hashtagClick="handleHashtagClick" />

                        <PostMedia v-if="post.images?.length || post.video" :post="post"
                            @uncoverMedia="handleUncoverMedia" @like="handleLike" @comment="focusCommentInput" />

                        <Separator />

                        <PostActions :post="post" @like="handleLike" @comment="focusCommentInput"
                            @updateComments="updateCommentCount" />

                        <PostBanWarning v-if="post.banned && post.banned !== '0'" :banStatus="post.banned" />

                        <Separator />

                        <div class="space-y-4">
                            <div v-if="loadingComments" class="flex justify-center py-6">
                                <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
                                <span class="sr-only">Loading comments...</span>
                            </div>
                            <CommentSection :postId="post.postId" @update:comments="updateCommentCount" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <MediaViewer v-if="showMediaViewer" :isOpen="showMediaViewer" :mediaList="mediaList"
                :initialIndex="currentMediaIndex" :likes="post?.like" :comments="post?.comment"
                :isLiked="post?.isLiked === '1'" @close="closeMediaViewer" @like="handleLike"
                @comment="handleComment" />
        </ErrorBoundary>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { usePostStore } from "@/stores/postStore";
import { useUserStore } from "@/stores/userStore";
import { useToast } from "@/components/ui/toast";
import { AlertCircle, Loader2, RefreshCw } from "lucide-vue-next";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "../ui/skeleton";
import { useCommentStore } from "@/stores/commentStore";

const ErrorBoundary = defineAsyncComponent(() =>
    import("../shared/ErrorBoundary.vue")
);
const PostHeader = defineAsyncComponent(() => import("./PostHeader.vue"));
const PostContent = defineAsyncComponent(() => import("./PostContent.vue"));
const PostMedia = defineAsyncComponent(() => import("./PostMedia.vue"));
const PostActions = defineAsyncComponent(() => import("./PostActions.vue"));
const PostBanWarning = defineAsyncComponent(() => import("./PostBanWarning.vue"));
const CommentSection = defineAsyncComponent(() => import("./CommentSection.vue"));
const MediaViewer = defineAsyncComponent(() => import("../shared/MediaViewer.vue"));

const router = useRouter();
const postStore = usePostStore();
const userStore = useUserStore();
const commentStore = useCommentStore();
const { toast } = useToast();

// State
const showFullContent = ref(false);
const showMediaViewer = ref(false);
const currentMediaIndex = ref(0);

// Store refs
const { currentPost: post, loading, error } = storeToRefs(postStore);

const mediaList = computed(() => {
    if (!post.value) return [];
    return !post.value ? [] : [
        ...(Array.isArray(post.value.images) ? post.value.images : []),
        ...(post.value.video ? [post.value.video] : [])
    ];
});

// Methods
const fetchPost = async () => {
    try {
        const postId = router.currentRoute.value.params.postId;
        if (!postId) {
            throw new Error('Post ID is required');
        }
        await postStore.fetchPost(postId);
    } catch (err) {
        toast({
            title: "Error",
            description: err.message || "Failed to fetch post",
            variant: "destructive",
        });
        throw err;
    }
};

const editPost = () => {
    router.push({
        name: "EditPost",
        params: { postId: post.value.postId },
    });
};

const confirmDeletePost = () => {
    showDeletePostModal.value = true;
};

const handlePostDeleted = () => {
    router.push({ name: "Home" });
};

const handleLike = async () => {
    try {
        await postStore.toggleLike(post.value.postId);
    } catch (err) {
        toast({
            title: "Error",
            description: "Failed to like post",
            variant: "destructive",
        });
    }
};

const updateCommentCount = (newCount) => {
    if (post.value) {
        post.value.comments = newCount;
    }
};

const handleUncoverMedia = async (mediaId) => {
    try {
        await postStore.uncoverMedia(post.value.postId, mediaId);
        toast({
            description: "Media uncovered successfully",
        });
    } catch (err) {
        toast({
            title: "Error",
            description: "Failed to uncover media",
            variant: "destructive",
        });
    }
};


const sharePost = async () => {
    try {
        if (navigator.share) {
            await navigator.share({
                title: post.value.author?.name,
                text: post.value.content,
                url: window.location.href,
            });
            toast({
                description: "Post shared successfully",
            });
        } else {
            await navigator.clipboard.writeText(window.location.href);
            toast({
                description: "Link copied to clipboard",
            });
        }
    } catch (err) {
        if (err.name !== "AbortError") {
            toast({
                title: "Error",
                description: "Failed to share post",
                variant: "destructive",
            });
        }
    }
};

const toggleContent = () => {
    showFullContent.value = !showFullContent.value;
};

const focusCommentInput = () => {
    document.querySelector(".comment-input")?.focus();
};

const closeMediaViewer = () => {
    showMediaViewer.value = false;
};

onMounted(fetchPost);
</script>
