<template>
    <div class="mb-4">
        <p class="text-gray-800 whitespace-pre-wrap" :class="{ 'line-clamp-3': !showFullContent }">
            <template v-for="(part, index) in parsedContent" :key="index">
                <span v-if="part.type === 'text'" v-html="preserveSpaces(part.content)"></span>
                <span v-else-if="part.type === 'hashtag'" @click.prevent="$emit('hashtagClick', part.content)"
                    class="cursor-pointer text-blue-500 hover:underline">
                    {{ part.content }}
                </span>
            </template>
        </p>
        <button v-if="post.described.length > 300" @click="toggleContent"
            class="text-blue-500 hover:underline mt-2 focus:outline-none">
            {{ showFullContent ? 'Collapse' : 'See More' }}
        </button>
    </div>
</template>

<script setup>
import { computed } from 'vue'
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

const emit = defineEmits(['toggleContent', 'hashtagClick'])

const parsedContent = computed(() => {
    const regex = /(#\w+)|\s+/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = regex.exec(props.post.described)) !== null) {
        if (lastIndex < match.index) {
            parts.push({ type: 'text', content: props.post.described.slice(lastIndex, match.index) })
        }
        if (match[1]) {
            parts.push({ type: 'hashtag', content: match[0] })
        } else {
            parts.push({ type: 'text', content: match[0] })
        }
        lastIndex = regex.lastIndex
    }

    if (lastIndex < props.post.described.length) {
        parts.push({ type: 'text', content: props.post.described.slice(lastIndex) })
    }

    return parts
})

const preserveSpaces = (text) => {
    // Replace spaces with non-breaking spaces, but allow line breaks
    const sanitizedText = DOMPurify.sanitize(text)
    return sanitizedText.replace(/ /g, '&nbsp;').replace(/\n/g, '<br>')
}

const toggleContent = () => {
    emit('toggleContent')
}
</script>

<style scoped>
.whitespace-pre-wrap {
    white-space: pre-wrap;
    word-wrap: break-word;
}
</style>
