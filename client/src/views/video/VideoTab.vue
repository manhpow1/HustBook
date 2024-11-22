<template>
    <div class="video-tab">
        <header class="flex justify-between items-center p-4 bg-gray-100">
            <h1 class="text-2xl font-bold">Videos</h1>
            <button @click="navigateToSearch" class="bg-blue-500 text-white px-4 py-2 rounded-full">
                <SearchIcon class="w-5 h-5" />
                <span class="sr-only">Search Videos</span>
            </button>
        </header>
        <VideoFeed />
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { SearchIcon } from 'lucide-vue-next';
import VideoFeed from '../components/video/VideoFeed.vue';

const router = useRouter();

const navigateToSearch = () => {
    router.push({ name: 'VideoSearch' });
};
</script>