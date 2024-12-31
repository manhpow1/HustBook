<template>
    <div class="video-player relative w-full" ref="playerContainer">
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2Icon class="h-8 w-8 animate-spin text-white" />
        </div>

        <video ref="videoRef" class="w-full rounded-lg" :src="video.url" @loadedmetadata="onVideoLoaded"
            @timeupdate="onTimeUpdate" @ended="onVideoEnded" @error="onVideoError" :poster="video.thumbnail"
            :aria-label="video.title" preload="metadata">
            <track v-if="video.captions" kind="captions" :src="video.captions" />
            Your browser does not support the video tag.
        </video>

        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-4">
            <div class="flex items-center gap-4">
                <Button variant="ghost" size="icon" @click="togglePlay" :aria-label="isPlaying ? 'Pause' : 'Play'">
                    <PlayIcon v-if="!isPlaying" class="h-6 w-6 text-white" />
                    <PauseIcon v-else class="h-6 w-6 text-white" />
                </Button>

                <div class="flex-1">
                    <Slider v-model="progress" @change="onProgressChange" :max="100" :step="0.1" class="w-full" />
                    <p class="mt-1 text-sm text-white">
                        {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                    </p>
                </div>

                <div class="flex items-center gap-2">
                    <Button variant="ghost" size="icon" @click="toggleMute" :aria-label="isMuted ? 'Unmute' : 'Mute'">
                        <VolumeXIcon v-if="isMuted" class="h-6 w-6 text-white" />
                        <Volume2Icon v-else class="h-6 w-6 text-white" />
                    </Button>

                    <Select v-model="playbackRate">
                        <SelectTrigger class="w-20 text-white">
                            <SelectValue :placeholder="playbackRate + 'x'" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-for="rate in [0.5, 1, 1.5, 2]" :key="rate" :value="rate">
                                {{ rate }}x
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="ghost" size="icon" @click="toggleFullscreen"
                        :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'">
                        <MaximizeIcon v-if="!isFullscreen" class="h-6 w-6 text-white" />
                        <MinimizeIcon v-else class="h-6 w-6 text-white" />
                    </Button>
                </div>
            </div>
        </div>

        <Alert v-if="error" variant="destructive" class="absolute top-4 right-4">
            <AlertCircleIcon class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Loader2Icon, PlayIcon, PauseIcon, VolumeXIcon, Volume2Icon, MaximizeIcon, MinimizeIcon, AlertCircleIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useLocalStorage } from '@vueuse/core'

const props = defineProps({
    video: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['error', 'ended'])

// States
const videoRef = ref(null)
const playerContainer = ref(null)
const loading = ref(true)
const error = ref(null)
const isPlaying = ref(false)
const isMuted = ref(false)
const progress = ref(0)
const currentTime = ref(0)
const duration = ref(0)
const playbackRate = useLocalStorage('video-playback-rate', 1)
const isFullscreen = ref(false)

// Video event handlers
const onVideoLoaded = () => {
    loading.value = false
    duration.value = videoRef.value.duration
}

const onTimeUpdate = () => {
    currentTime.value = videoRef.value.currentTime
    progress.value = (currentTime.value / duration.value) * 100
}

const onVideoEnded = () => {
    isPlaying.value = false
    emit('ended')
}

const onVideoError = (e) => {
    loading.value = false
    error.value = 'Failed to load video'
    emit('error', e)
}

// Controls
const togglePlay = () => {
    if (videoRef.value.paused) {
        videoRef.value.play()
        isPlaying.value = true
    } else {
        videoRef.value.pause()
        isPlaying.value = false
    }
}

const toggleMute = () => {
    videoRef.value.muted = !videoRef.value.muted
    isMuted.value = videoRef.value.muted
}

const onProgressChange = (value) => {
    const time = (value / 100) * duration.value
    videoRef.value.currentTime = time
    currentTime.value = time
}

const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
        await playerContainer.value.requestFullscreen()
        isFullscreen.value = true
    } else {
        await document.exitFullscreen()
        isFullscreen.value = false
    }
}

watch(playbackRate, (rate) => {
    if (videoRef.value) {
        videoRef.value.playbackRate = rate
    }
})

// Format time 
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Keyboard controls
const handleKeydown = (e) => {
    switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
            e.preventDefault()
            togglePlay()
            break
        case 'm':
            toggleMute()
            break
        case 'f':
            toggleFullscreen()
            break
        case 'arrowleft':
            videoRef.value.currentTime -= 5
            break
        case 'arrowright':
            videoRef.value.currentTime += 5
            break
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.video-player {
    aspect-ratio: 16 / 9;
}
</style>