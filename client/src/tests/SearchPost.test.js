import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import SearchPosts from '../components/search/SearchPosts.vue';
import { useSearchStore } from '../stores/searchStore';
import { useUserStore } from '../stores/userStore';
import apiService from '../services/api';
import router from '../router';
import i18n from './i18n';
import Card from '../components/ui/Card.vue';
import * as useSearchModule from '../composables/useSearch';
import { ref, computed } from 'vue';
import flushPromises from 'flush-promises';

vi.spyOn(router, 'push').mockImplementation(() => { });

describe('SearchPosts.vue', () => {
    let wrapper;
    let searchStore;
    let userStore;

    // Shared refs for keyword and userId
    const keyword = ref('');
    const userId = ref('');

    beforeEach(async () => {
        // Mock useSearch to return shared refs
        vi.spyOn(useSearchModule, 'useSearch').mockReturnValue({
            userId,
            keyword,
            selectedFilter: ref(''),
            debouncedSearch: vi.fn(),
        });

        // Initialize the testing pinia
        const pinia = createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
        });

        setActivePinia(pinia);

        // Initialize stores
        userStore = useUserStore(pinia);
        searchStore = useSearchStore(pinia);

        // Set default user and logged-in state
        userStore.setUser({ id: 'testUser' });
        userStore.isLoggedIn = computed(() => true);
        await flushPromises();

        // Mock apiService.search before mounting
        apiService.search = vi.fn();

        apiService.search = vi.fn().mockResolvedValue({
            data: {
                code: '1000',
                data: [],
            },
        });

        // Mount the component
        wrapper = mount(SearchPosts, {
            global: {
                plugins: [pinia, i18n, router],
                components: {
                    Card, // Register the Card component
                },
                stubs: {
                    TransitionGroup: false, // Replace TransitionGroup with a plain div
                },
            },
        });

        // Ensure all reactive states are reset
        keyword.value = '';
        userId.value = '';
        searchStore.resetSearch();

        await flushPromises(); // Wait for all promises to resolve
    });

    afterEach(() => {
        // Reset mocks after each test

        vi.resetAllMocks();
        keyword.value = '';
        userId.value = '';
        searchStore.resetSearch();

        // Reset shared reactive values       
    });

    // Example test cases
    it('1. User provides correct session ID and appropriate parameters - should succeed with code 1000', async () => {
        // Mock successful API response
        apiService.search.mockResolvedValue({
            data: {
                code: '1000',
                data: [
                    { id: 1, described: 'Valid post', author: { id: 'author1' }, created: '2024-11-20T07:55:00.000Z' },
                ],
            },
        });

        // Set test values
        keyword.value = 'test';
        userId.value = 'valid_user';

        // Call handleSearch
        await wrapper.vm.handleSearch();
        await flushPromises();

        // Verify no errors
        expect(searchStore.error).toBeNull();

        // Verify API was called with correct parameters
        expect(apiService.search).toHaveBeenCalledWith('valid_user', 'test', 0, 20);

        // Verify search results are updated
        expect(searchStore.searchResults).toHaveLength(1);
        expect(searchStore.searchResults[0].described).toBe('Valid post');
    });

    // Test Case 2
    it('2. User sends incorrect session ID - should redirect to login', async () => {
        // Mock API response for invalid session
        apiService.search.mockRejectedValue({
            response: {
                status: 401,
                data: { code: '9998', message: 'Token is invalid.' },
            },
            message: 'Token is invalid.',
        });

        // Set test values
        keyword.value = 'test';
        userId.value = 'invalid_user';

        // Call handleSearch
        await wrapper.vm.handleSearch();
        await flushPromises();

        // Verify error is set in the store
        expect(searchStore.error).toBe('Token is invalid.');

        // Verify notification is shown
        expect(wrapper.text()).toContain('Token is invalid.');

        // Verify user is redirected to login
        expect(router.push).toHaveBeenCalledWith('/login');
    });
    // Test Case 3
    it('3. User provides correct session ID but no results are returned - should display "No results found"', async () => {
        // Mock API response with no results
        apiService.search.mockResolvedValue({
            data: { code: '1000', data: [] },
        });

        // Set test values
        keyword.value = 'test';
        userId.value = 'valid_user';

        // Call handleSearch
        await wrapper.vm.handleSearch();
        await flushPromises();

        // Verify no errors
        expect(searchStore.error).toBeNull();

        // Verify "No results found" message
        expect(wrapper.text()).toContain(i18n.global.t('noResultsFound'));

        // Verify API was called with correct parameters
        expect(apiService.search).toHaveBeenCalledWith('valid_user', 'test', 0, 20);
    });

    // Test Case 4
    it('4. User account is locked - should redirect to login', async () => {
        // Mock API rejection with 403 status
        apiService.search.mockRejectedValue({
            response: {
                status: 403,
                data: { code: '9999', message: 'An unexpected error occurred. Please try again later.' },
            },
            message: 'An unexpected error occurred. Please try again later.',
        });

        // Set test values
        keyword.value = 'test';
        userId.value = 'valid_user';

        // Call handleSearch
        await wrapper.vm.handleSearch();
        await flushPromises();

        // Verify error is set in the store
        expect(searchStore.error).toBe('An unexpected error occurred. Please try again later.');

        // Verify notification is shown
        expect(wrapper.text()).toContain('An unexpected error occurred. Please try again later.');

        // Verify user is redirected to login
        expect(router.push).toHaveBeenCalledWith('/login');
    });

    // Test Case 5
    it('5. User provides invalid user_id - should set error message', async () => {
        // Mock API response for invalid parameters
        apiService.search.mockResolvedValue({
            data: { code: '1004', message: 'Parameter value is invalid.' },
        });

        // Set test values
        keyword.value = 'test';
        userId.value = 'invalid_user';

        // Call handleSearch
        await wrapper.vm.handleSearch();
        await flushPromises();

        // Verify error message
        expect(searchStore.error).toBe('Parameter value is invalid.');
        expect(wrapper.text()).toContain('Parameter value is invalid.');

        // Verify API was called with correct parameters
        expect(apiService.search).toHaveBeenCalledWith('invalid_user', 'test', 0, 20);
    });

    // Test Case 6
    it('6. Keyword is missing - should block request and not send to server', async () => {
        // Ensure the keyword starts empty
        expect(keyword.value).toBe('');

        // Call handleSearch
        await wrapper.vm.handleSearch();
        await flushPromises();

        // Verify the API was not called
        expect(apiService.search).not.toHaveBeenCalled();

        // Verify the error state
        expect(searchStore.error).toBe('Keyword or UserID cannot be empty.');
        expect(wrapper.text()).toContain('Keyword or UserID cannot be empty.');
    });

    // Test Case 7
    it('7. Post with invalid author ID is returned - should exclude from results', async () => {
        const invalidPost = { id: 1, described: 'Invalid Post', author: { id: null } };
        apiService.search.mockResolvedValue({ data: { code: '1000', data: [invalidPost] } });

        await wrapper.vm.handleSearch();
        await flushPromises();

        expect(searchStore.searchResults).not.toContain(invalidPost);
    });

    // Test Case 8
    it('8. Post with invalid described and media fields - should not display post', async () => {
        const invalidPost = { id: 2, described: null, image: null, video: null, author: { id: 'author1' } };
        apiService.search.mockResolvedValue({ data: { code: '1000', data: [invalidPost] } });

        await wrapper.vm.handleSearch();
        await flushPromises();

        expect(searchStore.searchResults).not.toContain(invalidPost);
    });

    // Test Case 9
    it('9. Post with one invalid field (described or media) - should display post with valid fields', async () => {
        // Mock API response with a valid post missing media fields
        apiService.search.mockResolvedValue({
            data: {
                code: '1000',
                data: [
                    {
                        id: 3,
                        described: 'Valid description',
                        image: null,
                        video: null,
                        author: { id: 'author1' },
                        created: '2024-11-20T07:55:00.000Z',
                    },
                ],
            },
        });

        // Set test values
        keyword.value = 'test';
        userId.value = 'valid_user';

        // Call handleSearch
        await wrapper.vm.handleSearch();
        await flushPromises();

        // Verify the post is displayed
        expect(searchStore.searchResults).toHaveLength(1);
        expect(searchStore.searchResults[0].described).toBe('Valid description');
    });

    // Test Case 10
    it('10. Cover fails to load - should remove post from list', async () => {
        // Mock a post with an image that will fail to load
        const postWithBrokenImage = {
            id: 4,
            described: 'Post with broken image',
            image: 'broken-image.jpg',
            author: { id: 'author1' },
            created: Date.now(),
        };

        // Set the search results in the store
        searchStore.searchResults = [postWithBrokenImage];
        await wrapper.vm.$nextTick(); // Ensure component updates

        // Find the Card component for the post using its ref
        const card = wrapper.findComponent({ ref: 'post-' + postWithBrokenImage.id });
        expect(card.exists()).toBe(true); // Ensure the card exists

        // Emit the 'coverError' event from the Card component
        card.vm.$emit('coverError', postWithBrokenImage);
        await wrapper.vm.$nextTick(); // Wait for DOM updates

        // Verify the post is removed from search results
        expect(searchStore.searchResults).not.toContainEqual(postWithBrokenImage);
    });


    // Test Case 11
    it('11. Internet connection is lost during search - should display "Cannot connect to the Internet"', async () => {
        // Mock a network error
        apiService.search.mockRejectedValue(new Error('Network Error'));

        // Set test values
        keyword.value = 'test';
        userId.value = 'valid_user';

        // Call handleSearch
        await wrapper.vm.handleSearch();
        await flushPromises();

        expect(wrapper.vm.keyword).toBe('test');
        expect(wrapper.vm.userId).toBe('valid_user');

        // Verify error message is set in the store
        expect(searchStore.error).toBe('Cannot connect to the Internet.');

        // Verify error message is displayed in the UI
        expect(wrapper.text()).toContain('Cannot connect to the Internet.');
    });

    // Test Case 12
    it('12. Limits search history display to 20 normalized results', async () => {
        const mockPosts = Array.from({ length: 22 }, (_, i) => ({
            id: i + 1,
            described: `Test Post ${i + 1}`,
            keyword: 'Test',
            author: { id: 'author1' },
            created: Date.now() - i * 1000,
        }));
        apiService.search.mockResolvedValue({ data: { code: '1000', data: mockPosts } });

        await wrapper.vm.handleSearch();
        await flushPromises();

        // Assuming that searchStore.searchResults is limited to 20
        expect(searchStore.searchResults.length).toBeLessThanOrEqual(20);
    });

    // Test Case 13
    it('13. Does not fetch newer posts when fetching beyond current index', async () => {
        const initialResults = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            described: 'Description',
            author: { id: 'author1' },
            created: Date.now(),
        }));
        searchStore.searchResults = initialResults;
        apiService.search.mockResolvedValue({ data: { code: '1000', data: [] } });

        // Simulate loading more results
        await wrapper.vm.loadMore();
        await flushPromises();

        expect(searchStore.searchResults.length).toBe(20); // No new posts added
    });

    // Test Case 14
    it('14. Invalid index or count parameters - should set error message', async () => {
        // Mock API response for invalid parameters
        apiService.search.mockRejectedValue({
            response: {
                data: { code: '1004', message: 'Parameter value is invalid.' },
                status: 400,
            },
            message: 'Parameter value is invalid.',
        });

        // Set test values with invalid index and count
        wrapper.vm.index = 'invalid';
        wrapper.vm.count = 'invalid';
        keyword.value = 'test';
        userId.value = 'valid_user';

        await wrapper.vm.$nextTick();

        // Call handleSearch
        await wrapper.vm.handleSearch();
        await flushPromises();

        // Verify error is set in the store
        expect(searchStore.error).toBe('Parameter value is invalid.');
        expect(wrapper.text()).toContain('Parameter value is invalid.');

        // Verify API was not called
        expect(apiService.search).not.toHaveBeenCalled();
    });
});
