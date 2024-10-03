<template>
    <div class="video-viewer">
        <video ref="videoPlayer" :src="videoUrl" class="max-w-full max-h-[90vh]" controls @play="onPlay"
            @pause="onPause" @ended="onEnded">
            Your browser does not support the video tag.
        </video>
        <div v-if="!isPlaying" class="absolute inset-0 flex items-center justify-center">
            <button @click="playVideo" class="bg-black bg-opacity-50 rounded-full p-4 focus:outline-none">
                <PlayIcon class="w-12 h-12 text-white" />
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { PlayIcon } from 'lucide-vue-next'

const props = defineProps({
    videoUrl: {
        type: String,
        required: true
    }
})

const videoPlayer = ref(null)
const isPlaying = ref(false)

const playVideo = () => {
    if (videoPlayer.value) {
        videoPlayer.value.play()
    }
}

const onPlay = () => {
    isPlaying.value = true
}

const onPause = () => {
    isPlaying.value = false
}

const onEnded = () => {
    isPlaying.value = false
}
</script>