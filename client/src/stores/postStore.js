import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '../services/api';
import { formatNumber } from '../utils/numberFormat';
import { useErrorHandler } from '@/utils/errorHandler';
import { useImageProcessing } from '@/composables/useImageProcessing';
import inappropriateWords from '../words/inappropriateWords';

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
    const { handleError } = useErrorHandler();

    const formattedLikes = computed(() => formatNumber(currentPost.value?.likes || 0));
    const formattedComments = computed(() => formatNumber(currentPost.value?.comments || 0));

    // Fetch Posts
    async function fetchPosts(params = {}) {
        if (!hasMorePosts.value && !params.reset) return;

        loading.value = true;
        error.value = null;

        try {
            if (params.reset) {
                posts.value = [];
                lastVisible.value = null;
                hasMorePosts.value = true;
            }

            const response = await apiService.getListPosts({
                ...params,
                lastVisible: lastVisible.value,
                limit: 20
            });

            if (response.data.code === '1000') {
                const newPosts = response.data.data.posts
                    .map(validateAndProcessPost)
                    .filter(Boolean);

                if (params.reset) {
                    posts.value = newPosts;
                    hasMorePosts.value = true;
                } else {
                    posts.value.push(...newPosts);
                }

                lastVisible.value = response.data.data.lastVisible;
                hasMorePosts.value = newPosts.length === 20;
            } else {
                hasMorePosts.value = false;
                if (response.data.code !== '9994') {
                    throw new Error(response.data.message || 'Failed to fetch posts');
                }
            }
        } catch (err) {
            await handleError(err);
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // Fetch Single Post
    async function fetchPost(postId) {
        loading.value = true;
        try {
            const response = await apiService.getPost(postId);
            if (response.data.code === '1000') {
                currentPost.value = validateAndProcessPost(response.data.data);
                return response.data;
            }
            throw new Error(response.data.message);
        } catch (err) {
            await handleError(err);
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function getUserPosts(userId) {
        if (!hasMorePosts.value) return;

        loading.value = true;
        try {
            const response = await apiService.getUserPosts(userId, {
                lastVisible: lastVisible.value,
                limit: 10
            });

            if (response.data.code === '1000') {
                const newPosts = response.data.data.posts
                    .map(validateAndProcessPost)
                    .filter(Boolean);

                posts.value.push(...newPosts);
                lastVisible.value = response.data.data.lastVisible;
                hasMorePosts.value = newPosts.length === 10;
            } else if (response.data.code === '9994') {
                hasMorePosts.value = false;
            } else {
                throw new Error(response.data.message);
            }
        } catch (err) {
            await handleError(err);
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // Create Post
    async function createPost(postData) {
        loading.value = true;
        error.value = null
        try {
            if (postData.images?.length) {
                const processedImages = await Promise.all(
                    postData.images.map(img => useImageProcessing().compressImage(img))
                );
                postData.images = processedImages.filter(Boolean);
            }

            const response = await apiService.createPost(postData)
            const data = response.data

            if (data.code === '1000') {
                const newPost = validateAndProcessPost(data.data)
                if (newPost) {
                    posts.value.unshift(newPost)
                }
                return data
            } else {
                throw new Error(data.message || 'Failed to create post')
            }
        } catch (err) {
            await handleError(err)
            error.value = err.message || 'Failed to create post'
            throw err
        } finally {
            loading.value = false
        }
    }

    // Update Post
    async function updatePost(postId, postData) {
        loading.value = true;
        try {
            if (postData.images?.length) {
                const processedImages = await Promise.all(
                    postData.images.map(img => useImageProcessing().compressImage(img))
                );
                postData.images = processedImages.filter(Boolean);
            }

            const response = await apiService.updatePost(postId, postData);
            if (response.data.code === '1000') {
                const updatedPost = validateAndProcessPost(response.data.data);
                const index = posts.value.findIndex(p => p.postId === postId);
                if (index !== -1) posts.value[index] = updatedPost;
                if (currentPost.value?.postId === postId) currentPost.value = updatedPost;
                return response.data;
            }
            throw new Error(response.data.message);
        } catch (err) {
            await handleError(err);
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // Toggle Like
    async function toggleLike(postId) {
        try {
            const post = posts.value.find(p => p.postId === postId);
            const isLiked = post?.isLiked === '1';

            if (post) {
                post.isLiked = isLiked ? '0' : '1';
                post.likes += isLiked ? -1 : 1;
            }

            if (currentPost.value?.postId === postId) {
                currentPost.value.isLiked = isLiked ? '0' : '1';
                currentPost.value.likes += isLiked ? -1 : 1;
            }

            await apiService.likePost(postId);
        } catch (err) {
            await handleError(err);
            const post = posts.value.find(p => p.postId === postId);
            if (post) {
                post.isLiked = post.isLiked === '1' ? '0' : '1';
                post.likes += post.isLiked === '1' ? 1 : -1;
            }
            if (currentPost.value?.postId === postId) {
                currentPost.value.isLiked = currentPost.value.isLiked === '1' ? '0' : '1';
                currentPost.value.likes += currentPost.value.isLiked === '1' ? 1 : -1;
            }
            throw err;
        }
    }

    // Fetch Comments
    async function fetchComments(postId) {
        if (!hasMoreComments.value) return;

        loadingComments.value = true;
        try {
            const response = await apiService.getComments(postId, {
                lastVisible: lastVisible.value,
                limit: 10
            });

            if (response.data.code === '1000') {
                comments.value.push(...response.data.data.comments);
                lastVisible.value = response.data.data.lastVisible;
                hasMoreComments.value = response.data.data.comments.length === 10;
            } else if (response.data.code === '9994') {
                hasMoreComments.value = false;
            } else {
                throw new Error(response.data.message);
            }
        } catch (err) {
            await handleError(err);
            commentError.value = err.message;
            throw err;
        } finally {
            loadingComments.value = false;
        }
    }

    // Add Comment
    async function addComment(postId, content) {
        try {
            const response = await apiService.addComment(postId, content);
            if (response.data.code === '1000') {
                comments.value.unshift(response.data.data);
                if (currentPost.value?.postId === postId) {
                    currentPost.value.comments++;
                }
                return response.data;
            }
            throw new Error(response.data.message);
        } catch (err) {
            await handleError(err);
            throw err;
        }
    }

    // Remove Post
    async function removePost(postId) {
        try {
            const response = await apiService.deletePost(postId);
            if (response.data.code === '1000') {
                posts.value = posts.value.filter(p => p.postId !== postId);
                if (currentPost.value?.postId === postId) currentPost.value = null;
            } else {
                throw new Error(response.data.message);
            }
        } catch (err) {
            await handleError(err);
            error.value = err.message;
            throw err;
        }
    }

    // Reset Comments
    function resetComments() {
        comments.value = [];
        lastVisible.value = null;
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
        if (!post) return null;

        try {
            // Ensure the post has either content or media
            const hasContent = typeof post.content === 'string' && post.content.trim() !== '';
            const hasMedia = (Array.isArray(post.images) && post.images.length > 0) ||
                (typeof post.video === 'string' && post.video?.trim() !== '');

            if (!hasContent && !hasMedia) return null;

            // Ensure the post has a valid author
            if (!post.userId || !post.author || !post.author.userId) return null;

            // Process and validate URLs
            if (Array.isArray(post.images)) {
                post.images = post.images
                    .filter(url => url && typeof url === 'string')
                    .map(url => {
                        try {
                            return url.trim();
                        } catch (e) {
                            console.warn('Invalid image URL:', url);
                            return '';
                        }
                    })
                    .filter(url => url !== '');
            } else {
                post.images = [];
            }
            
            if (post.video) {
                try {
                    post.video = typeof post.video === 'string' ? post.video.trim() : null;
                } catch (e) {
                    console.warn('Invalid video URL:', post.video);
                    post.video = null;
                }
            }
            
            if (post.author) {
                try {
                    post.author.avatar = typeof post.author.avatar === 'string' ? 
                        post.author.avatar.trim() : '';
                } catch (e) {
                    console.warn('Invalid avatar URL:', post.author.avatar);
                    post.author.avatar = '';
                }
            }

            // Ensure 'likes' and 'comments' fields are non-negative integers
            post.likes = Number.isInteger(post.likes) && post.likes >= 0 ? post.likes : 0;
            post.comments = Number.isInteger(post.comments) && post.comments >= 0 ? post.comments : 0;

            // Validate inappropriate content
            if (containsInappropriateContent(post.content)) return null;

            return post;
        } catch (err) {
            console.error('Error validating post:', err);
            return null;
        }
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
        getUserPosts,
    };
});
