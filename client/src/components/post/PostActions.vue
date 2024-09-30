<template>
    <div class="flex items-center justify-between mb-4">
        <button @click="handleLike"
            class="flex items-center text-gray-500 hover:text-blue-500 transition-colors duration-200"
            :class="{ 'text-blue-500': post.is_liked === '1' }"
            :aria-label="post.is_liked === '1' ? t('unlike') : t('like')">
            <ThumbsUpIcon :class="{ 'text-blue-500 fill-current': post.is_liked === '1' }" class="w-5 h-5 mr-1" />
            {{ formatNumber(post.like) }} {{ t('likes') }}
        </button>
        <button @click="handleComment"
            class="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
            :aria-label="t('comment')">
            <MessageSquareIcon class="w-5 h-5 mr-1" />
            {{ formatNumber(post.comment) }} {{ t('comments') }}
        </button>
    </div>
</template>

<script setup>
import { ThumbsUpIcon, MessageSquareIcon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps({
    post: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['like', 'comment'])

const { t } = useI18n()

const handleLike = () => {
    emit('like')
}

const handleComment = () => {
    emit('comment')
}

const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num)
}
</script>