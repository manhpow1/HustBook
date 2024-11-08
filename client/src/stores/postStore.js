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

    const formattedLikes = computed(() => {
        const likes = currentPost.value?.likes || 0
        return formatNumber(Math.max(likes, 0)) // Ensure no negative values
    })
    const formattedComments = computed(() => formatNumber(currentPost.value?.comment || 0))

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
                const newPostsRaw = response.data.data.posts || [];
                const newPosts = [];
                for (const post of newPostsRaw) {
                    const processedPost = validateAndProcessPost(post);
                    if (processedPost) {
                        newPosts.push(processedPost);
                    }
                }
                posts.value.push(...newPosts);
                lastId.value = response.data.data.last_id;
                hasMorePosts.value = newPosts.length === 10;
                console.debug("isLoggedIn state after successful fetchPosts:", userStore.isLoggedIn);
                console.log("Posts updated:", posts.value);
            } else if (response.data.code === '9994') {
                console.log("No more posts to load.");
                hasMorePosts.value = false;
            }
            else {
                throw new Error(response.data.message || 'Failed to load posts');
            }
        } catch (err) {
            console.error("Error fetching posts:", err);
            await handleError(err, router);
            console.debug("User value directly after handleError:", userStore.user);
            error.value = 'Failed to load posts';
            if (err.message === 'Network Error') {
                error.value = 'Cannot connect to the Internet.';
            } else if (err.response && err.response.data && err.response.data.message) {
                error.value = err.response.data.message;
            } else if (err.message) {
                error.value = err.message;
            } else {
                error.value = 'An error occurred.';
            }
        } finally {
            loading.value = false;
            console.log("Loading state:", loading.value);
        }
    }

    async function fetchPost(postId) {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.getPost(postId)
            currentPost.value = response.data.data
        } catch (err) {
            console.error('Error fetching post:', err)
            error.value = 'Failed to load post'
        } finally {
            loading.value = false
        }
    }

    async function createPost(postData) {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.createPost(postData)
            posts.value.unshift(response.data.data)
            return response.data
        } catch (err) {
            console.error('Error creating post:', err)
            error.value = 'Failed to create post'
            throw err
        } finally {
            loading.value = false
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

        if (!hasContent && !hasMedia) {
            // If the post has neither content nor media, exclude it
            return null;
        }

        // Ensure the post has a valid author
        if (!post.userId || !post.author || !post.author.id) {
            // If 'userId' or 'author.id' is missing, exclude the post
            return null;
        }

        // Ensure 'like' field is a non-negative integer
        post.like = Number.isInteger(post.like) && post.like >= 0 ? post.like : 0;
        // Ensure 'comment' field is a non-negative integer
        post.comment = Number.isInteger(post.comment) && post.comment >= 0 ? post.comment : 0;
        // Ensure 'is_liked' is '0' or '1' as strings
        post.is_liked = post.is_liked === '1' ? '1' : '0';
        // Ensure 'can_comment' is '0' or '1' as strings
        post.can_comment = post.can_comment === '1' ? '1' : '0';
        // Ensure 'in_campaign' is '0' or '1' as strings
        if (post.in_campaign !== '0' && post.in_campaign !== '1') {
            post.in_campaign = '0';
        }
        // If 'in_campaign' is '1', ensure 'campaign_id' is a non-empty string
        if (post.in_campaign === '1') {
            post.campaign_id = typeof post.campaign_id === 'string' && post.campaign_id.trim() !== '' ? post.campaign_id : '';
        }
        if (!post || (!post.content && (!post.image || !post.video))) {
            console.debug('Excluding post due to missing content or media:', post);
            return null;
        }
        if (containsInappropriateContent(post.content)) {
            // Exclude the post if it contains inappropriate content
            return null;
        }
        // Return the validated and processed post
        console.debug('Processed and validated post:', post);
        return post;
    }

    function containsInappropriateContent(text) {
        if (!text) return false;
        const lowerCaseText = text.toLowerCase();

        // Check if any inappropriate word is present in the text
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
        addComment,
        fetchPostsByHashtag,
        removePost,
        setLastKnownCoordinates,
        validateAndProcessPost,
        containsInappropriateContent,
    }
})