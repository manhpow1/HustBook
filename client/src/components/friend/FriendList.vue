<template>
    <div>
        <div class="mb-4 flex justify-between items-center">
            <div class="relative">
                <input v-model="searchQuery" type="text" placeholder="Search friends"
                    class="pl-8 pr-2 py-2 border rounded-md" aria-label="Search friends">
                <SearchIcon class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                    aria-hidden="true" />
            </div>
            <select v-model="sortBy" class="border rounded-md px-2 py-2" aria-label="Sort friends">
                <option value="name">Sort by Name</option>
                <option value="recent">Sort by Recent</option>
                <option value="mutual">Sort by Mutual Friends</option>
            </select>
        </div>
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FriendSkeleton v-for="i in 6" :key="i" />
        </div>
        <div v-else-if="error" class="text-red-500 py-4">
            {{ error }}
        </div>
        <div v-else-if="filteredFriends.length === 0" class="text-gray-500 py-4">
            No friends found.
        </div>
        <ul v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <li v-for="friend in filteredFriends" :key="friend.id" class="bg-white shadow rounded-lg p-4">
                <div class="flex items-center mb-4">
                    <img :src="friend.avatar || '../../assets/avatar-default.svg'" :alt="friend.username"
                        class="w-12 h-12 rounded-full mr-4">
                    <div>
                        <h3 class="font-semibold">{{ friend.username }}</h3>
                        <p class="text-sm text-gray-500">{{ friend.mutualFriends }} mutual friends</p>
                    </div>
                </div>
                <div class="flex justify-between">
                    <button @click="viewProfile(friend.id)" class="text-primary-600 hover:underline">View
                        Profile</button>
                    <div class="relative">
                        <button @click="toggleDropdown(friend.id)" class="text-gray-500 hover:text-gray-700"
                            aria-haspopup="true" :aria-expanded="activeDropdown === friend.id">
                            <MoreVerticalIcon class="w-5 h-5" aria-hidden="true" />
                            <span class="sr-only">More options for {{ friend.username }}</span>
                        </button>
                        <div v-if="activeDropdown === friend.id"
                            class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                            <a @click="removeFriend(friend.id)"
                                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Remove
                                Friend</a>
                            <a @click="blockUser(friend.id)"
                                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Block
                                User</a>
                        </div>
                    </div>
                </div>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useFriendStore } from '../../stores/friendStore';
import { SearchIcon, MoreVerticalIcon } from 'lucide-vue-next';
import { useToast } from '../../composables/useToast';
import FriendSkeleton from './FriendSkeleton.vue';

const router = useRouter();
const friendStore = useFriendStore();
const { showToast } = useToast();

const friends = ref([]);
const loading = ref(true);
const error = ref(null);
const searchQuery = ref('');
const sortBy = ref('name');
const activeDropdown = ref(null);
const page = ref(1);
const perPage = 12;

// Debounce search input
const debouncedSearch = ref('');
let debounceTimer;
watch(searchQuery, (newVal) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        debouncedSearch.value = newVal;
        page.value = 1; // Reset to first page on new search
    }, 300);
});

const fetchFriends = async () => {
    try {
        loading.value = true;
        const response = await friendStore.getUserFriends({ page: page.value, perPage });
        friends.value = [...friends.value, ...response.friends];
        loading.value = false;
    } catch (err) {
        error.value = 'Failed to load friends';
        loading.value = false;
    }
};

const filteredFriends = computed(() => {
    let result = friends.value.filter(friend =>
        friend.username.toLowerCase().includes(debouncedSearch.value.toLowerCase())
    );

    // Sort friends based on selected criteria
    if (sortBy.value === 'name') {
        result.sort((a, b) => a.username.localeCompare(b.username));
    } else if (sortBy.value === 'recent') {
        result.sort((a, b) => new Date(b.friendshipDate) - new Date(a.friendshipDate));
    } else if (sortBy.value === 'mutual') {
        result.sort((a, b) => b.mutualFriends - a.mutualFriends);
    }

    return result;
});

const viewProfile = (userId) => {
    router.push({ name: 'Profile', params: { id: userId } });
};

const toggleDropdown = (friendId) => {
    activeDropdown.value = activeDropdown.value === friendId ? null : friendId;
};

const removeFriend = async (friendId) => {
    try {
        await friendStore.removeFriend(friendId);
        friends.value = friends.value.filter(friend => friend.id !== friendId);
        showToast('Friend removed successfully', 'success');
    } catch (err) {
        console.error('Error removing friend:', err);
        showToast('Failed to remove friend', 'error');
    }
};

const blockUser = async (userId) => {
    try {
        await friendStore.blockUser(userId);
        friends.value = friends.value.filter(friend => friend.id !== userId);
        showToast('User blocked successfully', 'success');
    } catch (err) {
        console.error('Error blocking user:', err);
        showToast('Failed to block user', 'error');
    }
};

// Implement infinite scrolling
const handleScroll = () => {
    const bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
    if (bottomOfWindow && !loading.value) {
        page.value += 1;
        fetchFriends();
    }
};

onMounted(() => {
    fetchFriends();
    window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});
</script>