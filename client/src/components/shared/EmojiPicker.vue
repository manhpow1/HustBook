<template>
    <div class="w-[280px] p-0">
        <Command>
            <CommandInput v-if="searchEnabled" placeholder="Search emoji..." v-model="searchQuery" />
            <CommandList>
                <CommandEmpty v-if="filteredEmojis.length === 0">
                    No emoji found.
                </CommandEmpty>
                <CommandGroup>
                    <ScrollArea class="h-[200px]">
                        <div class="grid grid-cols-8 gap-2 p-2">
                            <Button v-for="emoji in filteredEmojis" :key="emoji" variant="ghost" size="icon"
                                class="h-8 w-8" @click="selectEmoji(emoji)" :aria-label="`Select ${emoji} emoji`">
                                <span class="text-lg">{{ emoji }}</span>
                            </Button>
                        </div>
                    </ScrollArea>
                </CommandGroup>
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
    commonEmojis: {
        type: Array,
        default: () => [
            '😀', '😂', '😊', '🥰', '😎',
            '🤔', '😴', '😭', '😤', '😱',
            '👍', '👎', '👋', '👏', '🙌',
            '🎉', '✨', '❤️', '🔥', '⭐',
            '🌟', '💯', '✅', '❌', '💪',
            '🙏', '🤝', '🎈', '🎁', '🎨',
            '🌈', '☀️', '⛅', '🌙', '⚡',
            '💫', '🌺', '🌸', '🍀', '🌿'
        ],
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
const filteredEmojis = computed(() => {
    if (!searchQuery.value) return props.commonEmojis;

    const query = searchQuery.value.toLowerCase();
    return props.commonEmojis.filter(emoji => {
        // Unicode name search would be better, but this is a simple implementation
        return emoji.toLowerCase().includes(query);
    });
});

// Select emoji handler
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