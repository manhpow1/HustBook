<template>
    <div class="video-search p-4">
        <div class="mb-4">
            <input v-model="searchQuery" @input="debounceSearch" type="text" placeholder="Search videos..."
                class="w-full p-2 border rounded-lg" />
        </div>
        <div v-if="loading" class="text-center">
            <p>Searching videos...</p>
        </div>
        <div v-else-if="error" class="text-center text-red-500">
            <p>{{ error }}</p>
        </div>
        <div v-else-if="searchResults.length === 0" class="text-center">
            <p>No videos found.</p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="video in searchResults" :key="video.id" class="video-card">
                <img :src="video.thumbnail" :alt="video.title" class="w-full h-40 object-cover rounded-lg" />
                <h3 class="mt-2 font-semibold">{{ video.title }}</h3>
                <p class="text-sm text-gray-500">{{ video.uploader.username }}</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useVideoStore } from '../stores/videoStore';

const videoStore = useVideoStore();
const searchQuery = ref('');
const searchResults = ref([]);
const loading = ref(false);
const error = ref(null);

let debounceTimer;

const debounceSearch = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 300);
};

const performSearch = async () => {
    if (searchQuery.value.trim() === '') {
        searchResults.value = [];
        return;
    }

    loading.value = true;
    error.value = null;

    try {
        searchResults.value = await videoStore.searchVideos(searchQuery.value);
    } catch (err) {
        console.error('Error searching videos:', err);
        error.value = 'An error occurred while searching for videos. Please try again.';
    } finally {
        loading.value = false;
    }
};
</script>