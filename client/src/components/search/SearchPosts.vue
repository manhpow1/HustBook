<template>
    <div v-if="isLoggedIn" class="max-w-4xl mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">Search Posts</h1>

        <!-- Search Input Fields -->
        <div class="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0 mb-4">
            <!-- Keyword Input -->
            <div class="flex-grow">
                <label for="keyword" class="sr-only">Search Keyword</label>
                <Input id="keyword" v-model="keyword" name="keyword" placeholder="Search by keyword..."
                    @input="debouncedSearch" aria-label="Search Keyword">
                <template #icon>
                    <SearchIcon class="w-5 h-5 text-gray-400" aria-hidden="true" />
                </template>
                </Input>
            </div>

            <!-- User ID Input -->
            <div>
                <label for="userId" class="sr-only">Search by User ID</label>
                <Input id="userId" v-model="userId" placeholder="Search by User ID..." @input="debouncedSearch"
                    aria-label="Search by User ID">
                <template #icon>
                    <UserIcon class="w-5 h-5 text-gray-400" aria-hidden="true" />
                </template>
                </Input>
            </div>

            <!-- Search Button -->
            <Button @click="handleSearch" :disabled="isLoading" aria-disabled="isLoading">
                <template v-if="isLoading">
                    <Loader2Icon class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Searching...
                </template>
                <template v-else>
                    Search
                </template>
            </Button>
        </div>

        <!-- Saved Searches Section -->
        <div v-if="normalizedSavedSearches.length > 0" class="mt-4 mb-6">
            <h2 class="text-lg font-semibold mb-2">Saved Searches</h2>
            <ul class="space-y-2">
                <li v-for="search in normalizedSavedSearches" :key="search.id"
                    class="flex items-center justify-between bg-gray-100 p-2 rounded-lg" :data-id="search.id">
                    <span>{{ search.keyword }}</span>
                    <div>
                        <Button @click="applySavedSearch(search)" variant="outline" size="small" class="mr-2">
                            Apply
                        </Button>
                        <Button @click="deleteSavedSearch(search.id)" variant="outline" size="small"
                            class="text-red-500" data-testid="delete-button">
                            Delete
                        </Button>
                    </div>
                </li>
            </ul>
            <Button @click="deleteAllSavedSearches" variant="outline" size="small" class="mt-2 text-red-500"
                data-testid="delete-all-button">
                Delete All
            </Button>
        </div>

        <!-- Search Results Section -->
        <div v-if="isLoading && !searchResults.length" class="space-y-4">
            <PostSkeleton v-for="i in 3" :key="i" />
        </div>

        <div v-else-if="error" class="text-red-500 mb-4" role="alert">
            {{ error }}
            <Button @click="retrySearch" variant="outline" class="mt-2">
                Retry Search
            </Button>
        </div>

        <div v-else-if="searchResults.length > 0" class="space-y-4">
            <TransitionGroup name="list" tag="div">
                <Card v-for="post in sortedSearchResults" :key="post.id" :post="post" :ref="'post-' + post.id"
                    :data-test="'card-' + post.id" class="overflow-hidden search-result"
                    @coverError="handleCoverError(post)">
                    <div class="p-4">
                        <h2 class="text-xl font-semibold mb-2">{{ post.author.userName }}</h2>
                        <p class="text-gray-600 mb-2">{{ post.described }}</p>
                        <div class="flex items-center text-sm text-gray-500">
                            <CalendarIcon class="w-4 h-4 mr-1" aria-hidden="true" />
                            <span>{{ formatDate(post.created) }}</span>
                        </div>
                        <div class="mt-2">
                            <Button @click="viewPost(post.id)">
                                View Post
                            </Button>
                        </div>
                    </div>
                </Card>
            </TransitionGroup>
        </div>

        <p v-else class="text-gray-500">No results found.</p>

        <!-- Load More Button -->
        <div v-if="hasMore" class="mt-4 text-center">
            <Button @click="loadMore" variant="outline" :disabled="isLoading" aria-disabled="isLoading">
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
    <p v-else class="text-gray-500">Please log in to search posts.</p>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useSearchStore } from '../../stores/searchStore';
import { useUserStore } from '../../stores/userStore';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SearchIcon, UserIcon, CalendarIcon, Loader2Icon } from 'lucide-vue-next';
import { formatDate } from '../../utils/helpers';
import { useDebounce } from '../../composables/useDebounce';
import PostSkeleton from '../shared/PostSkeleton.vue';
import { storeToRefs } from 'pinia';
import { sanitizeInput } from '../../utils/sanitize';
import { useToast } from '../../composables/useToast';

const searchStore = useSearchStore();
const userStore = useUserStore();
const router = useRouter();
const { showToast } = useToast();

// Destructure store refs
const { searchResults, isLoading, error, hasMore } = storeToRefs(searchStore);
const { isLoggedIn } = storeToRefs(userStore);

const keyword = ref('');
const userId = ref('');
const savedSearches = ref([]);

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
        const response = await searchStore.getSavedSearches();
        savedSearches.value = response;
    } catch (error) {
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
        showToast('Saved search deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting saved search:', error);
    }
};

const deleteAllSavedSearches = async () => {
    try {
        await searchStore.deleteSavedSearch(null, true);
        await fetchSavedSearches();
        showToast('All saved searches deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting all saved searches:', error);
    }
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
    await fetchSavedSearches();
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