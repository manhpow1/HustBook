<template>
  <div v-if="isLoggedIn" class="relative w-full" ref="searchRef">
    <div class="flex items-center space-x-2">
      <!-- Search Type Toggle -->
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" class="w-32">
            {{ searchType === 'posts' ? 'Search Posts' : 'Search Users' }}
            <ChevronDownIcon class="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @click="setSearchType('posts')">
            <FileTextIcon class="mr-2 h-4 w-4" />
            Search Posts
          </DropdownMenuItem>
          <DropdownMenuItem @click="setSearchType('users')">
            <UserIcon class="mr-2 h-4 w-4" />
            Search Users
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Search Input -->
      <Input :id="searchType === 'posts' ? 'postKeyword' : 'userKeyword'" v-model="keyword"
        :placeholder="searchType === 'posts' ? 'Search posts by keyword...' : 'Search users...'"
        @input="debouncedSearch" :aria-label="searchType === 'posts' ? 'Search Posts' : 'Search Users'"
        class="w-full lg:w-64">
      <template #prefix>
        <SearchIcon class="h-4 w-4 text-muted-foreground" />
      </template>
      </Input>

      <!-- Search Button -->
      <Button @click="handleSearch" :disabled="isLoading" :aria-disabled="isLoading" class="hidden lg:flex">
        <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        {{ isLoading ? "Searching..." : "Search" }}
      </Button>

      <!-- Saved Searches (Only for Posts) -->
      <DropdownMenu v-if="searchType === 'posts'" v-model="isDropdownOpen">
        <DropdownMenuTrigger asChild @click="handleDropdownTrigger">
          <Button variant="outline" class="hidden lg:flex">Saved Searches</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-56">
          <template v-if="normalizedSavedSearches.length > 0">
            <DropdownMenuItem v-for="search in normalizedSavedSearches" :key="search.id" class="justify-between">
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

      <!-- Toggle Results Button -->
      <Button @click="toggleResults" variant="ghost" size="sm" class="hidden lg:flex">
        <ChevronDownIcon class="h-4 w-4 transition-transform" :class="{ 'rotate-180': isResultsOpen }" />
        <span class="sr-only">{{ isResultsOpen ? "Hide" : "Show" }} search results</span>
      </Button>
    </div>

    <!-- Search Results -->
    <div v-if="isResultsOpen"
      class="absolute left-0 right-0 mt-2 bg-background border rounded-md shadow-lg z-50 max-h-[80vh] overflow-y-auto w-full lg:max-w-lg">
      <ScrollArea className="h-full w-full rounded-md">
        <!-- Loading State -->
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

        <!-- Error State -->
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

        <!-- Results for Posts -->
        <div v-else-if="searchType === 'posts' && sortedSearchResults.length > 0" class="p-4 space-y-4">
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
              <p class="text-sm mb-4" v-html="highlightMatch(post.content, keyword)"></p>
              <div class="flex justify-between items-center">
                <Button variant="secondary" @click="viewPost(post.postId)">
                  View Post
                </Button>
                <div class="text-sm text-muted-foreground">
                  {{ post.isExactMatch ? "Exact match" : "Partial match" }}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Results for Users -->
        <div v-else-if="searchType === 'users' && sortedSearchResults.length > 0" class="p-4 space-y-4">
          <Card v-for="user in sortedSearchResults" :key="user.userId" class="overflow-hidden search-result"
            :data-test="`card-${user.userId}`">
            <CardContent class="p-4">
              <div class="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage :src="user.avatar" :alt="user.userName" />
                  <AvatarFallback>{{ user.userName?.charAt(0) || "U" }}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 class="font-semibold" v-html="highlightMatch(user.userName, keyword)"></h3>
                  <p class="text-sm text-muted-foreground">{{ user.bio || 'No bio available' }}</p>
                </div>
              </div>
              <div class="mt-4 flex justify-end">
                <Button variant="secondary" @click="viewProfile(user.userId)">
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- No Results -->
        <div v-else class="p-4 text-center text-muted-foreground">
          No results found.
        </div>
      </ScrollArea>
    </div>
  </div>
  <p v-else class="text-muted-foreground">Please log in to search.</p>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { escapeRegExp } from "lodash-es";
import { useSearchStore } from "../../stores/searchStore";
import { useUserStore } from "../../stores/userStore";
import { useRouter } from "vue-router";
import { formatDate } from "../../utils/helpers";
import { useDebounce } from "../../composables/useDebounce";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircleIcon,
  ChevronDownIcon,
  FileTextIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  UserIcon,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";

const searchStore = useSearchStore();
const userStore = useUserStore();
const router = useRouter();

const searchRef = ref(null);
const { searchResults, isLoading, error } = storeToRefs(searchStore);
const { isLoggedIn } = storeToRefs(userStore);
const keyword = ref("");
const searchType = ref("posts");
const savedSearches = ref([]);
const isResultsOpen = ref(false);
const isDropdownOpen = ref(false);

const setSearchType = (type) => {
  searchType.value = type;
  keyword.value = "";
  searchStore.resetSearch();
  isResultsOpen.value = false;
};

const normalizeString = (str) => str?.toLowerCase().trim() || "";

const sortedSearchResults = computed(() => {
  const results = searchType.value === "users" 
    ? searchStore.userSearchResults 
    : searchResults.value;

  if (!results?.length) return [];

  if (searchType.value === "posts") {
    // Posts are already sorted by exact match and date from the server
    return [...results];
  } else {
    // Only sort users client-side
    const normalizedKeyword = normalizeString(keyword.value);
    return [...results].sort((a, b) => {
      const aName = normalizeString(a.userName);
      const bName = normalizeString(b.userName);
      const aExactMatch = aName.includes(normalizedKeyword);
      const bExactMatch = bName.includes(normalizedKeyword);
      if (aExactMatch !== bExactMatch) return aExactMatch ? -1 : 1;
      return aName.localeCompare(bName);
    });
  }
});

const normalizedSavedSearches = computed(() => {
  const uniqueSearches = new Map();
  savedSearches.value.forEach((search) => {
    if (search.id && search.keyword && search.created) {
      const normalizedKeyword = search.keyword.trim().toLowerCase();
      if (
        !uniqueSearches.has(normalizedKeyword) ||
        new Date(search.created) > new Date(uniqueSearches.get(normalizedKeyword).created)
      ) {
        uniqueSearches.set(normalizedKeyword, search);
      }
    }
  });
  return Array.from(uniqueSearches.values())
    .sort((a, b) => new Date(b.created) - new Date(a.created))
    .slice(0, 20);
});

const handleSearch = async () => {
  if (!keyword.value.trim()) {
    searchStore.resetSearch();
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    if (searchType.value === "posts") {
      await searchStore.searchPosts({
        keyword: keyword.value.trim(),
        index: 0,
        count: 20
      });
    } else {
      await searchStore.searchUsers({
        keyword: keyword.value.trim(),
        index: 0,
        count: 20
      });
    }
    isResultsOpen.value = true;
  } catch (err) {
    error.value = err.message || 'Search failed';
    console.error("Error during search:", err);
  } finally {
    isLoading.value = false;
  }
};

const highlightMatch = (text, searchTerm) => {
  if (!text || !searchTerm) return text;
  const normalizedText = normalizeString(text);
  const normalizedSearch = normalizeString(searchTerm);
  if (!normalizedText.includes(normalizedSearch)) return text;
  const regex = new RegExp(`(${escapeRegExp(normalizedSearch)})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
};

const debouncedSearch = useDebounce(handleSearch, 300);

const viewPost = (postId) => {
  router.push(`/posts/${postId}`);
};

const viewProfile = (userId) => {
  router.push(`/profile/${userId}`);
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
  searchType.value = "posts"; // Saved searches are only for posts
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

watch(keyword, () => {
  searchStore.resetSearch();
}, { immediate: true });

watch(searchType, () => {
  searchStore.resetSearch();
  keyword.value = "";
  isResultsOpen.value = false;
});
</script>

<style scoped>
.search-result:hover {
  @apply ring-1 ring-primary/20;
}

:deep(mark) {
  @apply bg-yellow-200 dark:bg-yellow-800;
  padding: 0 2px;
  border-radius: 2px;
}
</style>
