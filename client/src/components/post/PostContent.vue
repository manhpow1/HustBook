<template>
    <div class="space-y-4">
        <div class="relative">
            <!-- Main content container -->
            <Card>
                <CardContent>
                    <p :class="[
                        'text-card-foreground whitespace-pre-wrap',
                        { 'line-clamp-3': !showFullContent }
                    ]" data-testid="post-content">
                        <template v-for="(part, index) in parsedContent" :key="index">
                            <!-- Regular text content -->
                            <span v-if="part.type === 'text'" v-html="preserveSpaces(part.content)" />

                            <!-- Hashtag content -->
                            <Button v-else-if="part.type === 'hashtag'" variant="link"
                                @click.prevent="handleHashtagClick(part.content)" class="p-0 h-auto font-normal"
                                role="link" tabindex="0" :aria-label="'View posts with hashtag ' + part.content">
                                {{ part.content }}
                            </Button>
                        </template>
                    </p>
                </CardContent>
            </Card>
            <!-- Toggle content button -->
            <Button v-if="shouldShowToggle" variant="ghost" @click="toggleContent" class="mt-2"
                :aria-expanded="showFullContent.toString()"
                :aria-label="showFullContent ? 'Show less content' : 'Show more content'"
                data-testid="toggle-content-button">
                <ChevronDown v-if="!showFullContent" class="h-4 w-4 mr-2" aria-hidden="true" />
                <ChevronUp v-else class="h-4 w-4 mr-2" aria-hidden="true" />
                {{ showFullContent ? 'Show less' : 'Show more' }}
            </Button>
        </div>
        <!-- Error Alert -->
        <Alert v-if="error" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-vue-next'
import { sanitizeOutput } from '../../utils/sanitize'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const props = defineProps({
    post: {
        type: Object,
        required: true,
        validator(post) {
            return post && typeof post.described === 'string'
        }
    },
    showFullContent: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['toggleContent', 'hashtagClick'])

// State
const error = ref(null)

// Computed
const parsedContent = computed(() => {
    try {
        const text = props.post.described
        const regex = /(#\w+)|\s+/g
        const parts = []
        let lastIndex = 0
        let match

        while ((match = regex.exec(text)) !== null) {
            // Add text before match if exists
            if (lastIndex < match.index) {
                parts.push({
                    type: 'text',
                    content: text.slice(lastIndex, match.index)
                })
            }

            // Add hashtag or whitespace
            if (match[1]) {
                parts.push({
                    type: 'hashtag',
                    content: match[0]
                })
            } else {
                parts.push({
                    type: 'text',
                    content: match[0]
                })
            }

            lastIndex = regex.lastIndex
        }

        // Add remaining text if exists
        if (lastIndex < text.length) {
            parts.push({
                type: 'text',
                content: text.slice(lastIndex)
            })
        }

        return parts
    } catch (err) {
        error.value = 'Error parsing content'
        return []
    }
})

const shouldShowToggle = computed(() => {
    return props.post.described.length > 300
})

// Methods
const preserveSpaces = (text) => {
    try {
        const sanitizedText = sanitizeOutput(text)
        return sanitizedText
            .replace(/ /g, '&nbsp;')
            .replace(/\n/g, '<br>')
    } catch (err) {
        error.value = 'Error formatting text'
        return text
    }
}

const handleHashtagClick = (hashtag) => {
    try {
        emit('hashtagClick', hashtag)
    } catch (err) {
        error.value = 'Error handling hashtag click'
    }
}

const toggleContent = () => {
    emit('toggleContent')
}
</script>

<style scoped>
:deep(.whitespace-pre-wrap) {
    white-space: pre-wrap;
    word-wrap: break-word;
}

:deep(.line-clamp-3) {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>