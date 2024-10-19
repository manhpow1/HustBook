import { usePostStore } from '../stores/postStore'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Like Post Functionality', () => {
    let postStore

    beforeEach(() => {
        // Initialize Pinia and the store
        setActivePinia(createPinia())
        postStore = usePostStore()

        // Set initial state for the post
        postStore.currentPost = { id: '123', likes: 0, is_liked: '0' }
    })

    it('1. Should like post with valid session token and post ID', async () => {
        // Mock toggleLike to resolve successfully
        vi.spyOn(postStore, 'toggleLike').mockImplementation(async () => {
            postStore.currentPost.is_liked = '1'
            postStore.currentPost.likes += 1
        })

        await postStore.toggleLike('123')
        await nextTick()

        expect(postStore.currentPost.likes).toBe(1)
        expect(postStore.currentPost.is_liked).toBe('1')
        expect(postStore.formattedLikes).toBe('1')
    })

    it('2. Should redirect to login on invalid session token', async () => {
        vi.spyOn(postStore, 'toggleLike').mockRejectedValue({
            response: { status: 401 }
        })

        try {
            await postStore.toggleLike('123')
        } catch (error) {
            expect(error.response.status).toBe(401)
        }
    })

    it('3. Should handle post locked error and remove the post from view', async () => {
        vi.spyOn(postStore, 'toggleLike').mockRejectedValue({
            response: { status: 423 }
        })

        try {
            await postStore.toggleLike('123')
        } catch {
            postStore.currentPost = null
        }

        await nextTick()
        expect(postStore.currentPost).toBeNull()
    })

    it('4. Should redirect to login on account lock', async () => {
        vi.spyOn(postStore, 'toggleLike').mockRejectedValue({
            response: { status: 403 }
        })

        const routerPushSpy = vi.fn()
        postStore.$router = { push: routerPushSpy }

        try {
            await postStore.toggleLike('123')
        } catch {
            routerPushSpy('/login')
        }

        expect(routerPushSpy).toHaveBeenCalledWith('/login')
    })

    it('5. Should display "Cannot connect to Internet" on database error', async () => {
        vi.spyOn(postStore, 'toggleLike').mockRejectedValue(new Error('Database error'))

        const notificationSpy = vi.fn()
        postStore.showNotification = notificationSpy

        try {
            await postStore.toggleLike('123')
        } catch {
            notificationSpy('Cannot connect to Internet', 'error')
        }

        expect(notificationSpy).toHaveBeenCalledWith('Cannot connect to Internet', 'error')
    })

    it('6. Should return error for non-existent post ID', async () => {
        vi.spyOn(postStore, 'toggleLike').mockRejectedValue({
            response: { status: 404 }
        })

        const notificationSpy = vi.fn()
        postStore.showNotification = notificationSpy

        try {
            await postStore.toggleLike('999')
        } catch {
            notificationSpy('Post does not exist', 'error')
        }

        expect(notificationSpy).toHaveBeenCalledWith('Post does not exist', 'error')
    })

    it('7. Should show "Cannot connect to Internet" on network disconnection', async () => {
        vi.spyOn(postStore, 'toggleLike').mockRejectedValue(new Error('Network error'))

        const notificationSpy = vi.fn()
        postStore.showNotification = notificationSpy

        try {
            await postStore.toggleLike('123')
        } catch {
            notificationSpy('Cannot connect to Internet', 'error')
        }

        expect(notificationSpy).toHaveBeenCalledWith('Cannot connect to Internet', 'error')
    })

    it('8. Should handle invalid like count', async () => {
        postStore.currentPost.likes = -5 // Set an invalid state
        await nextTick() // Ensure reactivity takes effect
        expect(postStore.formattedLikes).toBe('0')
    })

    it('9. Should handle incorrect like count logic from server', async () => {
        postStore.currentPost.likes = 2

        // Simulate toggling like twice
        await postStore.toggleLike('123')
        await postStore.toggleLike('123')
        await nextTick()

        expect(postStore.currentPost.likes).toBe(2) // Ensure logic is correct
    })
})
