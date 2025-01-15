import { defineStore } from "pinia";
import { ref, computed } from "vue";
import apiService from "../services/api";
import { useUserStore } from "./userStore";
import { formatNumber } from "../utils/numberFormat";
import { useErrorHandler } from "@/utils/errorHandler";
import { useImageProcessing } from "@/composables/useImageProcessing";
import inappropriateWords from "../words/inappropriateWords";
import logger from "@/services/logging";

export const usePostStore = defineStore("post", () => {
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

    const formattedLikes = computed(() =>
        formatNumber(currentPost.value?.likes || 0)
    );
    const formattedComments = computed(() =>
        formatNumber(currentPost.value?.comments || 0)
    );

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

            const queryParams = {
                lastVisible: lastVisible.value,
                limit: params.limit || 20
            };

            if (params.userId) {
                const response = await apiService.getUserPosts(params.userId, queryParams);
                if (response.data.code === "1000") {
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
                    hasMorePosts.value = newPosts.length === (params.limit || 20);
                } else {
                    hasMorePosts.value = false;
                    if (response.data.code !== "9994") {
                        throw new Error(response.data.message || "Failed to fetch posts");
                    }
                }
            } else {
                const response = await apiService.getListPosts(queryParams);
                if (response.data.code === "1000") {
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
                    hasMorePosts.value = newPosts.length === (params.limit || 20);
                } else {
                    hasMorePosts.value = false;
                    if (response.data.code !== "9994") {
                        throw new Error(response.data.message || "Failed to fetch posts");
                    }
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
            if (response.data.code === "1000") {
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
                limit: 10,
            });

            if (response.data.code === "1000") {
                const newPosts = response.data.data.posts
                    .map(validateAndProcessPost)
                    .filter(Boolean);

                posts.value.push(...newPosts);
                lastVisible.value = response.data.data.lastVisible;
                hasMorePosts.value = newPosts.length === 10;
            } else if (response.data.code === "9994") {
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
    async function createPost(postData, config) {
        loading.value = true;
        error.value = null;
        try {
            if (postData.images?.length) {
                const processedImages = await Promise.all(
                    postData.images.map((img) => useImageProcessing().compressImage(img))
                );
                postData.images = processedImages.filter(Boolean);
            }

            // Validate post data
            const content = postData.get('content');
            const images = postData.getAll('images');

            const hasContent = content?.trim()?.length > 0;
            const hasImages = images?.length > 0;

            if (!hasContent && !hasImages) {
                throw new Error("Post must have either text content or images");
            }

            if (images?.length > 4) {
                throw new Error("Maximum 4 images allowed");
            }

            const contentWords = content.trim().toLowerCase().split(/\s+/);

            const formData = new FormData();
            formData.append("content", content);

            contentWords.forEach(word => {
                formData.append("contentLowerCase[]", word);
            });

            if (images?.length) {
                images.forEach((image, index) => {
                    formData.append("images", image);
                });
            }

            const response = await apiService.createPost(formData, config);

            if (response.data.code === "1000") {
                const newPost = validateAndProcessPost(response.data.data);
                if (newPost) {
                    posts.value.unshift(newPost);
                }
                return response.data.data;
            }

            throw new Error(response.data.message || "Failed to create post");
        } catch (err) {
            await handleError(err);
            error.value = err.message || "Failed to create post";
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updatePost(postId, formData) {
        if (!postId) {
            logger.error('Invalid postId provided:', postId);
            throw new Error('Invalid postId');
        }

        if (!(formData instanceof FormData)) {
            logger.error('Invalid form data provided:', typeof formData);
            throw new Error('Invalid form data');
        }

        loading.value = true;
        error.value = null;

        try {
            // Kiểm tra và log nội dung form data
            const content = formData.get('content');
            const images = formData.getAll('images');
            const existingImages = formData.get('existingImages');

            logger.debug('Validating form data:', {
                postId,
                content: content?.substring(0, 50),
                contentLength: content?.length,
                newImagesCount: images?.length,
                hasExistingImages: !!existingImages
            });

            // Validate content
            if (!content || content === 'undefined' || content.trim().length === 0) {
                if (!images.length && !existingImages) {
                    throw new Error('Post must have either content or images');
                }
            }

            // Validate tổng số ảnh
            const totalImages = (images?.length || 0) +
                (existingImages ? JSON.parse(existingImages).length : 0);

            if (totalImages > 4) {
                throw new Error('Maximum 4 images allowed');
            }

            const response = await apiService.updatePost(postId, formData);

            if (response?.data?.code === "1000") {
                const postData = response.data.data;

                if (!postData || typeof postData !== 'object') {
                    throw new Error('Invalid response format from server');
                }

                const updatedPost = validateAndProcessPost(postData);
                if (!updatedPost) {
                    throw new Error('Post validation failed');
                }

                const index = posts.value.findIndex(p => p?.postId === postId);
                if (index !== -1) {
                    posts.value[index] = updatedPost;
                }

                if (currentPost.value?.postId === postId) {
                    currentPost.value = updatedPost;
                }

                logger.debug('Post updated successfully:', {
                    postId,
                    contentLength: updatedPost.content?.length,
                    imagesCount: updatedPost.images?.length
                });

                return response.data;
            }

            throw new Error(response?.data?.message || 'Update failed');

        } catch (err) {
            logger.error('Update post failed:', {
                error: err.message,
                postId
            });
            error.value = err.message;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // Toggle Like
    async function toggleLike(postId) {
        const post = posts.value.find((p) => p.postId === postId);
        const currentPostMatch = currentPost.value?.postId === postId ? currentPost.value : null;
        
        // Store original state for rollback
        const originalState = {
            post: post ? { isLiked: post.isLiked, likes: post.likes } : null,
            currentPost: currentPostMatch ? { isLiked: currentPostMatch.isLiked, likes: currentPostMatch.likes } : null
        };

        try {
            const response = await apiService.likePost(postId);
            
            if (response.data.code === "1000") {
                const { liked, likeCount } = response.data.data;
                
                if (post) {
                    post.isLiked = liked ? "1" : "0";
                    post.likes = likeCount;
                }

                if (currentPostMatch) {
                    currentPostMatch.isLiked = liked ? "1" : "0";
                    currentPostMatch.likes = likeCount;
                }
            } else {
                throw new Error(response.data.message || "Failed to toggle like");
            }
        } catch (err) {
            // Rollback to original state on error
            if (originalState.post && post) {
                post.isLiked = originalState.post.isLiked;
                post.likes = originalState.post.likes;
            }
            if (originalState.currentPost && currentPostMatch) {
                currentPostMatch.isLiked = originalState.currentPost.isLiked;
                currentPostMatch.likes = originalState.currentPost.likes;
            }
            
            await handleError(err);
            throw err;
        }
    }

    // Remove Post
    async function removePost(postId) {
        try {
            const response = await apiService.deletePost(postId);
            if (response.data.code === "1000") {
                posts.value = posts.value.filter((p) => p.postId !== postId);
                if (currentPost.value?.postId === postId) currentPost.value = null;
                return response.data;
            } else {
                throw new Error(response.data.message);
            }
        } catch (err) {
            await handleError(err);
            error.value = err.message;
            throw err;
        }
    }

    async function reportPost(postId, reason, details) {
        try {
            const response = await apiService.reportPost(postId, reason, details);
            if (response.data.code !== "1000") {
                throw new Error(response.data.message || 'Failed to report post');
            }
            return response.data;
        } catch (err) {
            await handleError(err);
            error.value = err.message;
            throw err;
        }
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
        if (!post) {
            logger.debug('Validation failed: post is null or undefined');
            return null;
        }

        try {
            logger.debug('Processing post data:', {
                postId: post.postId,
                hasContent: Boolean(post.content),
                hasImages: Boolean(post.images?.length),
                created: post.created,
                createdAt: post.createdAt,
                timestamp: post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toISOString() : null
            });

            // Content validation
            const content = post.content === undefined ? '' : String(post.content).trim();
            const hasContent = content !== '';

            // Media validation
            const images = Array.isArray(post.images) ? post.images : [];
            const video = typeof post.video === 'string' ? post.video.trim() : null;
            const hasMedia = images.length > 0 || Boolean(video);

            if (!hasContent && !hasMedia) {
                logger.debug('Validation failed: post has no content or media');
                return null;
            }

            // Author validation
            if (!post.userId) {
                logger.debug('Validation failed: missing user data');
                return null;
            }

            // Process images
            const processedImages = images
                .filter(url => url && typeof url === 'string')
                .map(url => {
                    try {
                        return url.trim();
                    } catch (e) {
                        logger.warn('Invalid image URL:', { url, error: e.message });
                        return '';
                    }
                })
                .filter(url => url !== '');

            // Process author data
            const author = post.author ? {
                ...post.author,
                avatar: typeof post.author?.avatar === 'string'
                    ? post.author.avatar.trim()
                    : ''
            } : null;

            // User store for ownership check
            const userStore = useUserStore();
            const currentUserId = userStore.userData?.userId;
            const isOwner = currentUserId === post.userId;

            logger.debug('Post validation successful', {
                postId: post.postId,
                contentLength: content.length,
                imagesCount: processedImages.length,
                isOwner
            });

            // Construct validated post object with fallbacks
            const validatedPost = {
                postId: post.postId,
                content,
                images: processedImages,
                video,
                likes: Math.max(0, parseInt(post.likes) || 0),
                comments: Math.max(0, parseInt(post.comments) || 0),
                userId: post.userId || currentUserId,
                userName: post.userName || userStore.userData?.userName || 'Anonymous User',
                userAvatar: post.userAvatar || userStore.userData?.avatar || '',
                author: author || {
                    userId: post.userId || currentUserId,
                    userName: post.userName || userStore.userData?.userName || 'Anonymous User',
                    avatar: post.userAvatar || userStore.userData?.avatar || ''
                },
                isOwner,
                created: (() => {
                    if (post.created) {
                        return new Date(post.created).toISOString();
                    }
                    if (post.createdAt?.seconds) {
                        return new Date(post.createdAt.seconds * 1000).toISOString();
                    }
                    return new Date().toISOString();
                })(),
                lastModified: new Date().toISOString()
            };

            // Final inappropriate content check
            if (containsInappropriateContent(content)) {
                logger.debug('Post contains inappropriate content');
                return null;
            }

            return validatedPost;
        } catch (err) {
            console.error("Error validating post:", err);
            return null;
        }
    }

    // Check for Inappropriate Content
    function containsInappropriateContent(text) {
        if (!text) return false;
        const lowerCaseText = text.toLowerCase();
        return inappropriateWords.some((word) =>
            lowerCaseText.includes(word.toLowerCase())
        );
    }

    // Validate Coordinate
    function isValidCoordinate(coord) {
        return typeof coord === "number" && !isNaN(coord);
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
        fetchPosts,
        fetchPost,
        createPost,
        toggleLike,
        updatePost,
        removePost,
        reportPost,
        setLastKnownCoordinates,
        validateAndProcessPost,
        containsInappropriateContent,
        isValidCoordinate,
        getUserPosts,
    };
});
