<template>
    <div class="mb-4">
        <p class="text-gray-800 whitespace-pre-wrap" :class="{ 'line-clamp-3': !showFullContent }"
            data-testid="post-content">
            <template v-for="(part, index) in parsedContent" :key="index">
                <span v-if="part.type === 'text'" v-html="preserveSpaces(part.content)"></span>
                <span v-else-if="part.type === 'hashtag'" @click.prevent="handleHashtagClick(part.content)"
                    class="cursor-pointer text-blue-500 hover:underline" role="link" tabindex="0"
                    @keydown.enter="handleHashtagClick(part.content)"
                    aria-label="View posts with hashtag {{ part.content }}">
                    {{ part.content }}
                </span>
            </template>
        </p>
        <button v-if="shouldShowToggle" @click="toggleContent"
            class="text-blue-500 hover:underline mt-2 focus:outline-none" aria-label="Toggle full post content"
            data-testid="toggle-content-button">
            {{ showFullContent ? 'Collapse' : 'See More' }}
        </button>
    </div>
</template>


<script setup>
import { computed } from 'vue';
import { sanitizeOutput } from '../../utils/sanitize';
import { useErrorHandler } from '../../composables/useErrorHandler';
import { useDebounce } from '../../composables/useDebounce';

// Define component props
const props = defineProps({
    post: {
        type: Object,
        required: true
    },
    showFullContent: {
        type: Boolean,
        default: false
    }
});

// Define component emits
const emit = defineEmits(['toggleContent', 'hashtagClick']);

// Initialize error handler
const { handleError } = useErrorHandler();

// Computed property to parse post content into text and hashtags
const parsedContent = computed(() => {
    const regex = /(#\w+)|\s+/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(props.post.described)) !== null) {
        if (lastIndex < match.index) {
            parts.push({ type: 'text', content: props.post.described.slice(lastIndex, match.index) });
        }
        if (match[1]) {
            parts.push({ type: 'hashtag', content: match[0] });
        } else {
            parts.push({ type: 'text', content: match[0] });
        }
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < props.post.described.length) {
        parts.push({ type: 'text', content: props.post.described.slice(lastIndex) });
    }

    return parts;
});

// Method to preserve spaces and handle line breaks
const preserveSpaces = (text) => {
    // Use sanitizeOutput to sanitize the content
    const sanitizedText = sanitizeOutput(text);
    // Replace spaces with non-breaking spaces and handle line breaks
    return sanitizedText.replace(/ /g, '&nbsp;').replace(/\n/g, '<br>');
};

// Method to handle hashtag clicks with debouncing to prevent rapid clicks
const handleHashtagClick = useDebounce((hashtag) => {
    try {
        emit('hashtagClick', hashtag);
    } catch (error) {
        handleError(error);
    }
}, 300);

// Computed property to determine if toggle button should be shown
const shouldShowToggle = computed(() => {
    return props.post.described.length > 300;
});

// Method to toggle content visibility
const toggleContent = () => {
    emit('toggleContent');
};
</script>

<style scoped>
.whitespace-pre-wrap {
    white-space: pre-wrap;
    word-wrap: break-word;
}

.line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

button:focus {
    outline: 2px solid #4299e1;
    /* Tailwind's focus ring equivalent */
    outline-offset: 2px;
}

.cursor-pointer {
    cursor: pointer;
}
</style>
