<template>
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-6 text-gray-800">Posts with #{{ hashtag }}</h1>

        <div v-if="loading" class="space-y-6">
            <PostSkeleton v-for="i in 3" :key="i" />
        </div>

        <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert">
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline">{{ error }}</span>
            <button @click="fetchPosts" class="mt-2 text-sm underline">Retry</button>
        </div>

        <div v-else-if="posts.length > 0">
            <TransitionGroup name="post-list" tag="div" class="space-y-6">
                <PostItem v-for="post in posts" :key="post.id" :post="post" />
            </TransitionGroup>
            <div v-if="hasMorePosts" ref="loadMoreTrigger" class="h-10 flex justify-center items-center mt-4">
                <LoaderIcon v-if="loadingMore" class="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        </div>

        <p v-else class="text-gray-500">No posts found with this hashtag.</p>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { usePostStore } from '../store/post'
import PostSkeleton from '../components/shared/PostSkeleton.vue'
import PostItem from '../components/shared/PostItem.vue'
import { LoaderIcon } from 'lucide-vue-next'
import { useInfiniteScroll } from '@vueuse/core'

const route = useRoute()
const postStore = usePostStore()

const hashtag = ref('')
const posts = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const error = ref(null)
const hasMorePosts = ref(true)
const loadMoreTrigger = ref(null)

const fetchPosts = async (loadMore = false) => {
    if (loadMore) {
        if (!hasMorePosts.value || loadingMore.value) return
        loadingMore.value = true
    } else {
        loading.value = true
        posts.value = []
    }

    try {
        const newPosts = await postStore.fetchPostsByHashtag(hashtag.value, loadMore)
        if (newPosts.length === 0) {
            hasMorePosts.value = false
        } else {
            posts.value = loadMore ? [...posts.value, ...newPosts] : newPosts
        }
    } catch (err) {
        console.error('Error fetching posts:', err)
        error.value = 'Failed to load posts. Please try again later.'
    } finally {
        loading.value = false
        loadingMore.value = false
    }
}

useInfiniteScroll(
    loadMoreTrigger,
    () => {
        if (hasMorePosts.value && !loadingMore.value) {
            fetchPosts(true)
        }
    },
    { distance: 10 }
)

watch(() => route.params.hashtag, (newHashtag) => {
    hashtag.value = newHashtag
    fetchPosts()
})

onMounted(() => {
    hashtag.value = route.params.hashtag
    fetchPosts()
})
</script>

<style scoped>
.post-list-enter-active,
.post-list-leave-active {
    transition: all 0.5s ease;
}

.post-list-enter-from,
.post-list-leave-to {
    opacity: 0;
    transform: translateY(30px);
}
</style>