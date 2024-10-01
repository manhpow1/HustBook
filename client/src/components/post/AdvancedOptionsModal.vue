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
                <li>
                    <button @click="$emit('save')" class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded">
                        {{ t('savePost') }}
                    </button>
                </li>
                <li>
                    <button @click="$emit('copyLink')" class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded">
                        {{ t('copyLink') }}
                    </button>
                </li>
                <li v-if="!isOwnPost">
                    <button @click="$emit('report')"
                        class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded text-red-500">
                        {{ t('reportPost') }}
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
    }
})

const emit = defineEmits(['close', 'edit', 'save', 'copyLink', 'report'])

const { t } = useI18n()
</script>