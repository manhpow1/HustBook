import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '../services/api';
import { formatNumber } from '../utils/numberFormat';
import { handleError } from '../utils/errorHandler';
import inappropriateWords from '../words/inappropriateWords';
import router from '../router';

export const usePostStore = defineStore('post', () => {
    const posts = ref([]);
    const currentPost = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const comments = ref([]);
    const loadingComments = ref(false);
    const commentError = ref(null);
    const hasMoreComments = ref(true);
    const pageIndex = ref(0);
    const hasMorePosts = ref(true);
    const lastVisible = ref(null);
    const lastKnownCoordinates = ref(null);

    const formattedLikes = computed(() => formatNumber(currentPost.value?.likes || 0));
    const formattedComments = computed(() => formatNumber(currentPost.value?.comments || 0));

    // Fetch Posts
    async function fetchPosts(params = {}) {
        if (!hasMorePosts.value) {
            console.log("No more posts to load.");
            return;
        }

        loading.value = true;
        error.value = null;

        try {
            const response = await apiService.getListPosts({
                ...params,
                lastVisible: lastVisible.value,
                limit: 10,
            });

            const data = response.data;

            if (data.code === '1000') {
                const newPosts = data.data.posts
                    .map(validateAndProcessPost)
                    .filter((post) => post !== null);

                posts.value.push(...newPosts);
                lastVisible.value = data.data.lastVisible;
                hasMorePosts.value = newPosts.length === 10;
            } else if (data.code === '9994') {
                hasMorePosts.value = false;
            } else {
                throw new Error(data.message || 'Failed to load posts');
            }
        } catch (err) {
            await handleError(err, router);
            error.value = err.message || 'Failed to load posts';
        } finally {
            loading.value = false;
        }
    }

    // Fetch Single Post
    async function fetchPost(postId) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.getPost(postId);
            const data = response.data;

            if (data.code === '1000') {
                currentPost.value = data.data;
            } else {
                throw new Error(data.message || 'Failed to load post');
            }
        } catch (err) {
            await handleError(err, router);
            error.value = err.message || 'Failed to load post';
        } finally {
            loading.value = false;
        }
    }

    // Create Post
    async function createPost(postData) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.createPost(postData);
            const data = response.data;

            if (data.code === '1000') {
                posts.value.unshift(data.data);
                return data;
            } else {
                throw new Error(data.message || 'Failed to create post');
            }
        } catch (err) {
            await handleError(err, router);
            error.value = err.message || 'Failed to create post';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // Update Post
    async function updatePost(postId, postData) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.updatePost(postId, postData);
            const data = response.data;

            if (data.code === '1000') {
                const index = posts.value.findIndex((post) => post.id === postId);
                if (index !== -1) {
                    posts.value[index] = { ...posts.value[index], ...postData };
                }
                if (currentPost.value && currentPost.value.id === postId) {
                    currentPost.value = { ...currentPost.value, ...postData };
                }
                return data;
            } else {
                throw new Error(data.message || 'Failed to update post');
            }
        } catch (err) {
            await handleError(err, router);
            error.value = err.message || 'Failed to update post';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // Toggle Like
    async function toggleLike(postId) {
        try {
            const post = posts.value.find(p => p.id === postId);
            const isLiked = post?.isLiked === '1';

            // Optimistic UI update
            if (post) {
                post.isLiked = isLiked ? '0' : '1';
                post.likes += isLiked ? -1 : 1;
            }
            if (currentPost.value && currentPost.value.id === postId) {
                currentPost.value.isLiked = isLiked ? '0' : '1';
                currentPost.value.likes += isLiked ? -1 : 1;
            }

            // Call the like API
            await apiService.likePost(postId);
        } catch (err) {
            await handleError(err, router);

            // Revert the UI update on failure
            const post = posts.value.find(p => p.id === postId);
            if (post) {
                const isLiked = post.isLiked === '1';
                post.isLiked = isLiked ? '0' : '1';
                post.likes += isLiked ? -1 : 1;
            }
            if (currentPost.value && currentPost.value.id === postId) {
                const isLiked = currentPost.value.isLiked === '1';
                currentPost.value.isLiked = isLiked ? '0' : '1';
                currentPost.value.likes += isLiked ? -1 : 1;
            }
        }
    }

    // Fetch Comments
    async function fetchComments(postId, limit = 10) {
        if (!hasMoreComments.value) return;

        loadingComments.value = true;
        commentError.value = null;

        try {
            const response = await apiService.getComments(postId, {
                limit,
                lastVisible: lastVisible.value, // Assuming server uses lastVisible for pagination
            });

            const data = response.data;

            if (data.code === '1000') {
                const newComments = data.data.comments;
                comments.value.push(...newComments);
                hasMoreComments.value = newComments.length === limit;
            } else if (data.code === '9994') {
                hasMoreComments.value = false;
            } else {
                throw new Error(data.message || 'Failed to load comments');
            }
        } catch (error) {
            commentError.value = error.message;
            await handleError(error, router);
        } finally {
            loadingComments.value = false;
        }
    }

    // Add Comment
    async function addComment(postId, content) {
        try {
            const response = await apiService.addComment(postId, content);
            const data = response.data;

            if (data.code === '1000') {
                comments.value.unshift(data.data);
                if (currentPost.value && currentPost.value.id === postId) {
                    currentPost.value.comments++;
                }
            } else {
                throw new Error(data.message || 'Failed to add comment');
            }
        } catch (err) {
            console.error('Error adding comment:', err);
            throw err;
        }
    }

    // Remove Post
    async function removePost(postId) {
        try {
            const response = await apiService.deletePost(postId);
            const data = response.data;

            if (data.code === '1000') {
                const index = posts.value.findIndex(post => post.id === postId);
                if (index !== -1) {
                    posts.value.splice(index, 1);
                }
                if (currentPost.value && currentPost.value.id === postId) {
                    currentPost.value = null;
                }
            } else {
                throw new Error(data.message || 'Failed to remove post');
            }
        } catch (err) {
            console.error('Error removing post:', err);
            error.value = 'Failed to remove post';
            throw err;
        }
    }

    // Reset Comments
    function resetComments() {
        comments.value = [];
        hasMoreComments.value = true;
    }

    // Reset Posts
    function resetPosts() {
        posts.value = [];
        lastVisible.value = null;
        hasMorePosts.value = true;
    }

    // Set Last Known Coordinates
    function setLastKnownCoordinates(coordinates) {
        lastKnownCoordinates.value = coordinates;
    }

    // Validate and Process Post
    function validateAndProcessPost(post) {
        // Ensure the post has either content or media
        const hasContent = typeof post.content === 'string' && post.content.trim() !== '';
        const hasMedia = (Array.isArray(post.images) && post.images.length > 0) ||
            (typeof post.video === 'string' && post.video.trim() !== '');

        if (!hasContent && !hasMedia) return null;

        // Ensure the post has a valid author
        if (!post.userId || !post.author || !post.author.id) return null;

        // Ensure 'likes' and 'comments' fields are non-negative integers
        post.likes = Number.isInteger(post.likes) && post.likes >= 0 ? post.likes : 0;
        post.comments = Number.isInteger(post.comments) && post.comments >= 0 ? post.comments : 0;

        // Validate inappropriate content
        if (containsInappropriateContent(post.content)) return null;

        return post;
    }

    // Check for Inappropriate Content
    function containsInappropriateContent(text) {
        if (!text) return false;
        const lowerCaseText = text.toLowerCase();
        return inappropriateWords.some((word) => lowerCaseText.includes(word.toLowerCase()));
    }

    // Validate Coordinate
    function isValidCoordinate(coord) {
        return typeof coord === 'number' && !isNaN(coord);
    }

    return {
        posts,
        currentPost,
        loading,
        error,
        comments,
        loadingComments,
        commentError,
        hasMorePosts,
        hasMoreComments,
        formattedLikes,
        formattedComments,
        resetPosts,
        resetComments,
        fetchPosts,
        fetchPost,
        createPost,
        toggleLike,
        fetchComments,
        updatePost,
        addComment,
        removePost,
        setLastKnownCoordinates,
        validateAndProcessPost,
        containsInappropriateContent,
        isValidCoordinate,
    };
});