<template>
    <div class="flex items-center justify-between mb-4">
        <!-- Like Button -->
        <button @click="debouncedHandleLike" class="flex items-center transition-colors duration-200" :class="[
            post.is_liked === '1' ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500',
            { 'opacity-50 cursor-not-allowed': isLiking }
        ]" :disabled="isLiking" :aria-label="post.is_liked === '1' ? t('unlike') : t('like')" role="button">
            <div class="relative w-5 h-5 mr-1">
                <ThumbsUpIcon :class="{ 'fill-current': post.is_liked === '1' }" class="w-5 h-5"
                    :style="{ opacity: isLiking ? '0.5' : '1' }" />
                <SpinnerIcon v-if="isLiking" class="absolute top-0 left-0 w-5 h-5 animate-spin" />
            </div>
            {{ formattedLikes.value }} {{ t('likes') }}
        </button>
        <!-- Comment Button -->
        <button @click="handleComment"
            class="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
            :aria-label="t('comment')" role="button">
            <MessageSquareIcon class="w-5 h-5 mr-1" />
            {{ formattedComments.value }} {{ t('comments') }}
        </button>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePostStore } from '../../stores/postStore'
import { storeToRefs } from 'pinia'
import { defineAsyncComponent } from 'vue'
import { debounce } from 'lodash-es'

const ThumbsUpIcon = defineAsyncComponent(() =>
    import('lucide-vue-next').then(mod => mod.ThumbsUpIcon)
)
const MessageSquareIcon = defineAsyncComponent(() =>
    import('lucide-vue-next').then(mod => mod.MessageSquareIcon)
)
const SpinnerIcon = defineAsyncComponent(() =>
    import('lucide-vue-next').then(mod => mod.Loader2Icon)
)

const props = defineProps({
    post: {
        type: Object,
        required: true
    }
})

const postStore = usePostStore()
const formattedComments = storeToRefs(postStore)
const formattedLikes = storeToRefs(postStore)

const { t } = useI18n()

const isLiking = ref(false)

const handleLike = async () => {
    if (isLiking.value) return
    isLiking.value = true
    try {
        await postStore.toggleLike(props.post.id)
    } finally {
        isLiking.value = false
    }
}

const debouncedHandleLike = debounce(handleLike, 300)

const handleComment = () => {
    postStore.focusCommentInput(props.post.id)
}
</script>

<style scoped>
button:disabled {
    pointer-events: none;
}
</style>
