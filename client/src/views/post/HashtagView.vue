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
                <div v-for="post in posts" :key="post.id" class="bg-white shadow rounded-lg p-6">
                    <!-- Replace this with your actual post rendering logic -->
                    <h2 class="text-xl font-semibold mb-2">{{ post.title }}</h2>
                    <p>{{ post.content }}</p>
                </div>
            </TransitionGroup>
            <div v-if="hasMorePosts" ref="loadMoreTrigger" class="h-10 flex justify-center items-center mt-4">
                <LoaderIcon v-if="loading" class="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        </div>

        <p v-else class="text-gray-500">No posts found with this hashtag.</p>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePostStore } from '../../stores/postStore'
import PostSkeleton from '../components/shared/PostSkeleton.vue'
import { LoaderIcon } from 'lucide-vue-next'
import { useInfiniteScroll } from '@vueuse/core'
import { storeToRefs } from 'pinia'

const route = useRoute()
const postStore = usePostStore()

const { posts, loading, error, hasMorePosts } = storeToRefs(postStore)

const hashtag = ref('')
const loadMoreTrigger = ref(null)

const fetchPosts = async (loadMore = false) => {
    await postStore.fetchPostsByHashtag(hashtag.value, loadMore)
}

useInfiniteScroll(
    loadMoreTrigger,
    () => {
        if (hasMorePosts.value && !loading.value) {
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