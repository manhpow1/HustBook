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
                limit: 20,
                ...params,
            };

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
                hasMorePosts.value = newPosts.length === 20;
            } else {
                hasMorePosts.value = false;
                if (response.data.code !== "9994") {
                    throw new Error(response.data.message || "Failed to fetch posts");
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

    // Update Post
    async function updatePost(postId, postData) {
        loading.value = true;
        try {
            const formData = new FormData();

            // Xử lý content và contentLowerCase
            const content = postData.content.trim();
            formData.append('content', content);

            // Chuyển đổi content thành mảng contentLowerCase
            const contentWords = content.toLowerCase().split(/\s+/).filter(Boolean);
            contentWords.forEach(word => {
                formData.append('contentLowerCase[]', word);
            });

            // Xử lý images hiện có
            if (postData.existingImages?.length) {
                postData.existingImages.forEach(url => {
                    formData.append('existingImages[]', url);
                });
            }

            // Xử lý images mới
            if (postData.media?.length) {
                const processedImages = await Promise.all(
                    postData.media.map(async (img) => {
                        // Nếu là URL (ảnh hiện có), giữ nguyên
                        if (typeof img === 'string') return img;
                        // Nếu là file mới, xử lý và nén
                        return await useImageProcessing().compressImage(img);
                    })
                );

                processedImages
                    .filter(Boolean)
                    .forEach(img => {
                        if (typeof img === 'string' && img.startsWith('http')) {
                            formData.append('existingImages[]', img);
                    } else {
                            formData.append('images', img);
                        }
                    });
            }

            const response = await apiService.updatePost(postId, formData);

            if (response.data.code === "1000") {
                const updatedPost = validateAndProcessPost(response.data.data);
                const index = posts.value.findIndex((p) => p.postId === postId);
                if (index !== -1) posts.value[index] = updatedPost;
                if (currentPost.value?.postId === postId)
                    currentPost.value = updatedPost;
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
            const post = posts.value.find((p) => p.postId === postId);
            const isLiked = post?.isLiked === "1";

            if (post) {
                post.isLiked = isLiked ? "0" : "1";
                post.likes += isLiked ? -1 : 1;
            }

            if (currentPost.value?.postId === postId) {
                currentPost.value.isLiked = isLiked ? "0" : "1";
                currentPost.value.likes += isLiked ? -1 : 1;
            }

            await apiService.likePost(postId);
        } catch (err) {
            await handleError(err);
            const post = posts.value.find((p) => p.postId === postId);
            if (post) {
                post.isLiked = post.isLiked === "1" ? "0" : "1";
                post.likes += post.isLiked === "1" ? 1 : -1;
            }
            if (currentPost.value?.postId === postId) {
                currentPost.value.isLiked =
                    currentPost.value.isLiked === "1" ? "0" : "1";
                currentPost.value.likes += currentPost.value.isLiked === "1" ? 1 : -1;
            }
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
            } else {
                throw new Error(response.data.message);
            }
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
        if (!post) return null;

        try {
            // Ensure the post has either content or media
            const hasContent =
                typeof post.content === "string" && post.content.trim() !== "";
            const hasMedia =
                (Array.isArray(post.images) && post.images.length > 0) ||
                (typeof post.video === "string" && post.video?.trim() !== "");

            if (!hasContent && !hasMedia) return null;

            // Ensure the post has a valid author
            if (!post.userId || !post.author || !post.author.userId) return null;

            // Process and validate URLs
            if (Array.isArray(post.images)) {
                post.images = post.images
                    .filter((url) => url && typeof url === "string")
                    .map((url) => {
                        try {
                            return url.trim();
                        } catch (e) {
                            console.warn("Invalid image URL:", url);
                            return "";
                        }
                    })
                    .filter((url) => url !== "");
            } else {
                post.images = [];
            }

            if (post.video) {
                try {
                    post.video =
                        typeof post.video === "string" ? post.video.trim() : null;
                } catch (e) {
                    console.warn("Invalid video URL:", post.video);
                    post.video = null;
                }
            }

            if (post.author) {
                try {
                    post.author.avatar =
                        typeof post.author.avatar === "string"
                            ? post.author.avatar.trim()
                            : "";
                } catch (e) {
                    console.warn("Invalid avatar URL:", post.author.avatar);
                    post.author.avatar = "";
                }
            }

            // Ensure 'likes' and 'comments' fields are non-negative integers
            post.likes =
                Number.isInteger(post.likes) && post.likes >= 0 ? post.likes : 0;
            post.comments =
                Number.isInteger(post.comments) && post.comments >= 0
                    ? post.comments
                    : 0;

            // Ensure userId exists and is valid
            post.userId = post.userId || null;
            post.userName = post.userName || "Anonymous User";

            // Validate inappropriate content
            if (containsInappropriateContent(post.content)) {
                logger.debug('Post contains inappropriate content');
                return null;
            }

            // Check if the current user is the owner of the post
            const userStore = useUserStore();
            const currentUserId = userStore.userData?.userId;
            const isOwner = currentUserId === post.userId;

            logger.debug('Post ownership check:', { 
                postId: post.postId,
                postUserId: post.userId,
                currentUserId,
                isOwner 
            });

            return {
                ...post,
                userId: post.userId,
                userName: post.userName,
                userAvatar: post.userAvatar || "",
                isOwner,
                lastModified: new Date().toISOString()
            };
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
        setLastKnownCoordinates,
        validateAndProcessPost,
        containsInappropriateContent,
        isValidCoordinate,
        getUserPosts,
    };
});
