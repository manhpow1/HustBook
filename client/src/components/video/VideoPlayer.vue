<template>
    <div class="video-player relative">
        <video ref="videoRef" :src="video.url" class="w-full" @click="togglePlay" @dblclick="toggleFullscreen"
            @loadedmetadata="onVideoLoaded" @timeupdate="onTimeUpdate" @volumechange="onVolumeChange"></video>
        <div class="video-controls absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center">
                    <button @click="togglePlay" class="text-white mr-2">
                        <PlayIcon v-if="!isPlaying" class="w-6 h-6" />
                        <PauseIcon v-else class="w-6 h-6" />
                    </button>
                    <input type="range" min="0" max="1" step="0.1" v-model="volume" @input="setVolume" class="w-24" />
                </div>
                <div class="flex items-center">
                    <button @click="togglePictureInPicture" class="text-white mr-2">
                        <MinimizeIcon class="w-6 h-6" />
                    </button>
                    <button @click="openVideoMenu" class="text-white">
                        <MoreVerticalIcon class="w-6 h-6" />
                    </button>
                </div>
            </div>
            <div class="mt-2">
                <progress :value="progress" max="100" class="w-full"></progress>
            </div>
        </div>
        <VideoMenu v-if="isMenuOpen" :video="video" @close="closeVideoMenu" @report="reportVideo"
            @add-friend="addFriend" @block="blockUploader" />
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { PlayIcon, PauseIcon, MinimizeIcon, MoreVerticalIcon } from 'lucide-vue-next';
import VideoMenu from './VideoMenu.vue';
import { useVideoStore } from '../../stores/videoStore';

const props = defineProps({
    video: {
        type: Object,
        required: true
    }
});

const videoStore = useVideoStore();
const videoRef = ref(null);
const isPlaying = ref(false);
const volume = ref(0);
const progress = ref(0);
const isMenuOpen = ref(false);

let autoplayTimeout;

const togglePlay = () => {
    if (videoRef.value.paused) {
        videoRef.value.play();
        isPlaying.value = true;
    } else {
        videoRef.value.pause();
        isPlaying.value = false;
    }
};

const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        videoRef.value.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
};

const setVolume = () => {
    videoRef.value.volume = volume.value;
};

const togglePictureInPicture = async () => {
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await videoRef.value.requestPictureInPicture();
        }
    } catch (error) {
        console.error('Failed to enter/exit picture-in-picture mode:', error);
    }
};

const openVideoMenu = () => {
    isMenuOpen.value = true;
};

const closeVideoMenu = () => {
    isMenuOpen.value = false;
};

const reportVideo = () => {
    // TODO: Implement report video functionality
    console.log('Report video:', props.video.id);
    closeVideoMenu();
};

const addFriend = () => {
    // TODO: Implement add friend functionality
    console.log('Add friend:', props.video.uploader.id);
    closeVideoMenu();
};

const blockUploader = () => {
    // TODO: Implement block uploader functionality
    console.log('Block uploader:', props.video.uploader.id);
    closeVideoMenu();
};

const onVideoLoaded = () => {
    videoRef.value.muted = true;
};

const onTimeUpdate = () => {
    progress.value = (videoRef.value.currentTime / videoRef.value.duration) * 100;
};

const onVolumeChange = () => {
    volume.value = videoRef.value.volume;
};

const startAutoplayTimeout = () => {
    clearTimeout(autoplayTimeout);
    autoplayTimeout = setTimeout(() => {
        if (videoRef.value.paused) {
            videoRef.value.play();
            isPlaying.value = true;
        }
    }, 3000);
};

onMounted(() => {
    videoRef.value.addEventListener('pause', startAutoplayTimeout);
});

onUnmounted(() => {
    clearTimeout(autoplayTimeout);
    if (videoRef.value) {
        videoRef.value.removeEventListener('pause', startAutoplayTimeout);
    }
});
</script>

<style scoped>
.video-player {
    /* Add any additional styling here */
    position: relative;
}
</style>