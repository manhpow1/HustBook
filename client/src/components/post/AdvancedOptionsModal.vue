<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-80">
            <h2 class="text-xl font-bold mb-4">{{ t('advancedOptions') }}</h2>
            <ul class="space-y-2">
                <li v-if="isOwnPost">
                    <button @click="$emit('edit')" class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded">
                        {{ t('editPost') }}
                    </button>
                </li>
                <li v-if="isOwnPost">
                    <button @click="$emit('delete')"
                        class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded text-red-500">
                        {{ t('deletePost') }}
                    </button>
                </li>
                <li v-if="isOwnPost">
                    <button @click="$emit('toggleComments')"
                        class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded">
                        {{ post.can_comment === '1' ? t('turnOffComments') : t('turnOnComments') }}
                    </button>
                </li>
                <li v-if="!isOwnPost">
                    <button @click="$emit('report')"
                        class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded text-red-500">
                        {{ t('reportPost') }}
                    </button>
                </li>
                <li v-if="!isOwnPost">
                    <button @click="$emit('hide')" class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded">
                        {{ t('hidePost') }}
                    </button>
                </li>
            </ul>
            <button @click="$emit('close')"
                class="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300">
                {{ t('close') }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const props = defineProps({
    isOwnPost: {
        type: Boolean,
        required: true
    },
    post: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'edit', 'delete', 'toggleComments', 'report', 'hide'])

const { t } = useI18n()
</script>