import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchPosts from '../components/search/SearchPosts.vue'
import { useSearchStore } from '../stores/searchStore'
import { useUserStore } from '../stores/userStore'
import router from '../router'
import i18n from './i18n'
import pinia from '../pinia'

// Mock API service
vi.mock('../services/api', () => ({
    default: {
        search: vi.fn(),
        getSavedSearches: vi.fn(),
        deleteSavedSearch: vi.fn(),
    },
}))

// Mock router
vi.mock('vue-router', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}))

describe('SearchPosts', () => {
    let wrapper
    let searchStore
    let userStore

    beforeEach(() => {
        wrapper = mount(SearchPosts, {
            global: {
                plugins: [pinia, i18n, router],
            },
        })
        searchStore = useSearchStore()
        userStore = useUserStore()
    })

    it('1. Should handle successful search with valid session token', async () => {
        userStore.isLoggedIn = true
        searchStore.searchPosts.mockResolvedValue({
            code: '1000',
            data: [{ id: 1, keyword: 'test', created: new Date() }],
        })

        await wrapper.find('input#keyword').setValue('test')
        await wrapper.find('button').trigger('click')

        expect(searchStore.searchPosts).toHaveBeenCalled()
        expect(wrapper.text()).toContain('test')
    })

    it('2. Should redirect to login page with invalid session token', async () => {
        userStore.isLoggedIn = false
        searchStore.searchPosts.mockRejectedValue({ response: { status: 401 } })

        await wrapper.find('input#keyword').setValue('test')
        await wrapper.find('button').trigger('click')

        expect(router.push).toHaveBeenCalledWith('/login')
    })

    it('3. Should display "No results found" when search returns empty', async () => {
        userStore.isLoggedIn = true
        searchStore.searchPosts.mockResolvedValue({ code: '9994', data: [] })

        await wrapper.find('input#keyword').setValue('nonexistent')
        await wrapper.find('button').trigger('click')

        expect(wrapper.text()).toContain('No results found')
    })

    it('4. Should redirect to login page when user account is locked', async () => {
        userStore.isLoggedIn = true
        searchStore.searchPosts.mockRejectedValue({ response: { status: 403 } })

        await wrapper.find('input#keyword').setValue('test')
        await wrapper.find('button').trigger('click')

        expect(router.push).toHaveBeenCalledWith('/login')
    })

    it('5. Should normalize keywords before displaying', async () => {
        userStore.isLoggedIn = true
        searchStore.searchPosts.mockResolvedValue({
            code: '1000',
            data: [{ id: 1, keyword: ' Test  Keyword ', created: new Date() }],
        })

        await wrapper.find('input#keyword').setValue('test')
        await wrapper.find('button').trigger('click')

        expect(wrapper.text()).toContain('Test Keyword')
    })

    it('6. Should sort search results in correct order', async () => {
        userStore.isLoggedIn = true
        searchStore.searchPosts.mockResolvedValue({
            code: '1000',
            data: [
                { id: 2, keyword: 'Second', created: new Date(2023, 0, 2) },
                { id: 1, keyword: 'First', created: new Date(2023, 0, 1) },
                { id: 3, keyword: 'Third', created: new Date(2023, 0, 3) },
            ],
        })

        await wrapper.find('input#keyword').setValue('test')
        await wrapper.find('button').trigger('click')

        const results = wrapper.findAll('.search-result')
        expect(results[0].text()).toContain('Third')
        expect(results[1].text()).toContain('Second')
        expect(results[2].text()).toContain('First')
    })

    it('7. Should hide invalid search history items', async () => {
        userStore.isLoggedIn = true
        searchStore.getSavedSearches.mockResolvedValue({
            code: '1000',
            data: [
                { id: 1, keyword: 'Valid', created: new Date() },
                { id: null, keyword: 'Invalid', created: new Date() },
                { id: 2, keyword: '', created: new Date() },
                { id: 3, keyword: 'Valid2', created: null },
            ],
        })

        await wrapper.vm.$nextTick()

        const savedSearches = wrapper.findAll('.saved-search')
        expect(savedSearches).toHaveLength(2)
        expect(savedSearches[0].text()).toContain('Valid')
        expect(savedSearches[1].text()).toContain('Valid2')
    })

    it('8. Should limit search suggestions to 20 items', async () => {
        userStore.isLoggedIn = true
        const mockData = Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            keyword: `Keyword ${i + 1}`,
            created: new Date(),
        }))
        searchStore.getSavedSearches.mockResolvedValue({
            code: '1000',
            data: mockData,
        })

        await wrapper.vm.$nextTick()

        const savedSearches = wrapper.findAll('.saved-search')
        expect(savedSearches).toHaveLength(20)
    })

    it('9. Should display only the most recent duplicate keywords', async () => {
        userStore.isLoggedIn = true
        searchStore.getSavedSearches.mockResolvedValue({
            code: '1000',
            data: [
                { id: 1, keyword: 'Duplicate', created: new Date(2023, 0, 1) },
                { id: 2, keyword: 'Unique', created: new Date(2023, 0, 2) },
                { id: 3, keyword: 'Duplicate', created: new Date(2023, 0, 3) },
            ],
        })

        await wrapper.vm.$nextTick()

        const savedSearches = wrapper.findAll('.saved-search')
        expect(savedSearches).toHaveLength(2)
        expect(savedSearches[0].text()).toContain('Duplicate')
        expect(savedSearches[0].attributes('data-id')).toBe('3')
        expect(savedSearches[1].text()).toContain('Unique')
    })

    it('10. Should load more results when scrolling', async () => {
        userStore.isLoggedIn = true
        searchStore.searchPosts.mockResolvedValueOnce({
            code: '1000',
            data: Array.from({ length: 20 }, (_, i) => ({
                id: i + 1,
                keyword: `Keyword ${i + 1}`,
                created: new Date(),
            })),
        })

        await wrapper.find('input#keyword').setValue('test')
        await wrapper.find('button').trigger('click')

        // Simulate scrolling to bottom
        await wrapper.trigger('scroll')

        expect(searchStore.searchPosts).toHaveBeenCalledTimes(2)
        expect(searchStore.searchPosts.mock.calls[1][0].index).toBe(20)
    })
})