<template>
    <div class="w-[320px] h-[400px] bg-background rounded-lg border shadow-lg">
        <div class="p-2 border-b">
            <Input v-model="searchQuery" placeholder="Search emoji..." class="h-8">
            <template #prefix>
                <SearchIcon class="h-4 w-4 text-muted-foreground" />
            </template>
            </Input>
        </div>

        <ScrollArea class="h-[calc(400px-48px)]">
            <!-- Recent Emojis -->
            <div v-if="recentEmojis.length" class="p-2 space-y-2">
                <h3 class="text-xs font-medium text-muted-foreground px-2">Recent</h3>
                <div class="grid grid-cols-8 gap-1">
                    <Button v-for="emoji in recentEmojis" :key="emoji" variant="ghost" size="icon" class="h-8 w-8"
                        @click="selectEmoji(emoji)" @keydown.enter="selectEmoji(emoji)">
                        <span class="text-lg">{{ emoji }}</span>
                    </Button>
                </div>
            </div>

            <!-- Categories -->
            <div class="p-2 space-y-4">
                <div v-for="category in filteredCategories" :key="category.name" class="space-y-2">
                    <h3 class="text-xs font-medium text-muted-foreground px-2 flex items-center gap-2">
                        <component :is="category.icon" class="h-4 w-4" />
                        {{ category.name }}
                    </h3>
                    <div class="grid grid-cols-8 gap-1">
                        <Button v-for="emoji in category.emojis" :key="emoji" variant="ghost" size="icon"
                            class="h-8 w-8 hover:bg-accent" @click="selectEmoji(emoji)"
                            @keydown.enter="selectEmoji(emoji)">
                            <span class="text-lg">{{ emoji }}</span>
                        </Button>
                    </div>
                </div>
            </div>
        </ScrollArea>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { SearchIcon, SmileIcon, HeartIcon, UserIcon, LeafIcon, CoffeeIcon, ActivityIcon, HashIcon } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

const CATEGORIES = [
    {
        name: 'Smileys',
        icon: SmileIcon,
        emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘']
    },
    {
        name: 'Emotions',
        icon: HeartIcon,
        emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨']
    },
    {
        name: 'People',
        icon: UserIcon,
        emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅']
    },
    {
        name: 'Nature',
        icon: LeafIcon,
        emojis: ['🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝']
    },
    {
        name: 'Food',
        icon: CoffeeIcon,
        emojis: ['☕', '🍺', '🍷', '🥃', '🍶', '🍵', '🥤', '🧃', '🧉', '🍹', '🍸', '🍻', '🥂', '🥛', '🍼']
    },
    {
        name: 'Activities',
        icon: ActivityIcon,
        emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑']
    },
    {
        name: 'Symbols',
        icon: HashIcon,
        emojis: ['💯', '✨', '💫', '💥', '💢', '💤', '💦', '💨', '💪', '👊', '✊', '🤛', '🤜', '👏', '🙌']
    }
]

const props = defineProps({
    maxRecent: {
        type: Number,
        default: 16
    }
})

const emit = defineEmits(['select', 'close'])

const searchQuery = ref('')
const recentEmojis = ref([])

const filteredCategories = computed(() => {
    if (!searchQuery.value) return CATEGORIES

    const query = searchQuery.value.toLowerCase()
    return CATEGORIES.map(category => ({
        ...category,
        emojis: category.emojis.filter(emoji => {
            return emoji.toLowerCase().includes(query)
        })
    })).filter(category => category.emojis.length > 0)
})

const saveToRecent = (emoji) => {
    const recent = new Set([emoji, ...recentEmojis.value])
    recentEmojis.value = Array.from(recent).slice(0, props.maxRecent)
    localStorage.setItem('recent-emojis', JSON.stringify(recentEmojis.value))
}

const selectEmoji = (emoji) => {
    saveToRecent(emoji)
    emit('select', emoji)
}

onMounted(() => {
    try {
        const saved = localStorage.getItem('recent-emojis')
        if (saved) {
            recentEmojis.value = JSON.parse(saved)
        }
    } catch (error) {
        console.error('Failed to load recent emojis:', error)
    }
})
</script>