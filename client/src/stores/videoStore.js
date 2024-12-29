import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiService from '../services/api'
import { useErrorHandler } from '@/utils/errorHandler'
import router from '../router'

export const useVideoStore = defineStore('video', () => {
    const videos = ref([])
    const loading = ref(false)
    const error = ref(null)
    const hasMore = ref(true)
    const lastId = ref(null)
    const { handleError } = useErrorHandler()

    const getListVideos = async (params = {}) => {
        if (!hasMore.value) return

        loading.value = true
        error.value = null

        try {
            const response = await apiService.post('/video/get_list_videos', {
                ...params,
                lastId: lastId.value,
                index: videos.value.length,
                count: 20
            })

            if (response.data.code === '1000') {
                const newVideos = response.data.data.posts
                videos.value.push(...newVideos)
                lastId.value = response.data.data.lastId
                hasMore.value = newVideos.length === 20
            } else {
                throw new Error(response.data.message || 'Failed to load videos')
            }
        } catch (err) {
            error.value = 'Failed to load videos'
            await handleError(err, router)
        } finally {
            loading.value = false
        }
    }

    const resetVideos = () => {
        videos.value = []
        lastId.value = null
        hasMore.value = true
        error.value = null
    }

    async function getUserVideos(userId) {
        // Assuming there's an endpoint to fetch user videos
        // If not, implement in a similar way to getListVideos but filtered by userId
        loading.value = true;
        error.value = null;

        try {
            // Example: if there's an API for user videos
            const response = await apiService.get('/video/get_user_videos', {
                params: { userId, index: 0, count: 20 }
            });

            if (response.data.code === '1000') {
                return response.data.data.posts; // Return directly to Profile.vue
            } else {
                throw new Error(response.data.message || 'Failed to load user videos');
            }
        } catch (err) {
            error.value = 'Failed to load user videos';
            await handleError(err, router);
            return [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchVideos(params = {}) {
        // Implementation if needed
        return [];
    }

    async function searchVideos(query) {
        // Implementation if needed
        return [];
    }

    return {
        videos,
        loading,
        error,
        hasMore,
        getListVideos,
        resetVideos,
        fetchVideos,
        searchVideos,
        getUserVideos,
    }
});