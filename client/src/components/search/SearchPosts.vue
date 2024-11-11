<template>
    <div class="max-w-4xl mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">Search Hustbook</h1>

        <div class="flex space-x-4 mb-4">
            <Input v-model="keyword" placeholder="Search keyword" class="flex-grow">
            <template #icon>
                <SearchIcon class="w-5 h-5 text-gray-400" />
            </template>
            </Input>

            <Input v-model="userId" placeholder="User ID">
            <template #icon>
                <UserIcon class="w-5 h-5 text-gray-400" />
            </template>
            </Input>

            <Button @click="handleSearch" :disabled="isLoading">
                {{ isLoading ? 'Searching...' : 'Search' }}
            </Button>
        </div>

        <div v-if="error" class="text-red-500 mb-4">{{ error }}</div>

        <div v-if="searchResults.length > 0" class="space-y-4">
            <Card v-for="post in searchResults" :key="post.id">
                <div class="p-4">
                    <h2 class="text-xl font-semibold mb-2">{{ post.author.username }}</h2>
                    <p class="text-gray-600 mb-2">{{ post.described }}</p>
                    <div class="flex items-center text-sm text-gray-500">
                        <CalendarIcon class="w-4 h-4 mr-1" />
                        <span>{{ new Date(post.created).toLocaleDateString() }}</span>
                    </div>
                    <div class="mt-2">
                        <Button @click="viewPost(post.id)">View Post</Button>
                    </div>
                </div>
            </Card>
        </div>

        <p v-else class="text-gray-500">No results found.</p>

        <div v-if="hasMore" class="mt-4">
            <Button @click="loadMore" variant="outline" :disabled="isLoading">
                {{ isLoading ? 'Loading...' : 'Load More' }}
            </Button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSearchStore } from '../../stores/searchStore'
import { useRouter } from 'vue-router'
import { Button, Input, Card } from '../ui'
import { SearchIcon, UserIcon, CalendarIcon } from 'lucide-vue-next'
import { handleError } from '../../utils/errorHandler'

const searchStore = useSearchStore()
const router = useRouter()

const keyword = ref('')
const userId = ref('')
const index = ref(0)
const count = ref(20)

const searchResults = computed(() => searchStore.searchResults)
const isLoading = computed(() => searchStore.loading)
const error = computed(() => searchStore.error)
const hasMore = computed(() => searchStore.hasMore)

const handleSearch = () => {
    index.value = 0 // Reset index when performing a new search
    searchStore.searchPosts({
        keyword: keyword.value,
        user_id: userId.value,
        index: index.value,
        count: count.value
    }).catch(err => handleError(err, router))
}

const loadMore = () => {
    index.value += count.value
    searchStore.searchPosts({
        keyword: keyword.value,
        user_id: userId.value,
        index: index.value,
        count: count.value
    }).catch(err => handleError(err, router))
}

const viewPost = (postId) => {
    router.push(`/post/${postId}`)
}
</script>

<style scoped>
.max-w-4xl {
    max-width: 64rem;
}
</style>
