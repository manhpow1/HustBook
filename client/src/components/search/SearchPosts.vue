<template>
    <div v-if="isLoggedIn" class="relative" ref="searchRef">
        <div class="flex items-center space-x-2">
            <Input id="keyword" v-model="keyword" placeholder="Search by keyword..." @input="debouncedSearch"
                aria-label="Search Keyword" class="w-64" />
            <Input id="userId" v-model="userId" placeholder="User ID" @input="debouncedSearch"
                aria-label="Search by User ID" class="w-32" />
            <Button @click="handleSearch" :disabled="isLoading" :aria-disabled="isLoading">
                <template v-if="isLoading">
                    <Loader2Icon class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Searching...
                </template>
                <template v-else>
                    Search
                </template>
            </Button>

            <!-- Dropdown Menu for Saved Searches -->
            <DropdownMenu v-model="isDropdownOpen">
                <DropdownMenuTrigger as-child @click="handleDropdownTrigger">
                    <Button variant="outline">Saved Searches</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-56">
                    <template v-if="normalizedSavedSearches.length > 0">
                        <DropdownMenuItem v-for="search in normalizedSavedSearches" :key="search.id"
                            class="justify-between">
                            <span>{{ search.keyword }}</span>
                            <div>
                                <Button @click="applySavedSearch(search)" variant="ghost" size="sm" class="mr-2">
                                    Apply
                                </Button>
                                <Button @click="deleteSavedSearch(search.id)" variant="ghost" size="sm"
                                    class="text-red-500">
                                    Delete
                                </Button>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Button @click="deleteAllSavedSearches" variant="ghost" size="sm"
                                class="w-full text-red-500">
                                Delete All
                            </Button>
                        </DropdownMenuItem>
                    </template>
                    <DropdownMenuItem v-else disabled>
                        No saved searches
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button @click="toggleResults" variant="ghost" size="sm">
                <ChevronDownIcon class="h-4 w-4 transition-transform" :class="{ 'rotate-180': isResultsOpen }" />
                <span class="sr-only">{{ isResultsOpen ? 'Hide' : 'Show' }} search results</span>
            </Button>
        </div>

        <!-- Search Results -->
        <div v-if="isResultsOpen"
            class="absolute left-0 right-0 mt-2 bg-white border rounded-md shadow-lg z-10 max-h-96 overflow-y-auto"
            style="max-width: 400px">
            <div v-if="isLoading && !searchResults.length" class="space-y-4 p-4">
                <PostSkeleton v-for="i in 3" :key="i" />
            </div>

            <div v-else-if="error" class="text-red-500 p-4" role="alert">
                {{ error }}
                <Button @click="handleSearch" variant="outline" class="mt-2">
                    Retry Search
                </Button>
            </div>

            <div v-else-if="sortedSearchResults.length > 0" class="space-y-4 p-4">
                <Card v-for="post in sortedSearchResults" :key="post.postId" class="overflow-hidden search-result"
                    :data-test="`card-${post.postId}`">
                    <div class="p-4">
                        <h2 class="text-lg font-semibold mb-2">{{ post.author.userName }}</h2>
                        <h3 class="text-xl mb-2">{{ post.title }}</h3>
                        <p class="text-gray-600 mb-2">{{ post.described }}</p>
                        <div class="flex items-center text-sm text-gray-500">
                            <CalendarIcon class="w-4 h-4 mr-1" aria-hidden="true" />
                            <span>{{ formatDate(post.created) }}</span>
                        </div>
                        <div class="mt-2">
                            <Button @click="viewPost(post.postId)">
                                View Post
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            <p v-else class="text-gray-500 p-4">No results found.</p>

            <div v-if="hasMore" class="p-4 text-center">
                <Button @click="loadMore" variant="outline" :disabled="isLoading" :aria-disabled="isLoading">
                    <template v-if="isLoading">
                        <Loader2Icon class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Loading...
                    </template>
                    <template v-else>
                        Load More
                    </template>
                </Button>
            </div>
        </div>
    </div>
    <p v-else class="text-gray-500">Please log in to search posts.</p>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useSearchStore } from '../../stores/searchStore';
import { useUserStore } from '../../stores/userStore';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SearchIcon, UserIcon, CalendarIcon, Loader2Icon, ChevronDownIcon } from 'lucide-vue-next';
import { formatDate } from '../../utils/helpers';
import { useDebounce } from '../../composables/useDebounce';
import PostSkeleton from '../shared/PostSkeleton.vue';
import { storeToRefs } from 'pinia';
import { sanitizeInput } from '../../utils/sanitize';
import { useToast } from '../ui/toast';

const searchStore = useSearchStore();
const userStore = useUserStore();
const router = useRouter();
const { toast } = useToast();
const searchRef = ref(null);

// Destructure store refs
const { searchResults, isLoading, error, hasMore } = storeToRefs(searchStore);
const { isLoggedIn } = storeToRefs(userStore);

const keyword = ref('');
const userId = ref('');
const savedSearches = ref([]);
const isResultsOpen = ref(false);
const isDropdownOpen = ref(false);

// Computed properties
const sortedSearchResults = computed(() => {
    return [...searchResults.value].sort((a, b) => new Date(b.created) - new Date(a.created));
});

const normalizedSavedSearches = computed(() => {
    const uniqueSearches = new Map();
    savedSearches.value.forEach((search) => {
        if (search.id && search.keyword && search.created) {
            const normalizedKeyword = search.keyword.trim().toLowerCase();
            if (!uniqueSearches.has(normalizedKeyword) ||
                new Date(search.created) > new Date(uniqueSearches.get(normalizedKeyword).created)) {
                uniqueSearches.set(normalizedKeyword, search);
            }
        }
    });
    return Array.from(uniqueSearches.values())
        .sort((a, b) => new Date(b.created) - new Date(a.created))
        .slice(0, 20);
});

// Search handling
const handleSearch = async () => {
    if (!keyword.value.trim() && !userId.value.trim()) {
        console.error("Please enter a keyword or User ID to search.");
        return;
    }

    try {
        await searchStore.searchPosts({
            keyword: sanitizeInput(keyword.value),
            userId: sanitizeInput(userId.value),
            index: 0,
            count: 20
        });
    } catch (err) {
        console.error("Error during search:", err);
    }
};

const debouncedSearch = useDebounce(handleSearch, 500);

const loadMore = async () => {
    if (!hasMore.value || isLoading.value) return;

    try {
        await searchStore.searchPosts({
            keyword: keyword.value.trim(),
            userId: userId.value.trim(),
            index: searchResults.value.length,
            count: 20
        });
    } catch (err) {
        console.error("Error loading more results:", err);
    }
};

// Saved searches management
const fetchSavedSearches = async () => {
    try {
        // Add a small delay to ensure CSRF token is properly set
        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await searchStore.getSavedSearches();
        savedSearches.value = response || [];
    } catch (error) {
        if (error?.response?.data?.code === '9998') {
            // CSRF token error - retry once
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
                const retryResponse = await searchStore.getSavedSearches();
                savedSearches.value = retryResponse || [];
                return;
            } catch (retryError) {
                console.error('Retry failed:', retryError);
            }
        }
        savedSearches.value = [];
        console.error('Error fetching saved searches:', error);
    }
};

const applySavedSearch = (search) => {
    keyword.value = search.keyword;
    userId.value = search.userId || '';
    handleSearch();
};

const deleteSavedSearch = async (searchId) => {
    try {
        await searchStore.deleteSavedSearch(searchId);
        await fetchSavedSearches();
        toast({ type: 'success', message: 'Saved search deleted successfully' });
    } catch (error) {
        console.error('Error deleting saved search:', error);
    }
};

const deleteAllSavedSearches = async () => {
    try {
        await searchStore.deleteSavedSearch(null, true);
        await fetchSavedSearches();
        toast({ type: 'success', message: 'All saved searches deleted successfully' });
    } catch (error) {
        console.error('Error deleting all saved searches:', error);
    }
};

const toggleResults = () => {
    isResultsOpen.value = !isResultsOpen.value;
};

const handleClickOutside = (event) => {
    if (searchRef.value && !searchRef.value.contains(event.target)) {
        isResultsOpen.value = false;
    }
};

const handleDropdownTrigger = async () => {
    if (!isDropdownOpen.value && savedSearches.value.length === 0) {
        await fetchSavedSearches();
    }
    isDropdownOpen.value = !isDropdownOpen.value;
};

const viewPost = (postId) => {
    router.push(`/posts/${postId}`);
};

// Watchers
watch([keyword, userId], () => {
    searchStore.resetSearch();
}, { deep: true });

watch(isLoggedIn, async (newVal) => {
    if (!newVal) {
        router.push('/login');
    } else {
        await fetchSavedSearches();
    }
});

// Lifecycle
onMounted(async () => {
    if (!isLoggedIn.value) {
        router.push('/login');
        return;
    }
    document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
    transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

.max-w-4xl {
    max-width: 64rem;
}
</style>
