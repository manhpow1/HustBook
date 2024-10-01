<template>
    <button @click="copyLink"
        class="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200">
        <LinkIcon class="w-5 h-5" />
        <span>Copy Link</span>
    </button>
</template>

<script setup>
import { ref } from 'vue'
import { LinkIcon } from 'lucide-vue-next'

const props = defineProps({
    postId: {
        type: String,
        required: true
    }
})

const copied = ref(false)

const copyLink = async () => {
    const link = `${window.location.origin}/post/${props.postId}`
    try {
        await navigator.clipboard.writeText(link)
        copied.value = true
        setTimeout(() => {
            copied.value = false
        }, 2000)
    } catch (err) {
        console.error('Failed to copy link: ', err)
    }
}
</script>