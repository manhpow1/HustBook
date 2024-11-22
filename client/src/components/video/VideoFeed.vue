<template>
    <div class="video-feed">
        <div v-for="video in videos" :key="video.id" class="mb-6">
            <VideoPlayer :video="video" />
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import VideoPlayer from './VideoPlayer.vue';
import { useVideoStore } from '../../stores/videoStore';

const videoStore = useVideoStore();
const videos = ref([]);

onMounted(async () => {
    try {
        videos.value = await videoStore.fetchVideos();
    } catch (error) {
        console.error('Failed to fetch videos:', error);
        // TODO: Implement error handling UI
    }
});
</script>