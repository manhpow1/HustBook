<template>
    <div>
        <div v-if="post.image && post.image.length > 0" class="mb-4">
            <div v-if="post.image.length === 1" @click="openLightbox(0)"
                class="cursor-pointer rounded-lg overflow-hidden">
                <img v-if="!post.image[0].covered" :src="post.image[0].url" :alt="post.described"
                    class="w-full h-auto object-cover" loading="lazy">
                <div v-else class="w-full h-64 bg-gray-200 flex items-center justify-center">
                    <p class="text-gray-600">This image is covered</p>
                    <button @click.stop="uncoverMedia(post.image[0].id)"
                        class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg">
                        Uncover
                    </button>
                </div>
            </div>
            <div v-else-if="post.image.length === 2" class="grid grid-cols-2 gap-2">
                <div v-for="(img, index) in post.image" :key="img.id"
                    class="relative overflow-hidden rounded-lg cursor-pointer" @click="openLightbox(index)">
                    <img v-if="!img.covered" :src="img.url" :alt="post.described" class="w-full h-48 object-cover"
                        loading="lazy">
                    <div v-else class="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <p class="text-gray-600">This image is covered</p>
                        <button @click.stop="uncoverMedia(img.id)"
                            class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg">
                            Uncover
                        </button>
                    </div>
                </div>
            </div>
            <div v-else-if="post.image.length === 3" class="grid grid-cols-2 gap-2">
                <div class="relative overflow-hidden rounded-lg cursor-pointer row-span-2" @click="openLightbox(0)">
                    <img v-if="!post.image[0].covered" :src="post.image[0].url" :alt="post.described"
                        class="w-full h-full object-cover" loading="lazy">
                    <div v-else class="w-full h-full bg-gray-200 flex items-center justify-center">
                        <p class="text-gray-600">This image is covered</p>
                        <button @click.stop="uncoverMedia(post.image[0].id)"
                            class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg">
                            Uncover
                        </button>
                    </div>
                </div>
                <div v-for="index in [1, 2]" :key="post.image[index].id"
                    class="relative overflow-hidden rounded-lg cursor-pointer" @click="openLightbox(index)">
                    <img v-if="!post.image[index].covered" :src="post.image[index].url" :alt="post.described"
                        class="w-full h-48 object-cover" loading="lazy">
                    <div v-else class="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <p class="text-gray-600">This image is covered</p>
                        <button @click.stop="uncoverMedia(post.image[index].id)"
                            class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg">
                            Uncover
                        </button>
                    </div>
                </div>
            </div>
            <div v-else-if="post.image.length >= 4" class="grid grid-cols-2 gap-2">
                <div v-for="(img, index) in visibleImages" :key="img.id"
                    class="relative overflow-hidden rounded-lg cursor-pointer" @click="openLightbox(index)">
                    <img v-if="!img.covered" :src="img.url" :alt="post.described" class="w-full h-48 object-cover"
                        loading="lazy">
                    <div v-else class="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <p class="text-gray-600">This image is covered</p>
                        <button @click.stop="uncoverMedia(img.id)"
                            class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg">
                            Uncover
                        </button>
                    </div>
                    <div v-if="index === 3 && post.image.length > 4"
                        class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-2xl font-bold">
                        +{{ post.image.length - 4 }}
                    </div>
                </div>
            </div>
        </div>

        <div v-if="post.video && post.video.length > 0" class="mb-4">
            <div class="relative">
                <video v-if="!post.video[0].covered" :src="post.video[0].url"
                    class="w-full h-auto rounded-lg cursor-pointer" @click="openLightbox(0)">
                    Your browser does not support the video tag.
                </video>
                <div v-else class="w-full h-64 bg-gray-200 flex items-center justify-center rounded-lg">
                    <p class="text-gray-600">This video is covered</p>
                    <button @click.stop="uncoverMedia(post.video[0].id)"
                        class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg">
                        Uncover
                    </button>
                </div>
                <div v-if="!post.video[0].covered" class="absolute inset-0 flex items-center justify-center">
                    <PlayIcon
                        class="w-16 h-16 text-white opacity-75 hover:opacity-100 transition-opacity duration-200" />
                </div>
            </div>
        </div>

        <MediaViewer v-if="showLightbox" :isOpen="showLightbox" :mediaList="mediaList" :initialIndex="currentMediaIndex"
            :likes="post.like" :comments="post.comment" :isLiked="post.is_liked === '1'" @close="closeLightbox"
            @like="handleLike" @comment="handleComment" />
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PlayIcon } from 'lucide-vue-next'
import MediaViewer from '../shared/MediaViewer.vue'

const props = defineProps({
    post: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['uncoverMedia', 'like', 'comment'])

const showLightbox = ref(false)
const currentMediaIndex = ref(0)

const visibleImages = computed(() => {
    return props.post.image?.slice(0, 4) || []
})

const mediaList = computed(() => {
    if (props.post.video && props.post.video.length > 0) {
        return [{ type: 'video', url: props.post.video[0].url, covered: props.post.video[0].covered }]
    }
    return props.post.image?.slice(0, 4).map(img => ({
        type: 'image',
        url: img.url,
        alt: props.post.described,
        covered: img.covered
    })) || []
})

const openLightbox = (index) => {
    currentMediaIndex.value = index
    showLightbox.value = true
}

const closeLightbox = () => {
    showLightbox.value = false
}

const uncoverMedia = (mediaId) => {
    emit('uncoverMedia', mediaId)
}

const handleLike = () => {
    emit('like')
}

const handleComment = () => {
    emit('comment')
}
</script>