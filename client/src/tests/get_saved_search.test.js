import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import SearchPosts from '../components/search/SearchPosts.vue';
import { useSearchStore } from '../stores/searchStore';
import { useUserStore } from '../stores/userStore';
import router from '../router';
import i18n from './i18n';

vi.spyOn(router, 'push').mockImplementation(() => { });

describe('SearchPosts.vue', () => {
    let wrapper;
    let searchStore;
    let userStore;

    beforeEach(async () => {
        // Initialize Pinia
        const pinia = createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
        });

        // Initialize Stores
        userStore = useUserStore(pinia);
        searchStore = useSearchStore(pinia);

        // Set User Data
        userStore.setUser({ id: 'testUser', username: 'testuser' });

        // Mock Methods
        searchStore.searchPosts = vi.fn();
        searchStore.getSavedSearches = vi.fn().mockResolvedValue({
            code: '1000',
            data: [
                { id: 1, keyword: 'Test Keyword', created: new Date() },
            ],
        });

        // Mount Component
        wrapper = mount(SearchPosts, {
            global: {
                plugins: [pinia, i18n, router],
            },
        });

        await wrapper.vm.$nextTick();

        // Clear mock calls after mounting to ignore initial search
        searchStore.searchPosts.mockClear();
    });

    it('1. Should handle successful search with valid session token', async () => {
        // Arrange
        searchStore.searchPosts.mockResolvedValueOnce();

        // Simulate search results
        searchStore.searchResults = [
            { id: 1, keyword: 'test', created: new Date(), author: { username: 'testuser' }, described: 'Test post' },
        ];

        // Act
        await wrapper.find('input#keyword').setValue('test');
        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick(); // Wait for DOM update

        // Assert
        expect(searchStore.searchPosts).toHaveBeenCalled();
        expect(wrapper.text()).toContain('testuser');
        expect(wrapper.text()).toContain('Test post');
    });

    it('2. Should normalize keywords before displaying', async () => {
        // Simulate saved searches
        await wrapper.vm.fetchSavedSearches();
        await wrapper.vm.$nextTick();

        // Verify normalized keyword
        const savedSearches = wrapper.findAll('.saved-search');
        expect(savedSearches[0].text()).toContain('Test Keyword');
    });

    it('3. Should display "No results found" when search returns empty', async () => {
        // Arrange
        searchStore.searchPosts.mockResolvedValueOnce();
        searchStore.searchResults = []; // No search results

        // Act
        await wrapper.find('input#keyword').setValue('nonexistent');
        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        // Assert
        expect(wrapper.text()).toContain('No results found');
    });

    it('4. Should redirect to login page when user account is locked', async () => {
        // Arrange
        searchStore.searchPosts.mockRejectedValue({ response: { status: 403 } });

        // Act
        await wrapper.find('input#keyword').setValue('test');
        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        // Assert
        expect(router.push).toHaveBeenCalledWith('/login');
    });

    it('5. Should normalize keywords before displaying', async () => {
        // Simulate saved searches
        await wrapper.vm.fetchSavedSearches();
        await wrapper.vm.$nextTick();

        // Verify normalized keyword
        const savedSearches = wrapper.findAll('.saved-search');
        expect(savedSearches[0].text()).toContain('Test Keyword');
    });

    it('6. Should sort search results in correct order', async () => {
        // Arrange
        searchStore.searchPosts.mockResolvedValueOnce();
        searchStore.searchResults = [
            { id: 2, keyword: 'Second', created: new Date(2023, 0, 2), author: { username: 'user2' }, described: 'Post 2' },
            { id: 1, keyword: 'First', created: new Date(2023, 0, 1), author: { username: 'user1' }, described: 'Post 1' },
            { id: 3, keyword: 'Third', created: new Date(2023, 0, 3), author: { username: 'user3' }, described: 'Post 3' },
        ];

        // Act
        await wrapper.find('input#keyword').setValue('test');
        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        const results = wrapper.findAll('.search-result');

        // Assert
        expect(results[0].text()).toContain('user3');
        expect(results[1].text()).toContain('user2');
        expect(results[2].text()).toContain('user1');
    });

    it('7. Should hide invalid search history items', async () => {
        // Arrange
        searchStore.getSavedSearches.mockResolvedValueOnce({
            code: '1000',
            data: [
                { id: 1, keyword: 'Valid', created: new Date() },
                { id: null, keyword: 'Invalid', created: new Date() },
                { id: 2, keyword: '', created: new Date() },
                { id: 3, keyword: 'Valid2', created: null },
            ],
        });
        await wrapper.vm.fetchSavedSearches();
        await wrapper.vm.$nextTick();

        // Act
        const savedSearches = wrapper.findAll('.saved-search');

        // Assert
        expect(savedSearches).toHaveLength(1);
        expect(savedSearches[0].text()).toContain('Valid');
    });

    it('8. Should limit search suggestions to 20 items', async () => {
        // Arrange
        const mockData = Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            keyword: `Keyword ${i + 1}`,
            created: new Date(),
        }));
        searchStore.getSavedSearches.mockResolvedValueOnce({
            code: '1000',
            data: mockData,
        });
        await wrapper.vm.fetchSavedSearches();
        await wrapper.vm.$nextTick();

        // Act
        const savedSearches = wrapper.findAll('.saved-search');

        // Assert
        expect(savedSearches).toHaveLength(20);
    });

    it('9. Should display only the most recent duplicate keywords', async () => {
        // Arrange
        searchStore.getSavedSearches.mockResolvedValueOnce({
            code: '1000',
            data: [
                { id: 1, keyword: 'Duplicate', created: new Date(2023, 0, 1) },
                { id: 2, keyword: 'Unique', created: new Date(2023, 0, 2) },
                { id: 3, keyword: 'Duplicate', created: new Date(2023, 0, 3) },
            ],
        });
        await wrapper.vm.fetchSavedSearches();
        await wrapper.vm.$nextTick();

        // Act
        const savedSearches = wrapper.findAll('.saved-search');

        // Assert
        expect(savedSearches).toHaveLength(2);
        expect(savedSearches[0].text()).toContain('Duplicate');
        expect(savedSearches[0].attributes('data-id')).toBe('3');
        expect(savedSearches[1].text()).toContain('Unique');
    });

    it('10. Should load more results when clicking load more button', async () => {
        // Arrange
        searchStore.searchPosts
            .mockResolvedValueOnce()
            .mockResolvedValueOnce();

        // Set initial results
        searchStore.searchResults = Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            keyword: `Keyword ${i + 1}`,
            created: new Date(),
            author: { username: `user${i + 1}` },
            described: `Post ${i + 1}`,
        }));

        // Act
        await wrapper.find('input#keyword').setValue('test');
        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        // Mock additional results
        const additionalResults = Array.from({ length: 10 }, (_, i) => ({
            id: i + 21,
            keyword: `Keyword ${i + 21}`,
            created: new Date(),
            author: { username: `user${i + 21}` },
            described: `Post ${i + 21}`,
        }));
        searchStore.searchResults = [...searchStore.searchResults, ...additionalResults];

        // Simulate clicking "Load More"
        await wrapper.find('button:last-child').trigger('click');
        await wrapper.vm.$nextTick();

        // Assert
        expect(searchStore.searchPosts).toHaveBeenCalledTimes(2);
        const results = wrapper.findAll('.search-result');
        expect(results).toHaveLength(30);
    });
});
