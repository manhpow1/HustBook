<template>
    <div class="w-[280px] p-0">
        <Command>
            <CommandInput v-if="searchEnabled" placeholder="Search emoji..." v-model="searchQuery" />
            <CommandList>
                <CommandEmpty v-if="Object.keys(filteredCategories).length === 0">
                    No emoji found.
                </CommandEmpty>
                <ScrollArea class="h-[300px]">
                    <CommandGroup v-for="(emojis, category) in filteredCategories" :key="category" :heading="category">
                        <div class="grid grid-cols-8 gap-2 p-2">
                            <Button v-for="emoji in emojis" :key="emoji" variant="ghost" size="icon" class="h-8 w-8 relative group"
                                @click="selectEmoji(emoji)" :aria-label="`Select ${emoji} emoji`">
                                <span class="text-lg">{{ emoji }}</span>
                                <span class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
                                    {{ getEmojiName(emoji, category) }}
                                </span>
                            </Button>
                        </div>
                    </CommandGroup>
                </ScrollArea>
                <Separator v-if="recentEmojis.length > 0" />
                <CommandGroup v-if="recentEmojis.length > 0" heading="Recently Used">
                    <div class="grid grid-cols-8 gap-2 p-2">
                        <Button v-for="emoji in recentEmojis" :key="emoji" variant="ghost" size="icon" class="h-8 w-8"
                            @click="selectEmoji(emoji)" :aria-label="`Select ${emoji} emoji`">
                            <span class="text-lg">{{ emoji }}</span>
                        </Button>
                    </div>
                </CommandGroup>
            </CommandList>
        </Command>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const STORAGE_KEY = 'recent-emojis';
const MAX_RECENT = 16;

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    emojiCategories: {
        type: Object,
        default: () => ({
            "Smileys & Emotion": ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘'],
            "Gestures & People": ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈'],
            "Hearts & Love": ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💕', '💞', '💓', '💗', '💖'],
            "Nature & Animals": ['🌸', '💐', '🌹', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🐶', '🐱', '🐭', '🐹', '🐰'],
            "Activities": ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🎮', '🎲', '🧩', '🎭', '🎨', '🎬'],
            "Food & Drink": ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥']
        })
    },
    searchEnabled: {
        type: Boolean,
        default: true,
    },
    categories: {
        type: Array,
        default: () => ['Recently Used', 'Smileys', 'Gestures', 'Objects', 'Nature', 'Symbols'],
    },
});

const emit = defineEmits(['select', 'close']);

// State
const searchQuery = ref('');
const recentEmojis = ref([]);

// Load recent emojis from localStorage
const loadRecentEmojis = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            recentEmojis.value = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Failed to load recent emojis:', error);
    }
};

// Save recent emojis to localStorage
const saveRecentEmojis = (emoji) => {
    try {
        const recent = new Set([emoji, ...recentEmojis.value]);
        recentEmojis.value = Array.from(recent).slice(0, MAX_RECENT);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentEmojis.value));
    } catch (error) {
        console.error('Failed to save recent emojis:', error);
    }
};

// Filtered emojis based on search query
const filteredCategories = computed(() => {
    if (!searchQuery.value) return props.emojiCategories;

    const query = searchQuery.value.toLowerCase();
    const filtered = {};

    Object.entries(props.emojiCategories).forEach(([category, emojis]) => {
        const matchingEmojis = emojis.filter(emoji => {
            // Search in both emoji and category name
            return emoji.toLowerCase().includes(query) ||
                category.toLowerCase().includes(query);
        });

        if (matchingEmojis.length > 0) {
            filtered[category] = matchingEmojis;
        }
    });

    return filtered;
});

// Select emoji handler
const getEmojiName = (emoji, category) => {
    // Simple mapping of emoji to descriptive names
    const emojiNames = {
        '😀': 'Grinning Face',
        '😃': 'Grinning Face with Big Eyes',
        '😄': 'Grinning Face with Smiling Eyes',
        '😁': 'Beaming Face with Smiling Eyes',
        '😅': 'Grinning Face with Sweat',
        '😂': 'Face with Tears of Joy',
        '🤣': 'Rolling on the Floor Laughing',
        '😊': 'Smiling Face with Smiling Eyes',
        '😇': 'Smiling Face with Halo',
        '🙂': 'Slightly Smiling Face',
        '😉': 'Winking Face',
        '😌': 'Relieved Face',
        '😍': 'Smiling Face with Heart-Eyes',
        '🥰': 'Smiling Face with Hearts',
        '😘': 'Face Blowing a Kiss',
        // Add more emoji names as needed
    };
    
    return emojiNames[emoji] || `${category} Emoji`;
};

const selectEmoji = (emoji) => {
    saveRecentEmojis(emoji);
    emit('select', emoji);
    emit('close');
};

// Load recent emojis on mount
onMounted(() => {
    loadRecentEmojis();
});
</script>
