<template>
    <div class="markdown-editor" :class="{ 'fullscreen': isFullscreen }">
        <!-- Toolbar -->
        <div class="mb-2 flex flex-wrap gap-2 items-center">
            <ToolbarButton v-for="action in actions" :key="action.label" :icon="action.icon" :label="action.label"
                :shortcut="action.shortcut" @click="insertMarkdown(action.syntax)" data-testid="toolbar-button" />
            <Button @click="togglePreview" variant="secondary" class="px-2 py-1"
                :aria-label="showPreview ? 'Switch to edit mode' : 'Switch to preview mode'"
                data-testid="toggle-preview-button">
                {{ showPreview ? 'Edit' : 'Preview' }}
            </Button>
            <Button @click="undo" :disabled="!canUndo" variant="outline" class="px-2 py-1" aria-label="Undo (Ctrl+Z)"
                data-testid="undo-button">
                <UndoIcon class="w-4 h-4" />
            </Button>
            <Button @click="redo" :disabled="!canRedo" variant="outline" class="px-2 py-1" aria-label="Redo (Ctrl+Y)"
                data-testid="redo-button">
                <RedoIcon class="w-4 h-4" />
            </Button>
            <Button @click="toggleEmojiPicker" variant="outline" class="px-2 py-1" aria-label="Insert Emoji"
                data-testid="insert-emoji-button">
                <SmileIcon class="w-4 h-4" />
            </Button>
            <Button @click="toggleFullscreen" variant="outline" class="px-2 py-1"
                :aria-label="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
                data-testid="toggle-fullscreen-button">
                <component :is="isFullscreen ? MinimizeIcon : MaximizeIcon" class="w-4 h-4" />
            </Button>
            <Button @click="triggerFileUpload" variant="outline" class="px-2 py-1" aria-label="Insert Image"
                data-testid="insert-image-button">
                <ImageIcon class="w-4 h-4" />
            </Button>
            <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" class="hidden"
                aria-hidden="true" />
        </div>

        <!-- Editor Area -->
        <div v-if="!showPreview" class="relative">
            <textarea v-model="localContent" @input="updateContent" @keydown="handleKeyDown"
                class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :placeholder="placeholder" :rows="rows" ref="textarea" aria-label="Markdown editor"
                data-testid="markdown-textarea"></textarea>
            <!-- Emoji Picker -->
            <EmojiPicker v-if="showEmojiPicker" @select="insertEmoji"
                class="absolute bottom-full left-0 mb-2 bg-white border rounded shadow-lg p-2" />
        </div>

        <!-- Preview Area -->
        <div v-else class="markdown-preview p-2 border rounded bg-gray-50" aria-live="polite">
            <div v-html="renderedContent"></div>
        </div>

        <!-- Additional Information -->
        <div class="mt-2 text-sm text-gray-500">
            Markdown supported. You can use **bold**, *italic*, `code`, and more.
        </div>

        <!-- Autosave Status -->
        <div v-if="autosaveStatus" class="mt-2 text-sm text-green-500" aria-live="polite">
            {{ autosaveStatus }}
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import {
    BoldIcon, ItalicIcon, CodeIcon, ListIcon, LinkIcon, ImageIcon, QuoteIcon,
    UndoIcon, RedoIcon, SmileIcon, MaximizeIcon, MinimizeIcon
} from 'lucide-vue-next';
import { useUndoRedo } from '../../composables/useUndoRedo';
import { renderMarkdown } from '../../utils/markdown';
import { debounce } from 'lodash-es';

// Components
import ToolbarButton from '../ui/ToolbarButton.vue';
import Button from '@/components/ui/button';
import EmojiPicker from '../ui/EmojiPicker.vue';

// Props
const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
    placeholder: {
        type: String,
        default: 'Write your comment here...',
    },
    rows: {
        type: Number,
        default: 5,
    },
});

// Emits
const emit = defineEmits(['update:modelValue']);

// Reactive References
const localContent = ref(props.modelValue);
const showPreview = ref(false);
const isFullscreen = ref(false);
const showEmojiPicker = ref(false);
const fileInput = ref(null);
const textarea = ref(null);
const autosaveStatus = ref('');

// Undo/Redo Composable
const { undo, redo, canUndo, canRedo, addToHistory } = useUndoRedo(localContent);

// Toolbar Actions
const actions = [
    { label: 'Bold', syntax: '**', icon: BoldIcon, shortcut: 'Ctrl+B' },
    { label: 'Italic', syntax: '*', icon: ItalicIcon, shortcut: 'Ctrl+I' },
    { label: 'Code', syntax: '`', icon: CodeIcon, shortcut: 'Ctrl+`' },
    { label: 'List', syntax: '- ', icon: ListIcon },
    { label: 'Link', syntax: '[](url)', icon: LinkIcon, shortcut: 'Ctrl+K' },
    { label: 'Image', syntax: '![](url)', icon: ImageIcon, shortcut: 'Ctrl+Shift+I' },
    { label: 'Quote', syntax: '> ', icon: QuoteIcon },
];

// Computed Properties
const renderedContent = computed(() => renderMarkdown(localContent.value));

// Methods
const updateContent = () => {
    emit('update:modelValue', localContent.value);
    addToHistory(localContent.value);
    autosave();
};

const insertMarkdown = (syntax) => {
    const textareaEl = textarea.value;
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    const text = localContent.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    let insertText;
    let newSelectionStart;
    let newSelectionEnd;

    if (syntax === '[](url)' || syntax === '![](url)') {
        insertText = syntax.replace('url', selection || 'https://');
        newSelectionStart = start + syntax.indexOf('url');
        newSelectionEnd = end + syntax.indexOf('url') + (selection ? selection.length : 8);
    } else {
        insertText = syntax + selection + syntax;
        newSelectionStart = start + syntax.length;
        newSelectionEnd = end + syntax.length;
    }

    localContent.value = before + insertText + after;
    textareaEl.focus();
    textareaEl.setSelectionRange(newSelectionStart, newSelectionEnd);

    updateContent();
};

const togglePreview = () => {
    showPreview.value = !showPreview.value;
};

const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value;
    if (isFullscreen.value) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
};

const toggleEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value;
};

const insertEmoji = (emoji) => {
    const textareaEl = textarea.value;
    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    const text = localContent.value;
    const before = text.substring(0, start);
    const after = text.substring(end);

    localContent.value = before + emoji + after;
    textareaEl.focus();
    textareaEl.setSelectionRange(start + emoji.length, start + emoji.length);

    updateContent();
    showEmojiPicker.value = false;
};

const triggerFileUpload = () => {
    fileInput.value.click();
};

const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg');
                insertMarkdown(`![](${dataUrl})`);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

// Keyboard Shortcuts
const handleKeyDown = (event) => {
    if (event.ctrlKey) {
        switch (event.key.toLowerCase()) {
            case 'b':
                event.preventDefault();
                insertMarkdown('**');
                break;
            case 'i':
                event.preventDefault();
                insertMarkdown('*');
                break;
            case '`':
                event.preventDefault();
                insertMarkdown('`');
                break;
            case 'k':
                event.preventDefault();
                insertMarkdown('[](url)');
                break;
            case 'z':
                event.preventDefault();
                undo();
                break;
            case 'y':
                event.preventDefault();
                redo();
                break;
        }
    }

    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        triggerFileUpload();
    }
};

// Autosave Functionality
const autosave = debounce(() => {
    localStorage.setItem('markdown-editor-content', localContent.value);
    autosaveStatus.value = `Autosaved at ${new Date().toLocaleTimeString()}`;
    setTimeout(() => {
        autosaveStatus.value = '';
    }, 3000);
}, 1000);

// Watchers
watch(() => props.modelValue, (newValue) => {
    if (newValue !== localContent.value) {
        localContent.value = newValue;
    }
});

// Lifecycle Hooks
onMounted(() => {
    const savedContent = localStorage.getItem('markdown-editor-content');
    if (savedContent) {
        localContent.value = savedContent;
    }
    window.addEventListener('beforeunload', autosave);
});

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', autosave);
});
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

.loader {
    @apply ml-1 animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full;
}
</style>
