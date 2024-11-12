<template>
    <div v-if="isLoggedIn" class="max-w-4xl mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">Search Hustbook</h1>

        <div class="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0 mb-4">
            <div class="flex-grow">
                <label for="keyword" class="sr-only">Keyword</label>
                <Input id="keyword" v-model="keyword" placeholder="Search keyword" @input="debouncedSearch">
                <template #icon>
                    <SearchIcon class="w-5 h-5 text-gray-400" />
                </template>
                </Input>
            </div>

            <div>
                <label for="userId" class="sr-only">User ID</label>
                <Input id="userId" v-model="userId" placeholder="User ID" @input="debouncedSearch">
                <template #icon>
                    <UserIcon class="w-5 h-5 text-gray-400" />
                </template>
                </Input>
            </div>

            <Button @click="handleSearch" :disabled="isLoading" :aria-disabled="isLoading">
                <template v-if="isLoading">
                    <Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
                    Searching
                </template>
                <template v-else>
                    Search
                </template>
            </Button>
        </div>

        <div v-if="isLoading && !searchResults.length" class="space-y-4">
            <PostSkeleton v-for="i in 3" :key="i" />
        </div>

        <div v-else-if="error" class="text-red-500 mb-4">
            {{ error }}
            <Button @click="retrySearch" variant="outline" class="mt-2">
                Retry Search
            </Button>
        </div>

        <div v-else-if="searchResults.length > 0" class="space-y-4">
            <TransitionGroup name="list" tag="div">
                <Card v-for="post in searchResults" :key="post.id" class="overflow-hidden">
                    <div class="p-4">
                        <h2 class="text-xl font-semibold mb-2">{{ post.author.username }}</h2>
                        <p class="text-gray-600 mb-2">{{ post.described }}</p>
                        <div class="flex items-center text-sm text-gray-500">
                            <CalendarIcon class="w-4 h-4 mr-1" />
                            <span>{{ formatDate(post.created) }}</span>
                        </div>
                        <div class="mt-2">
                            <Button @click="viewPost(post.id)">View Post</Button>
                        </div>
                    </div>
                </Card>
            </TransitionGroup>
        </div>

        <p v-else class="text-gray-500">No results found.</p>

        <div v-if="hasMore" class="mt-4">
            <Button @click="loadMore" variant="outline" :disabled="isLoading" :aria-disabled="isLoading">
                <template v-if="isLoading">
                    <Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
                    Loading
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
import { Button, Input, Card } from '../ui';
import { SearchIcon, UserIcon, CalendarIcon, Loader2Icon } from 'lucide-vue-next';
import { formatDate } from '../../utils/dateUtils';
import { handleError } from '../../utils/errorHandler';
import { useSearch } from '../../composables/useSearch';
import { usePagination } from '../../composables/usePagination';
import PostSkeleton from '../shared/PostSkeleton.vue';

const searchStore = useSearchStore();
const userStore = useUserStore();
const router = useRouter();

const {
    keyword,
    userId,
    performSearch,
    debouncedSearch
} = useSearch();

const {
    index,
    count,
    loadMore
} = usePagination();

const isLoggedIn = computed(() => userStore.isLoggedIn());
const searchResults = computed(() => searchStore.searchResults);
const hasMore = computed(() => searchStore.hasMore);
const isLoading = computed(() => searchStore.isLoading);
const error = ref(null);

const handleSearch = async () => {
    try {
        error.value = null;
        await performSearch({
            keyword: keyword.value,
            user_id: userId.value,
            index: index.value,
            count: count.value
        });
    } catch (err) {
        await handleError(err, router);
    }
};

const viewPost = (postId) => {
    router.push(`/posts/${postId}`);
};

const retrySearch = () => {
    handleSearch();
};

watch([keyword, userId], () => {
    index.value = 0;
    searchStore.resetSearch();
});

onMounted(() => {
    if (isLoggedIn.value) {
        handleSearch();
    }
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