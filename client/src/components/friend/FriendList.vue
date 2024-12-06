<template>
    <div>
        <div class="mb-4 flex justify-between items-center">
            <!-- Search Input -->
            <div class="relative">
                <input v-model="searchQuery" type="text" placeholder="Search friends"
                    class="pl-8 pr-2 py-2 border rounded-md" aria-label="Search friends" />
                <SearchIcon class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                    aria-hidden="true" />
            </div>

            <!-- Sort Select -->
            <select v-model="sortBy" class="border rounded-md px-2 py-2" aria-label="Sort friends">
                <option value="name">Sort by Name</option>
                <option value="recent">Sort by Recent</option>
                <option value="mutual">Sort by Mutual Friends</option>
            </select>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FriendSkeleton v-for="i in 6" :key="i" />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-red-500 py-4">
            {{ error }}
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredFriends.length === 0" class="text-gray-500 py-4">
            No friends found.
        </div>

        <!-- Friends List -->
        <ul v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <li v-for="friend in filteredFriends" :key="friend.id" class="bg-white shadow rounded-lg p-4">
                <div class="flex items-center mb-4">
                    <img :src="friend.avatar || '../../assets/avatar-default.svg'" :alt="friend.username"
                        class="w-12 h-12 rounded-full mr-4" />
                    <div>
                        <h3 class="font-semibold">{{ friend.username }}</h3>
                        <p class="text-sm text-gray-500">{{ friend.mutualFriends }} mutual friends</p>
                    </div>
                </div>
                <div class="flex justify-between">
                    <button @click="viewProfile(friend.id)" class="text-primary-600 hover:underline">
                        View Profile
                    </button>
                    <div class="relative">
                        <button @click="toggleDropdown(friend.id)" class="text-gray-500 hover:text-gray-700"
                            aria-haspopup="true" :aria-expanded="activeDropdown === friend.id">
                            <MoreVerticalIcon class="w-5 h-5" aria-hidden="true" />
                            <span class="sr-only">More options for {{ friend.username }}</span>
                        </button>
                        <div v-if="activeDropdown === friend.id"
                            class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                            <a @click="confirmBlock(friend.id)"
                                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                                Block User
                            </a>
                        </div>
                    </div>
                </div>
            </li>
        </ul>

        <!-- Confirm Dialog for Blocking -->
        <ConfirmDialog v-model="confirmDialog" :title="'Block User'"
            :message="'Are you sure you want to block this user? They will no longer be able to send you messages or friend requests.'"
            confirmText="Block" cancelText="Cancel" :isLoading="isProcessing" loadingText="Blocking..."
            @confirm="blockConfirmed" @cancel="cancelBlock" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useFriendStore } from '../../stores/friendStore';
import { useToast } from '../../composables/useToast';
import { useDebounce } from '../../composables/useDebounce'; // Using the debouncing composable
import FriendSkeleton from './FriendSkeleton.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import { SearchIcon, MoreVerticalIcon } from 'lucide-vue-next';

const router = useRouter();
const friendStore = useFriendStore();
const { showToast } = useToast();

const friends = ref([]);
const loading = ref(true);
const error = ref(null);
const searchQuery = ref('');
const sortBy = ref('name');
const activeDropdown = ref(null);
const confirmDialog = ref(false);
const userToBlock = ref(null);
const isProcessing = ref(false);

// Debounce Setup
const debouncedSearch = ref('');
const doSearch = () => {
    debouncedSearch.value = searchQuery.value;
};
const debouncedSearchFn = useDebounce(doSearch, 300);

// Watch searchQuery and run debounced function
watch(searchQuery, () => {
    debouncedSearchFn();
});

// Fetch friends from the store
const fetchFriends = async () => {
    try {
        loading.value = true;
        await friendStore.getUserFriends();
        friends.value = friendStore.friends;
        loading.value = false;
    } catch (err) {
        error.value = 'Failed to load friends';
        loading.value = false;
    }
};

// Compute filtered and sorted friends
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

// Navigate to user's profile
const viewProfile = (userId) => {
    router.push({ name: 'Profile', params: { id: userId } });
};

// Toggle dropdown for friend actions
const toggleDropdown = (friendId) => {
    activeDropdown.value = activeDropdown.value === friendId ? null : friendId;
};

// Confirm blocking a user
const confirmBlock = (userId) => {
    userToBlock.value = userId;
    confirmDialog.value = true;
};

// Execute block action after confirmation
const blockConfirmed = async () => {
    if (!userToBlock.value) return;
    isProcessing.value = true;

    try {
        // Set block type to 0 for blocking
        await friendStore.setBlock(userToBlock.value, 0);
        showToast('User blocked successfully', 'success');
        // Remove the blocked user from the current list
        friends.value = friends.value.filter(friend => friend.id !== userToBlock.value);
    } catch (err) {
        console.error(`Error blocking user with ID ${userToBlock.value}:`, err);
        showToast('Failed to block user', 'error');
    } finally {
        isProcessing.value = false;
        confirmDialog.value = false;
        userToBlock.value = null;
    }
};

// Cancel block action
const cancelBlock = () => {
    confirmDialog.value = false;
    userToBlock.value = null;
};

// Load friends on component mount
onMounted(() => {
    fetchFriends();
});
</script>
