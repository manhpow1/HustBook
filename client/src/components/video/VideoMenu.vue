<template>
    <div class="video-menu absolute top-0 right-0 bg-white shadow-lg rounded-lg p-4">
        <button @click="$emit('report')" class="block w-full text-left py-2 hover:bg-gray-100">
            Report Video
        </button>
        <button v-if="!isFriend" @click="$emit('add-friend')" class="block w-full text-left py-2 hover:bg-gray-100">
            Add Friend
        </button>
        <button @click="$emit('block')" class="block w-full text-left py-2 hover:bg-gray-100">
            Block Uploader
        </button>
        <button @click="$emit('close')" class="block w-full text-left py-2 hover:bg-gray-100">
            Close
        </button>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '../../stores/userStore';

const props = defineProps({
    video: {
        type: Object,
        required: true
    }
});

const userStore = useUserStore();

const isFriend = computed(() => {
    return userStore.isFriendWith(props.video.uploader.id);
});

defineEmits(['report', 'add-friend', 'block', 'close']);
</script>