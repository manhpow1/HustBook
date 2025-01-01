<template>
    <main class="container mx-auto px-4 py-8">
        <ErrorBoundary>
            <!-- Loading State -->
            <template v-if="loading">
                <PostSkeleton avatarSize="w-16 h-16" nameWidth="w-40" :contentLines="['w-full', 'w-4/5', 'w-3/5']"
                    :numberOfImages="2" imageHeight="h-64" buttonSize="w-24 h-10" commentBoxHeight="h-32" />
            </template>

            <!-- Error State -->
            <div v-else-if="error" class="text-red-500 text-center" role="alert">
                <AlertCircleIcon class="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
                <p>{{ error }}</p>
                <button @click="fetchPost"
                    class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
                    aria-label="Retry Fetching Post" data-testid="retry-fetch-post-button">
                    Retry
                </button>
            </div>

            <!-- Post Content -->
            <article v-else-if="post" class="bg-white shadow-lg rounded-lg overflow-hidden">
                <div class="p-6">
                    <!-- Post Header -->
                    <PostHeader :post="post" :isOwnPost="isOwnPost" @editPost="editPost" @deletePost="confirmDeletePost"
                        @reportPost="handleReportPost" @sharePost="sharePost" />

                    <!-- Post Content -->
                    <PostContent :post="post" :showFullContent="showFullContent" @toggleContent="toggleContent"
                        @hashtagClick="handleHashtagClick" />

                    <!-- Post Media -->
                    <PostMedia :post="post" @uncoverMedia="handleUncoverMedia" @like="handleLike"
                        @comment="focusCommentInput" />

                    <!-- Post Actions -->
                    <PostActions :post="post" :formattedLikes="formattedLikes" :formattedComments="formattedComments"
                        @like="handleLike" @comment="focusCommentInput" />

                    <!-- Ban Warning -->
                    <PostBanWarning v-if="post.banned !== '0'" :banStatus="post.banned" />

                    <!-- Comments Section (no Suspense) -->
                    <div v-if="post.canComment === '1'">
                        <!-- Loading comments UI -->
                        <div v-if="loadingComments" class="text-center py-8">
                            <svg class="animate-spin h-8 w-8 text-gray-500 mx-auto" xmlns="http://www.w3.org/2000/svg"
                                fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z">
                                </path>
                            </svg>
                            <p class="mt-2 text-gray-500">Loading comments...</p>
                        </div>

                        <!-- Actual comments when not loading -->
                        <CommentSection v-else :postId="post.id" :comments="comments" @addComment="handleComment"
                            @updateComment="handleCommentUpdate" @deleteComment="handleCommentDelete"
                            @loadMore="loadMoreComments" :loading="loadingMoreComments" :error="commentError"
                            @retry="retryLoadComments" />
                    </div>
                </div>
            </article>

            <!-- Media Viewer -->
            <MediaViewer v-if="showMediaViewer" :isOpen="showMediaViewer" :mediaList="mediaList"
                :initialIndex="currentMediaIndex" :likes="post.like" :comments="post.comment"
                :isLiked="post.isLiked === '1'" @close="closeMediaViewer" @like="handleLike" @comment="handleComment"
                data-testid="media-viewer" />

            <!-- Advanced Options Modal -->
            <AdvancedOptionsModal v-if="showAdvancedOptionsModal" :isOwnPost="isOwnPost" :post="post"
                @close="showAdvancedOptionsModal = false" @edit="editPost" @delete="confirmDeletePost"
                @toggleComments="toggleComments" @report="handleReportPost" @hide="hidePost" />

            <!-- Delete Post Confirmation -->
            <DeletePost v-if="showDeletePostModal" :postId="post.id" @post-deleted="handlePostDeleted"
                data-testid="delete-post-modal" />

            <!-- Report Post Modal -->
            <ReportPostModal v-if="showReportPostModal" :postId="post.id" @close="showReportPostModal = false"
                @report-submitted="handleReportSubmitted" @post-removed="handlePostRemoved" />
        </ErrorBoundary>
    </main>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePostStore } from '../../stores/postStore';
import { useUserStore } from '../../stores/userStore';
import { AlertCircleIcon } from 'lucide-vue-next';
import { formatNumber } from '../../utils/numberFormat';
import { useConfirmDialog } from '@vueuse/core';
import { useErrorHandler } from '@/utils/errorHandler';

// Asynchronously load components to reduce initial bundle size
const DeletePost = defineAsyncComponent(() => import('./DeletePost.vue'));
const PostSkeleton = defineAsyncComponent(() => import('../shared/PostSkeleton.vue'));
const ErrorBoundary = defineAsyncComponent(() => import('../shared/ErrorBoundary.vue'));
const PostHeader = defineAsyncComponent(() => import('./PostHeader.vue'));
const PostContent = defineAsyncComponent(() => import('./PostContent.vue'));
const PostMedia = defineAsyncComponent(() => import('./PostMedia.vue'));
const PostActions = defineAsyncComponent(() => import('./PostActions.vue'));
const PostBanWarning = defineAsyncComponent(() => import('./PostBanWarning.vue'));
const CommentSection = defineAsyncComponent(() => import('./CommentSection.vue'));
const MediaViewer = defineAsyncComponent(() => import('../shared/MediaViewer.vue'));
const AdvancedOptionsModal = defineAsyncComponent(() => import('./AdvancedOptionsModal.vue'));
const ReportPostModal = defineAsyncComponent(() => import('./ReportPostModal.vue'));

// Composables and utilities
const route = useRoute();
const router = useRouter();
const postStore = usePostStore();
const userStore = useUserStore();
const { confirm: confirmAction } = useConfirmDialog();
const { handleError } = useErrorHandler();

// Reactive state
const showMediaViewer = ref(false);
const currentMediaIndex = ref(0);
const showAdvancedOptionsModal = ref(false);
const showDeletePostModal = ref(false);
const showReportPostModal = ref(false);

// Computed properties
const post = computed(() => postStore.currentPost);
const comments = computed(() => postStore.comments);
const loading = computed(() => postStore.loading);
const error = computed(() => postStore.error);
const loadingMoreComments = computed(() => postStore.loadingMoreComments);
const commentError = computed(() => postStore.commentError);
const isOwnPost = computed(() => post.value?.author?.id === userStore.currentUser?.id);
const formattedLikes = computed(() => formatNumber(post.value?.like || 0));
const formattedComments = computed(() => formatNumber(post.value?.comment || 0));
const mediaList = computed(() => {
    let media = [];

    if (post.value?.image && post.value.image.length > 0) {
        media = post.value.image.slice(0, 4).map((img) => ({
            type: 'image',
            url: img.url,
            alt: post.value.described,
            covered: img.covered,
        }));
    }

    if (post.value?.video && post.value.video.length > 0) {
        media.push({
            type: 'video',
            url: post.value.video[0].url,
            covered: post.value.video[0].covered,
        });
    }

    return media;
});

// Methods

// Fetch the post data
const fetchPost = async () => {
    await postStore.fetchPost(route.params.id);
};

// Load more comments
const loadMoreComments = () => postStore.loadMoreComments(route.params.id);

// Retry loading comments in case of an error
const retryLoadComments = () => postStore.resetComments();

// Handle like action
const handleLike = async () => {
    try {
        await postStore.toggleLike(post.value.id);
    } catch (error) {
        console.error('Failed to like post:', error);
        await handleError(error);
    }
};

// Handle comment action
const handleComment = () => {
    focusCommentInput();
};

// Focus on the comment input field
const focusCommentInput = () => {
    nextTick(() => document.querySelector('.comment-input')?.focus());
};

// Open the media viewer (lightbox)
const openLightbox = (index) => {
    currentMediaIndex.value = index;
    showMediaViewer.value = true;
};

// Close the media viewer
const closeMediaViewer = () => {
    showMediaViewer.value = false;
};

// Toggle the visibility of the post content
const toggleContent = () => {
    // Implement logic to toggle content visibility, possibly using a ref
};

// Edit the post by navigating to the edit route
const editPost = () => {
    router.push({ name: 'EditPost', params: { id: post.value.id } });
    showAdvancedOptionsModal.value = false;
};

// Confirm deletion of the post with a confirmation dialog
const confirmDeletePost = async () => {
    const isConfirmed = await confirmAction('Are you sure you want to delete this post? This action cannot be undone.');
    if (isConfirmed) {
        showDeletePostModal.value = true;
    }
};

// Handle the actual deletion of the post
const deletePost = async () => {
    try {
        await postStore.removePost(post.value.id);
        toast({ type: 'success', message: 'Post deleted successfully.' });
        router.push({ name: 'Home' });
    } catch (error) {
        console.error('Error deleting post:', error);
        toast({ type: 'error', message: 'Failed to delete post. Please try again.' });
        await handleError(error);
    }
    showDeletePostModal.value = false;
};

// Handle reporting the post
const handleReportPost = () => {
    showReportPostModal.value = true;
    showAdvancedOptionsModal.value = false;
};

// Handle successful report submission
const handleReportSubmitted = () => {
    showReportPostModal.value = false;
    toast({ type: 'success', message: 'Report submitted successfully.' });
};

// Handle post removal (e.g., if the post no longer exists)
const handlePostRemoved = () => {
    router.push({ name: 'Home' });
};

// Handle successful post deletion
const handlePostDeleted = () => {
    router.push({ name: 'Home' });
};

// Handle sharing the post
const sharePost = () => {
    // Implement sharing functionality, e.g., using the Web Share API
    if (navigator.share) {
        navigator.share({
            title: post.value.author.name,
            text: post.value.described,
            url: window.location.href,
        }).then(() => {
            toast({ type: 'success', message: 'Post shared successfully.' });
        }).catch((error) => {
            console.error('Error sharing post:', error);
            toast({ type: 'error', message: 'Failed to share post.' });
        });
    } else {
        // Fallback for browsers that do not support the Web Share API
        toast({ type: 'info', message: 'Sharing is not supported in your browser.' });
    }
};
</script>

<style scoped>
.font-roboto {
    font-family: 'Roboto', sans-serif;
}

@media (min-width: 640px) {
    .container {
        max-width: 640px;
    }
}

@media (min-width: 768px) {
    .container {
        max-width: 768px;
    }
}

@media (min-width: 1024px) {
    .container {
        max-width: 1024px;
    }
}

@media (min-width: 1280px) {
    .container {
        max-width: 1280px;
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>