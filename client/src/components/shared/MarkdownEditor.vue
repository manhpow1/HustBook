<template>
    <div class="markdown-editor" :class="{ 'fullscreen': isFullscreen }">
        <div class="space-y-2">
            <div class="flex flex-wrap gap-2 items-center border-b pb-2">
                <TooltipProvider>
                <Tooltip v-for="action in actions" :key="action.label" :delayDuration="0">
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" @click="insertMarkdown(action.syntax)"
                            :aria-label="action.label" class="h-8 w-8 p-0" data-testid="toolbar-button">
                            <component :is="action.icon" class="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{{ action.label }}</p>
                        <p v-if="action.shortcut" class="text-xs text-muted-foreground">{{ action.shortcut }}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

                <Separator orientation="vertical" class="h-6" />

                <Button variant="ghost" size="sm" @click="togglePreview" class="gap-2">
                    <component :is="showPreview ? PencilIcon : EyeIcon" class="h-4 w-4" />
                    {{ showPreview ? 'Edit' : 'Preview' }}
                </Button>

                <Separator orientation="vertical" class="h-6" />

                <Button variant="ghost" size="sm" @click="toggleFullscreen" class="gap-2"
                    :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'">
                    <component :is="isFullscreen ? MinimizeIcon : MaximizeIcon" class="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="sm" @click="toggleEmojiPicker" class="gap-2" aria-label="Insert emoji">
                    <SmileIcon class="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="sm" @click="triggerFileUpload" class="gap-2" aria-label="Insert image">
                    <ImageIcon class="h-4 w-4" />
                </Button>
            </div>

            <div v-if="!showPreview" class="relative">
                <Textarea v-model="localContent" :rows="rows" :placeholder="placeholder" @input="onInput"
                    @keydown="handleKeyDown" ref="textarea" :maxLength="maxLength" class="resize-none w-full rounded-md"
                    :class="{
                        'h-[60vh]': isFullscreen,
                        'min-h-[100px]': !isFullscreen
                    }" data-testid="markdown-textarea" />

                <EmojiPicker v-if="showEmojiPicker" @select="insertEmoji" class="absolute bottom-full left-0 mb-2" />
            </div>

            <div v-else class="prose prose-sm max-w-none" :class="{
                'h-[60vh] overflow-auto': isFullscreen,
                'min-h-[100px]': !isFullscreen
            }" v-html="renderedContent" />

            <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" class="hidden"
                aria-hidden="true" />

            <div class="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                    {{ localContent.length }}/{{ maxLength }} characters
                </div>
                <div>
                    Markdown supported
                </div>
            </div>

            <div v-if="autosaveStatus" class="text-xs text-success" role="status" aria-live="polite">
                {{ autosaveStatus }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { BoldIcon, ItalicIcon, CodeIcon, ListIcon, LinkIcon, ImageIcon, QuoteIcon, UndoIcon, RedoIcon, SmileIcon, MaximizeIcon, MinimizeIcon, EyeIcon, PencilIcon } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import EmojiPicker from './EmojiPicker.vue';
import { useUndoRedo } from '../../composables/useUndoRedo';
import { renderMarkdown } from '../../utils/markdown';
import { debounce } from 'lodash-es';
import logger from '../../services/logging';

const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
    placeholder: {
        type: String,
        default: 'Write your content here...',
    },
    rows: {
        type: Number,
        default: 5,
    },
    maxLength: {
        type: Number,
        default: 1000,
    },
});

const emit = defineEmits(['update:modelValue']);

// State
const localContent = ref(props.modelValue);
const showPreview = ref(false);
const isFullscreen = ref(false);
const showEmojiPicker = ref(false);
const fileInput = ref(null);
const textarea = ref(null);
const autosaveStatus = ref('');

// Toolbar Actions
const actions = [
    { label: 'Bold', syntax: '**', icon: BoldIcon, shortcut: 'Ctrl+B' },
    { label: 'Italic', syntax: '*', icon: ItalicIcon, shortcut: 'Ctrl+I' },
    { label: 'Code', syntax: '`', icon: CodeIcon, shortcut: 'Ctrl+`' },
    { label: 'List', syntax: '- ', icon: ListIcon },
    { label: 'Link', syntax: '[](url)', icon: LinkIcon, shortcut: 'Ctrl+K' },
    { label: 'Quote', syntax: '> ', icon: QuoteIcon },
];

// Undo/Redo
const { undo, redo, canUndo, canRedo, addToHistory } = useUndoRedo(localContent);

// Computed
const renderedContent = computed(() => renderMarkdown(localContent.value));

// Methods
const onInput = () => {
    emit('update:modelValue', localContent.value);
    addToHistory(localContent.value);
    debouncedSaveDraft();
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

    if (syntax === '[](url)') {
        insertText = syntax.replace('url', selection || 'https://');
        newSelectionStart = start + syntax.indexOf('url');
        newSelectionEnd = end + syntax.indexOf('url') + (selection ? selection.length : 8);
    } else {
        insertText = syntax + selection + syntax;
        newSelectionStart = start + syntax.length;
        newSelectionEnd = end + syntax.length;
    }

    localContent.value = before + insertText + after;
    nextTick(() => {
        textareaEl.focus();
        textareaEl.setSelectionRange(newSelectionStart, newSelectionEnd);
    });
    onInput();
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
    nextTick(() => {
        textareaEl.focus();
        textareaEl.setSelectionRange(start + emoji.length, start + emoji.length);
    });
    onInput();
    showEmojiPicker.value = false;
};

const triggerFileUpload = () => {
    fileInput.value.click();
};

const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('File size must not exceed 5MB');
        }

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
    } catch (error) {
        logger.error('File upload error:', error);
        event.target.value = '';
    }
};

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

// Autosave
const debouncedSaveDraft = debounce(() => {
    localStorage.setItem('markdown-editor-content', localContent.value);
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

// Lifecycle
onMounted(() => {
    const savedContent = localStorage.getItem('markdown-editor-content');
    if (savedContent) {
        localContent.value = savedContent;
    }
});

onBeforeUnmount(() => {
    if (isFullscreen.value) {
        document.body.style.overflow = '';
    }
});
</script>

<style>
.markdown-editor {
    @apply transition-all duration-300 ease-in-out;
}

.markdown-editor.fullscreen {
    @apply fixed inset-0 z-50 bg-background p-4 overflow-auto;
}

.prose img {
    @apply rounded-md;
}

.prose pre {
    @apply bg-muted p-4 rounded-md overflow-x-auto;
}

.prose code {
    @apply bg-muted px-1.5 py-0.5 rounded-sm text-sm;
}

.prose blockquote {
    @apply border-l-4 border-muted pl-4 italic;
}

.prose a {
    @apply text-primary hover:underline;
}
</style>