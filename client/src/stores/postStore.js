import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService from '../services/api'
import { formatNumber } from '../utils/numberFormat'
import { handleError } from '../utils/errorHandler'
import { useUserStore } from './userStore'
import inappropriateWords from '../i18n/inappropriateWords'

export const usePostStore = defineStore('post', () => {
    const posts = ref([])
    const currentPost = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const comments = ref([])
    const loadingComments = ref(false)
    const commentError = ref(null)
    const hasMoreComments = ref(true)
    const pageIndex = ref(0)
    const hasMorePosts = ref(true)
    const lastId = ref(null)
    const lastKnownCoordinates = ref(null);
    const userStore = useUserStore();

    const formattedLikes = computed(() => formatNumber(currentPost.value?.likes || 0));
    const formattedComments = computed(() => formatNumber(currentPost.value?.comment || 0));

    async function fetchPosts(params = {}, router) {
        console.debug("Initial isLoggedIn state before fetchPosts:", userStore.isLoggedIn);
        if (!hasMorePosts.value) {
            console.log("No more posts to load.");
            return;
        }

        console.log("Fetching posts with parameters:", params);
        loading.value = true;
        error.value = null;
        let latitude = params.latitude;
        let longitude = params.longitude;
        if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
            if (lastKnownCoordinates.value) {
                latitude = lastKnownCoordinates.value.latitude;
                longitude = lastKnownCoordinates.value.longitude;
                console.log("Invalid coordinates detected. Using last known coordinates:", lastKnownCoordinates.value);
            }
        }
        try {
            const response = await apiService.getListPosts({
                ...params,
                latitude,    // Updated latitude
                longitude,   // Updated longitude
                last_id: lastId.value,
                index: posts.value.length,
                count: 10,
            });
            console.log("Fetch posts raw response:", response);  // Log full response here
            console.log("Fetch posts response data:", response.data);  // Log response.data specifically

            if (response.data.code === '1000') {
                const newPosts = response.data.data.posts
                    .map(validateAndProcessPost)
                    .filter((post) => post !== null);
                posts.value.push(...newPosts);
                lastId.value = response.data.data.last_id;
                hasMorePosts.value = newPosts.length === 10;
            } else if (response.data.code === '9994') {
                hasMorePosts.value = false;
            } else {
                throw new Error(response.data.message || 'Failed to load posts');
            }
        } catch (err) {
            await handleError(err, router);
            error.value = err.message || 'Failed to load posts';
        } finally {
            loading.value = false;
        }
    }

    async function fetchPost(postId, router) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.getPost(postId);
            if (response.data.code === '1000') {
                currentPost.value = response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to load post');
            }
        } catch (err) {
            await handleError(err, router);
            error.value = err.message || 'Failed to load post';
        } finally {
            loading.value = false;
        }
    }

    async function createPost(postData, router) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.createPost(postData);
            if (response.data.code === '1000') {
                posts.value.unshift(response.data.data);
                return response.data;
            } else {
                throw new Error(response.data.message || 'Failed to create post');
            }
        } catch (err) {
            await handleError(err, router);
            error.value = err.message || 'Failed to create post';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updatePost(postId, postData, router) {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.updatePost(postId, postData);
            if (response.data.code === '1000') {
                const index = posts.value.findIndex((post) => post.id === postId);
                if (index !== -1) {
                    posts.value[index] = { ...posts.value[index], ...postData };
                }
                if (currentPost.value && currentPost.value.id === postId) {
                    currentPost.value = { ...currentPost.value, ...postData };
                }
                return response.data;
            } else {
                throw new Error(response.data.message || 'Failed to update post');
            }
        } catch (err) {
            await handleError(err, router);
            error.value = err.message || 'Failed to update post';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function toggleLike(postId, router) {
        console.log(`Toggling like for post ID: ${postId}`);
        try {
            const post = posts.value.find(p => p.id === postId);
            const isLiked = post?.is_liked === '1';

            console.log(`Initial like state for post ID ${postId}:`, isLiked);

            // Optimistic UI update
            if (post) {
                post.is_liked = isLiked ? '0' : '1';
                post.likes += isLiked ? -1 : 1;
            }
            if (currentPost.value && currentPost.value.id === postId) {
                currentPost.value.is_liked = isLiked ? '0' : '1';
                currentPost.value.likes += isLiked ? -1 : 1;
            }

            // Call the like API
            await apiService.likePost(postId);
            console.log(`Like toggled successfully for post ID: ${postId}`);
        } catch (err) {
            console.error("Error toggling like:", err);
            await handleError(err, router);

            // Revert the UI update on failure
            const post = posts.value.find(p => p.id === postId);
            if (post) {
                const isLiked = post.is_liked === '1';
                post.is_liked = isLiked ? '0' : '1';
                post.likes += isLiked ? -1 : 1;
                console.log("Reverted like state due to error:", post);
            }
            if (currentPost.value && currentPost.value.id === postId) {
                const isLiked = currentPost.value.is_liked === '1';
                currentPost.value.is_liked = isLiked ? '0' : '1';
                currentPost.value.likes += isLiked ? -1 : 1;
            }
        }
    }

    async function fetchComments(postId, count = 10) {
        try {
            loadingComments.value = true;
            const response = await apiService.getComments(postId, {
                id: postId,
                index: pageIndex.value,
                count
            });

            if (response.data.code === '1000') {
                const newComments = response.data.data;
                if (newComments.length < count) {
                    hasMoreComments.value = false; // No more comments to load
                }
                comments.value.push(...newComments); // Append new comments
                pageIndex.value += 1;
            } else {
                throw new Error(response.data.message || 'Failed to load comments');
            }
        } catch (error) {
            commentError.value = error.message;
            await handleError(error, router);
        } finally {
            loadingComments.value = false;
        }
    }

    async function addComment(postId, content) {
        try {
            const response = await apiService.addComment(postId, content)
            comments.value.unshift(response.data.data)
            if (currentPost.value && currentPost.value.id === postId) {
                currentPost.value.comment++
            }
        } catch (err) {
            console.error('Error adding comment:', err)
            throw err
        }
    }

    async function fetchPostsByHashtag(hashtag, loadMore = false) {
        if (!loadMore) {
            loading.value = true
            posts.value = []
        }
        error.value = null
        try {
            const response = await apiService.get(`/posts/hashtag/${hashtag}`, {
                params: { page: loadMore ? posts.value.length / 10 + 1 : 1 }
            })
            posts.value = loadMore ? [...posts.value, ...response.data.data] : response.data.data
            hasMorePosts.value = response.data.data.length === 10
        } catch (err) {
            console.error('Error fetching posts by hashtag:', err)
            error.value = 'Failed to load posts'
        } finally {
            loading.value = false
        }
    }

    async function removePost(postId) {
        try {
            await apiService.deletePost(postId)
            const index = posts.value.findIndex(post => post.id === postId)
            if (index !== -1) {
                posts.value.splice(index, 1)
            }
            if (currentPost.value && currentPost.value.id === postId) {
                currentPost.value = null
            }
        } catch (err) {
            console.error('Error removing post:', err)
            error.value = 'Failed to remove post'
            throw err
        }
    }

    function resetComments() {
        comments.value = [];
        pageIndex.value = 0;
        hasMoreComments.value = true;
    }

    function resetPosts() {
        posts.value = []
        lastId.value = null
        hasMorePosts.value = true
    }

    function setLastKnownCoordinates(coordinates) {
        lastKnownCoordinates.value = coordinates;
    }

    function validateAndProcessPost(post) {
        // Ensure the post has either content or media
        const hasContent = typeof post.content === 'string' && post.content.trim() !== '';
        const hasMedia = (Array.isArray(post.image) && post.image.length > 0) ||
            (typeof post.video === 'string' && post.video.trim() !== '');

        if (!hasContent && !hasMedia) return null;

        // Ensure the post has a valid author
        if (!post.userId || !post.author || !post.author.id) return null;

        // Ensure 'like' and 'comment' fields are non-negative integers
        post.like = Number.isInteger(post.like) && post.like >= 0 ? post.like : 0;
        post.comment = Number.isInteger(post.comment) && post.comment >= 0 ? post.comment : 0;

        // Ensure 'is_liked' and 'can_comment' are '0' or '1' as strings
        post.is_liked = post.is_liked === '1' ? '1' : '0';
        post.can_comment = post.can_comment === '1' ? '1' : '0';

        // Validate inappropriate content
        if (containsInappropriateContent(post.content)) return null;

        return post;
    }

    function containsInappropriateContent(text) {
        if (!text) return false;
        const lowerCaseText = text.toLowerCase();
        return inappropriateWords.some((word) => lowerCaseText.includes(word.toLowerCase()));
    }

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
        pageIndex,
        resetPosts,
        resetComments,
        fetchPosts,
        fetchPost,
        createPost,
        toggleLike,
        fetchComments,
        updatePost,
        addComment,
        fetchPostsByHashtag,
        removePost,
        setLastKnownCoordinates,
        validateAndProcessPost,
        containsInappropriateContent,
    }
})