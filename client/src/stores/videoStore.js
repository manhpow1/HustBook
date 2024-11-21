import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiService from '../services/api'
import { handleError } from '../utils/errorHandler'
import router from '../router'

export const useVideoStore = defineStore('video', () => {
    const videos = ref([])
    const loading = ref(false)
    const error = ref(null)
    const hasMore = ref(true)
    const lastId = ref(null)

    const getListVideos = async (params = {}) => {
        if (!hasMore.value) return

        loading.value = true
        error.value = null

        try {
            const response = await apiService.get('/get_list_videos', {
                params: {
                    ...params,
                    last_id: lastId.value,
                    index: videos.value.length,
                    count: 20
                }
            })

            if (response.data.code === '1000') {
                const newVideos = response.data.data.posts
                videos.value.push(...newVideos)
                lastId.value = response.data.data.last_id
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

    return {
        videos,
        loading,
        error,
        hasMore,
        getListVideos,
        resetVideos
    }
})