<template>
    <div v-if="isLoggedIn" class="relative" ref="searchRef">
        <div class="flex items-center space-x-2">
            <Input id="keyword" v-model="keyword" placeholder="Search by keyword..." @input="debouncedSearch"
                aria-label="Search Keyword" class="w-64">
            <template #prefix>
                <SearchIcon class="h-4 w-4 text-muted-foreground" />
            </template>
            </Input>
            <Input id="userId" v-model="userId" placeholder="User ID" @input="debouncedSearch"
                aria-label="Search by User ID" class="w-32">
            <template #prefix>
                <UserIcon class="h-4 w-4 text-muted-foreground" />
            </template>
            </Input>
            <Button @click="handleSearch" :disabled="isLoading" :aria-disabled="isLoading">
                <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {{ isLoading ? "Searching..." : "Search" }}
            </Button>
            <DropdownMenu v-model="isDropdownOpen">
                <DropdownMenuTrigger asChild @click="handleDropdownTrigger">
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
                                    class="text-destructive hover:text-destructive">
                                    Delete
                                </Button>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Button @click="deleteAllSavedSearches" variant="ghost" size="sm"
                                class="w-full text-destructive hover:text-destructive">
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
                <span class="sr-only">{{ isResultsOpen ? "Hide" : "Show" }} search results</span>
            </Button>
        </div>
        <div v-if="isResultsOpen"
            class="absolute left-0 right-0 mt-2 bg-background border rounded-md shadow-lg z-10 max-h-96 overflow-y-auto"
            style="max-width: 400px">
            <ScrollArea className="h-full w-full rounded-md">
                <div v-if="isLoading && !searchResults.length" class="p-4 space-y-4">
                    <div v-for="i in 3" :key="i" class="space-y-3">
                        <div class="flex items-center space-x-4">
                            <Skeleton class="h-12 w-12 rounded-full" />
                            <div class="space-y-2">
                                <Skeleton class="h-4 w-[200px]" />
                                <Skeleton class="h-4 w-[150px]" />
                            </div>
                        </div>
                        <Skeleton class="h-4 w-full" />
                        <Skeleton class="h-4 w-[90%]" />
                    </div>
                </div>
                <div v-else-if="error" class="p-4" role="alert">
                    <Alert variant="destructive">
                        <AlertCircleIcon class="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {{ error }}
                            <Button variant="outline" size="sm" @click="handleSearch" class="mt-2">
                                <RefreshCwIcon class="mr-2 h-4 w-4" />
                                Try Again
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
                <div v-else-if="sortedSearchResults.length > 0" class="p-4 space-y-4">
                    <Card v-for="post in sortedSearchResults" :key="post.postId" class="overflow-hidden search-result"
                        :data-test="`card-${post.postId}`">
                        <CardContent class="p-4">
                            <div class="flex items-center space-x-4 mb-4">
                                <Avatar>
                                    <AvatarImage :src="post.author?.avatar" :alt="post.author?.userName" />
                                    <AvatarFallback>{{
                                        post.author?.userName?.charAt(0) || "U"
                                        }}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 class="font-semibold">{{ post.author?.userName }}</h3>
                                    <time :datetime="post.created" class="text-sm text-muted-foreground">
                                        {{ formatDate(post.created) }}
                                    </time>
                                </div>
                            </div>
                            <p class="text-sm mb-4">{{ post.content }}</p>
                            <Button variant="secondary" class="w-full" @click="viewPost(post.postId)">
                                View Post
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <div v-else class="p-4 text-center text-muted-foreground">
                    No results found.
                </div>
            </ScrollArea>
        </div>
    </div>
    <p v-else class="text-muted-foreground">Please log in to search posts.</p>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useSearchStore } from "../../stores/searchStore";
import { useUserStore } from "../../stores/userStore";
import { useRouter } from "vue-router";
import { formatDate } from "../../utils/helpers";
import { useDebounce } from "../../composables/useDebounce";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircleIcon, ChevronDownIcon, Loader2Icon, RefreshCwIcon, SearchIcon, UserIcon } from "lucide-vue-next";
import { storeToRefs } from "pinia";

const searchStore = useSearchStore();
const userStore = useUserStore();
const router = useRouter();

const searchRef = ref(null);
const { searchResults, isLoading, error } = storeToRefs(searchStore);
const { isLoggedIn } = storeToRefs(userStore);
const keyword = ref("");
const userId = ref("");
const savedSearches = ref([]);
const isResultsOpen = ref(false);
const isDropdownOpen = ref(false);

// Computed properties
const sortedSearchResults = computed(() => {
    return [...searchResults.value].sort(
        (a, b) => new Date(b.created) - new Date(a.created)
    );
});

const normalizedSavedSearches = computed(() => {
    const uniqueSearches = new Map();
    savedSearches.value.forEach((search) => {
        if (search.id && search.keyword && search.created) {
            const normalizedKeyword = search.keyword.trim().toLowerCase();
            if (
                !uniqueSearches.has(normalizedKeyword) ||
                new Date(search.created) >
                new Date(uniqueSearches.get(normalizedKeyword).created)
            ) {
                uniqueSearches.set(normalizedKeyword, search);
            }
        }
    });
    return Array.from(uniqueSearches.values())
        .sort((a, b) => new Date(b.created) - new Date(a.created))
        .slice(0, 20);
});

// Event handlers
const handleSearch = async () => {
    if (!keyword.value.trim() && !userId.value.trim()) return;

    try {
        await searchStore.searchPosts({
            keyword: keyword.value.trim(),
            userId: userId.value.trim(),
            index: 0,
            count: 20,
        });
    } catch (err) {
        logger.error("Error during search:", err);
    }
};

const debouncedSearch = useDebounce(handleSearch, 300);

const viewPost = (postId) => {
    router.push(`/posts/${postId}`);
};

const fetchSavedSearches = async () => {
    try {
        const response = await searchStore.getSavedSearches();
        savedSearches.value = response || [];
    } catch (error) {
        logger.error("Failed to fetch saved searches:", error);
        savedSearches.value = [];
    }
};

const applySavedSearch = (search) => {
    keyword.value = search.keyword;
    userId.value = search.userId || "";
    handleSearch();
};

const deleteSavedSearch = async (searchId) => {
    try {
        await searchStore.deleteSavedSearch(searchId);
        await fetchSavedSearches();
    } catch (error) {
        logger.error("Error deleting saved search:", error);
    }
};

const deleteAllSavedSearches = async () => {
    try {
        await searchStore.deleteSavedSearch(null, true);
        await fetchSavedSearches();
    } catch (error) {
        logger.error("Error deleting all saved searches:", error);
    }
};

const toggleResults = () => {
    isResultsOpen.value = !isResultsOpen.value;
};

const handleDropdownTrigger = async () => {
    if (!isDropdownOpen.value && savedSearches.value.length === 0) {
        await fetchSavedSearches();
    }
    isDropdownOpen.value = !isDropdownOpen.value;
};

const handleClickOutside = (event) => {
    if (searchRef.value && !searchRef.value.contains(event.target)) {
        isResultsOpen.value = false;
    }
};

// Lifecycle hooks
onMounted(() => {
    document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener("mousedown", handleClickOutside);
});

watch(
    [keyword, userId],
    () => {
        searchStore.resetSearch();
    },
    { deep: true }
);
</script>

<style scoped>
.search-result:hover {
    @apply ring-1 ring-primary/20;
}
</style>
