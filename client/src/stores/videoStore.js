import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVideoStore = defineStore('video', () => {
    const currentVideo = ref(null)
    const recommendedVideos = ref([])
    const loading = ref(false)
    const error = ref(null)

    const fetchVideo = async (videoId) => {
        loading.value = true
        error.value = null
        try {
            // Simulate API call
            const response = await fetch(`/api/videos/${videoId}`)
            if (!response.ok) throw new Error('Failed to fetch video')
            currentVideo.value = await response.json()
        } catch (err) {
            error.value = err.message
        } finally {
            loading.value = false
        }
    }

    const fetchRecommendedVideos = async () => {
        loading.value = true
        error.value = null
        try {
            // Simulate API call
            const response = await fetch('/api/videos/recommended')
            if (!response.ok) throw new Error('Failed to fetch recommended videos')
            recommendedVideos.value = await response.json()
        } catch (err) {
            error.value = err.message
        } finally {
            loading.value = false
        }
    }

    return {
        currentVideo,
        recommendedVideos,
        loading,
        error,
        fetchVideo,
        fetchRecommendedVideos
    }
})