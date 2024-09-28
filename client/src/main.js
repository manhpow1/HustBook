import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/index.css'
import { useUserState } from './store/user-state'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'

const { checkAuth } = useUserState()
const i18n = createI18n({
    locale: 'en',
    messages: {
        en: {
            like: 'Like',
            likes: 'Likes',
            unlike: 'Unlike',
            edit: 'Edit',
            delete: 'Delete',
            cancel: 'Cancel',
            save: 'Save',
            confirmDelete: 'Confirm Delete',
            deleteWarning: 'Are you sure you want to delete this comment?',
            editComment: 'Edit comment',
            editCommentPlaceholder: 'Edit your comment here',
            saveEditError: 'Failed to save edit. Please try again.',
            deleteError: 'Failed to delete comment. Please try again.',
            likeError: 'Failed to update like status. Please try again.',
            errorFetchingComments: 'Failed to load comments. Please try again.',
        },
        // Add other languages as needed
    }
})
const pinia = createPinia()

async function initApp() {
    await checkAuth()
    const app = createApp(App)
    app.use(router)
    app.use(i18n)
    app.use(pinia)
    app.mount('#app')
}

initApp()