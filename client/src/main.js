import { createApp } from 'vue'
import { createHead } from '@vueuse/head'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import './styles/index.css'
import { useUserState } from './stores/userState'
import { useUserStore } from './stores/userStore'

const userStore = useUserStore()
const { checkAuth } = useUserState()
const messages = {
    en: {
        postNotFound: 'Post not found',
        invalidSession: 'Invalid session',
        errorLoadingPost: 'Error loading post',
        postNotAvailable: 'Post is not available',
        retry: 'Retry',
        comment: 'Comment',
        comments: 'Comments',
        share: 'Share',
        writeComment: 'Write a comment',
        postComment: 'Post Comment',
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
        advancedOptions: 'Advanced Options',
        details: 'Details',
        provideDetails: 'Please provide additional details',
        reportFailed: 'Failed to submit report. Please try again later.',
        reportPost: 'Report Post',
        selectReason: 'Select a Reason',
        selectReasonPlaceholder: 'Please select a reason',
        reasonOptions: {
            spam: 'Spam',
            inappropriateContent: 'Inappropriate Content',
            harassment: 'Harassment',
            hateSpeech: 'Hate Speech',
            violence: 'Violence',
            other: 'Other',
        },
        submitReport: 'Submit Report',
        submitting: 'Submitting...',
        reportSubmittedSuccess: 'Report submitted successfully.',
        pleaseSelectReason: 'Please select a reason.',
        pleaseProvideDetails: 'Please provide additional details.',
        charactersRemaining: 'Characters remaining: {count}',
        databaseError: 'Unable to connect to the database. Please try again later.',
        postNotFound: 'The post you are looking for does not exist.',
    },
}

const pinia = createPinia()

if (userStore.token) {
    userStore.fetchUser()
}

const i18n = createI18n({
    locale: 'en',
    messages,
});

async function initApp() {
    try {
        await checkAuth();
        const app = createApp(App);
        const head = createHead();
        app.use(router);
        app.use(head);
        app.use(i18n);
        console.log('Loaded i18n messages:', messages.en);
        app.use(pinia);
        app.mount('#app');
    } catch (error) {
        console.error('Error during app initialization:', error);
    }
}

initApp()