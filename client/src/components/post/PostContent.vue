<template>
    <div class="mb-4">
        <p class="text-gray-800 whitespace-pre-wrap" :class="{ 'line-clamp-3': !showFullContent }"
            v-html="sanitizedContent"></p>
        <button v-if="post.described.length > 300" @click="toggleContent"
            class="text-blue-500 hover:underline mt-2 focus:outline-none">
            {{ showFullContent ? t('collapse') : t('seeMore') }}
        </button>
        <div v-if="post.hashtags && post.hashtags.length > 0" class="mt-2">
            <span v-for="hashtag in post.hashtags" :key="hashtag"
                class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-blue-500 mr-2 mb-2 cursor-pointer hover:bg-gray-300 transition-colors duration-200">
                #{{ hashtag }}
            </span>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DOMPurify from 'dompurify'

const props = defineProps({
    post: {
        type: Object,
        required: true
    },
    showFullContent: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['toggleContent'])

const { t } = useI18n()

const sanitizedContent = computed(() => {
    return DOMPurify.sanitize(props.post.described)
})

const toggleContent = () => {
    emit('toggleContent')
}
</script>

<style scoped>
.line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>