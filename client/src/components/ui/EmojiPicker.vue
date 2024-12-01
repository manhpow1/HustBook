<template>
    <div class="emoji-picker" @click.outside="closePicker" ref="pickerRef">
        <div class="grid grid-cols-5 gap-2 p-2">
            <button v-for="emoji in filteredEmojis" :key="emoji" @click="selectEmoji(emoji)"
                class="text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                :aria-label="`Insert ${emoji} emoji`" data-testid="emoji-button">
                {{ emoji }}
            </button>
        </div>
        <div v-if="filteredEmojis.length === 0" class="p-2 text-gray-500 text-center">
            No emojis found.
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useClickOutside } from '@vueuse/core'; // Using VueUse for detecting clicks outside

// Props
const props = defineProps({
    commonEmojis: {
        type: Array,
        default: () => ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '✅'],
    },
    searchEnabled: {
        type: Boolean,
        default: false,
    },
});

// Emits
const emit = defineEmits(['select', 'close']);

// References
const pickerRef = ref(null);
const searchQuery = ref('');

// Click Outside Handling
useClickOutside(pickerRef, () => {
    emit('close');
});

// Filtered Emojis (for search functionality)
const filteredEmojis = computed(() => {
    if (props.searchEnabled && searchQuery.value.trim() !== '') {
        return props.commonEmojis.filter((emoji) =>
            emoji.toLowerCase().includes(searchQuery.value.toLowerCase())
        );
    }
    return props.commonEmojis;
});

// Select Emoji
const selectEmoji = (emoji) => {
    emit('select', emoji);
    emit('close');
};

</script>

<style scoped>
.emoji-picker {
    @apply absolute bottom-full left-0 mb-2 bg-white border border-gray-300 rounded shadow-lg z-50;
}

.emoji-picker button:hover {
    @apply bg-gray-100;
}

@media (max-width: 640px) {
    .emoji-picker {
        @apply grid-cols-4;
    }
}
</style>
