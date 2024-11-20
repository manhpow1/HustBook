import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import SearchPosts from '../components/search/SearchPosts.vue';
import flushPromises from 'flush-promises';
import { useSearchStore } from '../stores/searchStore';
import { useUserStore } from '../stores/userStore';
import router from '../router';
import * as useSearchModule from '../composables/useSearch';
import { ref, computed } from 'vue';
import i18n from './i18n';

// Mock vue-router
vi.spyOn(router, 'push').mockImplementation(() => { });

describe('SearchPosts.vue', () => {
    let wrapper;
    let searchStore;
    let userStore;

    const defaultSavedSearches = [
        { id: 1, keyword: 'test1', created: Date.now() },
        { id: 2, keyword: 'test2', created: Date.now() },
    ];

    const keyword = ref('test');
    const userId = ref('');

    const createWrapper = async (savedSearchesData = defaultSavedSearches) => {
        const pinia = createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
        });

        searchStore = useSearchStore(pinia);
        userStore = useUserStore(pinia);

        userStore.setUser({ id: 'testUser' });
        userStore.isLoggedIn = computed(() => true);

        // Mock useSearch
        vi.spyOn(useSearchModule, 'useSearch').mockReturnValue({
            keyword,
            userId,
            selectedFilter: ref(''),
            debouncedSearch: vi.fn(),
        });

        // Mock getSavedSearches before mounting
        searchStore.getSavedSearches = vi.fn(() => Promise.resolve({ data: savedSearchesData }));

        wrapper = mount(SearchPosts, {
            global: {
                plugins: [pinia, router, i18n],
            },
        });

        await flushPromises(); // Ensure all promises are resolved before proceeding
    };

    beforeEach(async () => {
        // Reset keyword and userId before each test
        keyword.value = 'test';
        userId.value = '';

        await createWrapper();

        searchStore.searchPosts = vi.fn().mockResolvedValue();
        searchStore.deleteSavedSearch = vi.fn().mockResolvedValue();
        router.push.mockClear(); // Clear router.push mock calls before each test
    });

    it('1. Successfully deletes a saved search', async () => {
        // Verify that the saved searches are loaded
        expect(wrapper.vm.normalizedSavedSearches.length).toBe(2);

        // Mock deleteSavedSearch
        searchStore.deleteSavedSearch = vi.fn(() => Promise.resolve());

        // Update getSavedSearches to return the updated list after deletion
        searchStore.getSavedSearches.mockImplementation(() =>
            Promise.resolve({ data: [defaultSavedSearches[1]] })
        );

        const deleteButtons = wrapper.findAll('[data-testid="delete-button"]');
        expect(deleteButtons.length).toBe(2);

        await deleteButtons[0].trigger('click');
        await flushPromises(); // Wait for all promises to resolve

        expect(searchStore.deleteSavedSearch).toHaveBeenCalledWith(1);
        expect(searchStore.deleteSavedSearch).toHaveBeenCalledTimes(1);

        // Verify that the saved searches have been updated
        expect(wrapper.vm.normalizedSavedSearches.length).toBe(1);
        expect(wrapper.html()).toContain('test2');
    });

    it('2. Redirects to login page when session is invalid', async () => {
        // Arrange
        await createWrapper([defaultSavedSearches[0]]);
        searchStore.deleteSavedSearch.mockRejectedValue({ response: { status: 401 } });

        // Act
        const deleteButton = wrapper.find('[data-testid="delete-button"]');
        expect(deleteButton.exists()).toBe(true);

        await deleteButton.trigger('click');
        await flushPromises();

        // Assert
        expect(router.push).toHaveBeenCalledWith('/login');
    });

    it('3. Handles error when search_id does not exist', async () => {
        await createWrapper([defaultSavedSearches[0]]);

        searchStore.deleteSavedSearch = vi.fn(() =>
            Promise.reject({ response: { status: 404, data: { code: '9992' } } })
        );
        console.error = vi.fn();

        const deleteButton = wrapper.find('[data-testid="delete-button"]');
        expect(deleteButton.exists()).toBe(true);

        await deleteButton.trigger('click');
        await flushPromises();

        expect(console.error).toHaveBeenCalledWith(
            'Error deleting saved search with ID 1:',
            expect.any(Object)
        );
    });

    it('4. Redirects to login page when account is locked', async () => {
        await createWrapper([defaultSavedSearches[0]]);

        searchStore.deleteSavedSearch.mockRejectedValue({ response: { status: 403 } });

        const deleteButton = wrapper.find('[data-testid="delete-button"]');
        expect(deleteButton.exists()).toBe(true);

        await deleteButton.trigger('click');
        await flushPromises();

        expect(router.push).toHaveBeenCalledWith('/login');
    });

    it('5. Handles invalid search_id parameter', async () => {
        await createWrapper([defaultSavedSearches[0]]);

        searchStore.deleteSavedSearch = vi.fn(() =>
            Promise.reject({ response: { status: 400, data: { code: '1004' } } })
        );
        console.error = vi.fn();

        const deleteButton = wrapper.find('[data-testid="delete-button"]');
        expect(deleteButton.exists()).toBe(true);

        await deleteButton.trigger('click');
        await flushPromises();

        expect(console.error).toHaveBeenCalledWith(
            'Error deleting saved search with ID 1:',
            expect.any(Object)
        );
    });

    it('6. Handles server error when deleting search history', async () => {
        await createWrapper([defaultSavedSearches[0]]);

        searchStore.deleteSavedSearch = vi.fn(() =>
            Promise.reject({ response: { status: 500, data: { code: '9999' } } })
        );
        console.error = vi.fn();

        const deleteButton = wrapper.find('[data-testid="delete-button"]');
        expect(deleteButton.exists()).toBe(true);

        await deleteButton.trigger('click');
        await flushPromises();

        expect(console.error).toHaveBeenCalledWith(
            'Error deleting saved search with ID 1:',
            expect.any(Object)
        );
    });

    it('7. Cancels delete operation when component is unmounted', async () => {
        await createWrapper([defaultSavedSearches[0]]);

        const deleteSavedSearchSpy = vi.spyOn(wrapper.vm, 'deleteSavedSearch');

        const deleteButton = wrapper.find('[data-testid="delete-button"]');
        expect(deleteButton.exists()).toBe(true);

        // Start the delete operation
        deleteButton.trigger('click');

        // Unmount the component before the promise resolves
        wrapper.unmount();

        expect(deleteSavedSearchSpy).toHaveBeenCalled();
    });

    it('8. Handles empty search history when deleting all', async () => {
        await createWrapper([]);

        const deleteAllButton = wrapper.find('[data-testid="delete-all-button"]');
        expect(deleteAllButton.exists()).toBe(false);

        // Since there are no saved searches, the delete all button should not exist
    });

    it('9. Successfully deletes all saved searches', async () => {
        await createWrapper();

        searchStore.deleteSavedSearch = vi.fn(() => Promise.resolve());

        // Mock getSavedSearches to return empty data after deletion
        searchStore.getSavedSearches.mockImplementation(() => Promise.resolve({ data: [] }));

        const deleteAllButton = wrapper.find('[data-testid="delete-all-button"]');
        expect(deleteAllButton.exists()).toBe(true);

        await deleteAllButton.trigger('click');
        await flushPromises();

        expect(searchStore.deleteSavedSearch).toHaveBeenCalledWith(null, true);
        expect(wrapper.findAll('.saved-search').length).toBe(0);
    });

    it('10. Handles invalid parameters when deleting saved search', async () => {
        await createWrapper([defaultSavedSearches[0]]);

        searchStore.deleteSavedSearch = vi.fn(() =>
            Promise.reject({ response: { status: 400, data: { code: '1004' } } })
        );
        console.error = vi.fn();

        const deleteButton = wrapper.find('[data-testid="delete-button"]');
        expect(deleteButton.exists()).toBe(true);

        await deleteButton.trigger('click');
        await flushPromises();

        expect(console.error).toHaveBeenCalledWith(
            'Error deleting saved search with ID 1:',
            expect.any(Object)
        );
    });
});
