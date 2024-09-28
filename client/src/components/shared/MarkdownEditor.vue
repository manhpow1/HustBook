<template>
    <div class="markdown-editor" :class="{ 'fullscreen': isFullscreen }">
        <div class="mb-2 flex flex-wrap gap-2 items-center">
            <button v-for="action in actions" :key="action.label" @click="insertMarkdown(action.syntax)"
                class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                :title="action.label + (action.shortcut ? ` (${action.shortcut})` : '')" :aria-label="action.label">
                <component :is="action.icon" class="w-4 h-4" />
            </button>
            <button @click="togglePreview"
                class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                :aria-label="showPreview ? 'Switch to edit mode' : 'Switch to preview mode'">
                {{ showPreview ? 'Edit' : 'Preview' }}
            </button>
            <button @click="undo" :disabled="!canUndo"
                class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                title="Undo (Ctrl+Z)" aria-label="Undo">
                <UndoIcon class="w-4 h-4" />
            </button>
            <button @click="redo" :disabled="!canRedo"
                class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                title="Redo (Ctrl+Y)" aria-label="Redo">
                <RedoIcon class="w-4 h-4" />
            </button>
            <button @click="openEmojiPicker"
                class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                title="Insert Emoji" aria-label="Insert Emoji">
                <SmileIcon class="w-4 h-4" />
            </button>
            <button @click="toggleFullscreen"
                class="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
                :aria-label="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'">
                <component :is="isFullscreen ? MinimizeIcon : MaximizeIcon" class="w-4 h-4" />
            </button>
            <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" class="hidden"
                aria-hidden="true" />
        </div>
        <div v-if="!showPreview" class="relative">
            <textarea v-model="localContent" @input="updateContent" @keydown="handleKeyDown"
                class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :placeholder="placeholder" :rows="rows" ref="textarea" aria-label="Markdown editor"></textarea>
            <div v-if="showEmojiPicker" class="absolute bottom-full left-0 mb-2 bg-white border rounded shadow-lg p-2">
                <button v-for="emoji in commonEmojis" :key="emoji" @click="insertEmoji(emoji)"
                    class="p-1 hover:bg-gray-100 rounded" :aria-label="`Insert ${emoji} emoji`">
                    {{ emoji }}
                </button>
            </div>
        </div>
        <div v-else class="markdown-preview p-2 border rounded bg-gray-50" aria-live="polite">
            <div v-html="renderedContent"></div>
        </div>
        <div class="mt-2 text-sm text-gray-500">
            Markdown supported. You can use **bold**, *italic*, `code`, and more.
        </div>
        <div v-if="autosaveStatus" class="mt-2 text-sm text-green-500" aria-live="polite">
            {{ autosaveStatus }}
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
    BoldIcon, ItalicIcon, CodeIcon, ListIcon, LinkIcon, ImageIcon, QuoteIcon,
    UndoIcon, RedoIcon, SmileIcon, MaximizeIcon, MinimizeIcon
} from 'lucide-vue-next'
import { useUndoRedo } from '../../composables/useUndoRedo'
import { renderMarkdown } from '../../utils/markdown'

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    placeholder: {
        type: String,
        default: 'Write your comment here...'
    },
    rows: {
        type: Number,
        default: 5
    }
})

const emit = defineEmits(['update:modelValue'])

const localContent = ref(props.modelValue)
const showPreview = ref(false)
const isFullscreen = ref(false)
const showEmojiPicker = ref(false)
const fileInput = ref(null)
const textarea = ref(null)
const autosaveStatus = ref('')

const { undo, redo, canUndo, canRedo, addToHistory } = useUndoRedo(localContent)

const actions = [
    { label: 'Bold', syntax: '**', icon: BoldIcon, shortcut: 'Ctrl+B' },
    { label: 'Italic', syntax: '*', icon: ItalicIcon, shortcut: 'Ctrl+I' },
    { label: 'Code', syntax: '`', icon: CodeIcon, shortcut: 'Ctrl+`' },
    { label: 'List', syntax: '- ', icon: ListIcon },
    { label: 'Link', syntax: '[](url)', icon: LinkIcon, shortcut: 'Ctrl+K' },
    { label: 'Image', syntax: '![](url)', icon: ImageIcon, shortcut: 'Ctrl+Shift+I' },
    { label: 'Quote', syntax: '> ', icon: QuoteIcon },
]

const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '✅']

const renderedContent = computed(() => renderMarkdown(localContent.value))

const updateContent = () => {
    emit('update:modelValue', localContent.value)
    addToHistory(localContent.value)
    autosave()
}

const insertMarkdown = (syntax) => {
    const textareaEl = textarea.value
    const start = textareaEl.selectionStart
    const end = textareaEl.selectionEnd
    const text = localContent.value
    const before = text.substring(0, start)
    const selection = text.substring(start, end)
    const after = text.substring(end)

    if (syntax === '[](url)' || syntax === '![](url)') {
        const insertText = syntax.replace('url', selection || 'https://')
        localContent.value = before + insertText + after
        textareaEl.focus()
        textareaEl.setSelectionRange(start + syntax.indexOf('url'), end + syntax.indexOf('url') + (selection ? selection.length : 8))
    } else {
        localContent.value = before + syntax + selection + syntax + after
        textareaEl.focus()
        textareaEl.setSelectionRange(start + syntax.length, end + syntax.length)
    }

    updateContent()
}

const togglePreview = () => {
    showPreview.value = !showPreview.value
}

const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value
    if (isFullscreen.value) {
        document.body.style.overflow = 'hidden'
    } else {
        document.body.style.overflow = ''
    }
}

const openEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value
}

const insertEmoji = (emoji) => {
    const textareaEl = textarea.value
    const start = textareaEl.selectionStart
    const end = textareaEl.selectionEnd
    const text = localContent.value
    const before = text.substring(0, start)
    const after = text.substring(end)

    localContent.value = before + emoji + after
    textareaEl.focus()
    textareaEl.setSelectionRange(start + emoji.length, start + emoji.length)

    updateContent()
    showEmojiPicker.value = false
}

const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                const MAX_WIDTH = 800
                const MAX_HEIGHT = 600
                let width = img.width
                let height = img.height

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width
                        width = MAX_WIDTH
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height
                        height = MAX_HEIGHT
                    }
                }

                canvas.width = width
                canvas.height = height
                ctx.drawImage(img, 0, 0, width, height)

                const dataUrl = canvas.toDataURL('image/jpeg')
                insertMarkdown(`![](${dataUrl})`)
            }
            img.src = e.target.result
        }
        reader.readAsDataURL(file)
    }
}

const handleKeyDown = (event) => {
    if (event.ctrlKey) {
        switch (event.key) {
            case 'b':
                event.preventDefault()
                insertMarkdown('**')
                break
            case 'i':
                event.preventDefault()
                insertMarkdown('*')
                break
            case '`':
                event.preventDefault()
                insertMarkdown('`')
                break
            case 'k':
                event.preventDefault()
                insertMarkdown('[](url)')
                break
            case 'z':
                event.preventDefault()
                undo()
                break
            case 'y':
                event.preventDefault()
                redo()
                break
        }
    } else if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault()
        fileInput.value.click()
    }
}

const autosave = () => {
    localStorage.setItem('markdown-editor-content', localContent.value)
    autosaveStatus.value = 'Autosaved at ' + new Date().toLocaleTimeString()
    setTimeout(() => {
        autosaveStatus.value = ''
    }, 3000)
}

watch(() => props.modelValue, (newValue) => {
    if (newValue !== localContent.value) {
        localContent.value = newValue
    }
})

onMounted(() => {
    const savedContent = localStorage.getItem('markdown-editor-content')
    if (savedContent) {
        localContent.value = savedContent
    }
    window.addEventListener('beforeunload', autosave)
})

onUnmounted(() => {
    window.removeEventListener('beforeunload', autosave)
})
</script>

<style scoped>
.markdown-editor {
    @apply transition-all duration-300 ease-in-out;
}

.markdown-editor.fullscreen {
    @apply fixed inset-0 z-50 bg-white p-4 overflow-auto;
}

.markdown-preview :deep(h1) {
    @apply text-2xl font-bold mb-2;
}

.markdown-preview :deep(h2) {
    @apply text-xl font-bold mb-2;
}

.markdown-preview :deep(h3) {
    @apply text-lg font-bold mb-2;
}

.markdown-preview :deep(p) {
    @apply mb-2;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
    @apply pl-5 mb-2;
}

.markdown-preview :deep(li) {
    @apply mb-1;
}

.markdown-preview :deep(code) {
    @apply bg-gray-100 rounded px-1;
}

.markdown-preview :deep(pre) {
    @apply bg-gray-100 rounded p-2 mb-2 overflow-x-auto;
}

.markdown-preview :deep(blockquote) {
    @apply border-l-4 border-gray-300 pl-4 italic mb-2;
}

.markdown-preview :deep(a) {
    @apply text-blue-500 hover:underline;
}

.markdown-preview :deep(img) {
    @apply max-w-full h-auto;
}
</style>