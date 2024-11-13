import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import SearchPosts from '../components/search/SearchPosts.vue';
import { useSearchStore } from '../stores/searchStore';
import { useUserStore } from '../stores/userStore';
import apiService from '../services/api';
import router from '../router';
import i18n from './i18n';

vi.spyOn(router, 'push').mockImplementation(() => { });

describe('SearchPosts.vue', () => {
    let wrapper;
    let searchStore;
    let userStore;

    beforeEach(async () => {
        // Initialize the testing pinia
        const pinia = createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
        });

        // Initialize stores
        userStore = useUserStore(pinia);
        searchStore = useSearchStore(pinia);

        // Set the user before mounting the component
        userStore.setUser({ id: 'testUser' });

        // Mount the component after setting the user
        wrapper = mount(SearchPosts, {
            global: {
                plugins: [pinia, i18n, router],
                stubs: {
                    TransitionGroup: false, // This replaces TransitionGroup with a plain div
                },
            },
        });

        await wrapper.vm.$nextTick(); // Wait for component to react to store changes
    });

    // Test Case 1
    it('1. User provides correct session ID and appropriate parameters - should succeed with code 1000', async () => {
        apiService.search = vi.fn().mockResolvedValue({ data: { code: '1000', data: [] } });
        await searchStore.searchPosts({ keyword: 'test', user_id: 'valid_user', index: 0, count: 20 }, router);
        expect(searchStore.error).toBeNull();
        expect(apiService.search).toHaveBeenCalled();
    });

    // Test Case 2
    it('2. User sends incorrect session ID - should redirect to login', async () => {
        userStore.setUser(null); // Simulate user not logged in
        await wrapper.vm.$nextTick();
        expect(router.push).toHaveBeenCalledWith('/login');
    });

    // Test Case 3
    it('3. User provides correct session ID but no results are returned - should display "No results found"', async () => {
        // The user is already set in beforeEach
        apiService.search = vi.fn().mockResolvedValue({ data: { code: '1000', data: [] } });
        // Set keyword to trigger the search
        wrapper.vm.keyword = 'test';
        await wrapper.vm.handleSearch();
        await wrapper.vm.$nextTick(); // Wait for DOM updates
        expect(wrapper.text()).toContain(i18n.global.t('noResultsFound'));
    });

    // Test Case 4
    it('4. User account is locked - should redirect to login', async () => {
        userStore.setUser({ id: 'lockedUser' }); // Simulate locked user
        apiService.search = vi.fn().mockRejectedValue({ response: { data: { code: 9995 } } });
        await searchStore.searchPosts({ keyword: 'test', user_id: 'locked_user', index: 0, count: 20 }, router);
        expect(router.push).toHaveBeenCalledWith('/login');
    });

    // Test Case 5
    it('5. User provides invalid user_id - should set error message', async () => {
        apiService.search = vi.fn().mockRejectedValue({
            response: { data: { code: 1004, message: 'Parameter value is invalid' } },
        });
        await searchStore.searchPosts({ keyword: 'test', user_id: 'invalid_user', index: 0, count: 20 }, router);
        expect(searchStore.error).toContain('Parameter value is invalid');
    });

    // Test Case 6
    it('6. Keyword is missing - should block request and not send to server', async () => {
        apiService.search = vi.fn();
        await searchStore.searchPosts({ keyword: '', user_id: 'valid_user', index: 0, count: 20 }, router);
        expect(apiService.search).not.toHaveBeenCalled();
    });

    // Test Case 7
    it('7. Post with invalid author ID is returned - should exclude from results', async () => {
        const invalidPost = { id: 1, content: 'Post with invalid author', author: { id: null } };
        apiService.search = vi.fn().mockResolvedValue({ data: { code: '1000', data: [invalidPost] } });
        await searchStore.searchPosts({ keyword: 'test', user_id: 'valid_user', index: 0, count: 20 }, router);
        expect(searchStore.searchResults).not.toContain(invalidPost);
    });

    // Test Case 8
    it('8. Post with invalid described and media fields - should not display post', async () => {
        const invalidPost = { id: 2, described: null, image: null, video: null, author: { id: 'author1' } };
        apiService.search = vi.fn().mockResolvedValue({ data: { code: '1000', data: [invalidPost] } });
        await searchStore.searchPosts({ keyword: 'test', user_id: 'valid_user', index: 0, count: 20 }, router);
        expect(searchStore.searchResults).not.toContain(invalidPost);
    });

    // Test Case 9
    it('9. Post with one invalid field (described or media) - should display post with valid fields', async () => {
        const partiallyValidPost = { id: 3, described: 'Valid description', image: null, author: { id: 'author1' } };
        apiService.search = vi.fn().mockResolvedValue({
            data: { code: '1000', data: [partiallyValidPost] },
        });
        await searchStore.searchPosts(
            {
                keyword: 'test',
                user_id: 'valid_user',
                index: 0,
                count: 20,
            },
            router
        );
        expect(searchStore.searchResults).toContainEqual(partiallyValidPost);
    });

    // Test Case 10
    it('10. Inappropriate media cover fails to load - should remove post from list', async () => {
        const inappropriatePost = { id: 4, content: 'Sensitive content', image: 'sensitive.jpg', author: { id: 'author1' } };
        searchStore.searchResults = [inappropriatePost];
        await wrapper.vm.$nextTick(); // Ensure component updates
        // Find the Card component for the inappropriatePost
        const card = wrapper.findComponent({ ref: `post-${inappropriatePost.id}` });
        // Ensure the card exists
        expect(card.exists()).toBe(true);
        // Emit the 'coverError' event
        card.vm.$emit('coverError', inappropriatePost);
        await wrapper.vm.$nextTick();
        expect(searchStore.searchResults).not.toContain(inappropriatePost);
    });

    // Test Case 11
    it('11. Internet connection is lost during search - should display "Cannot connect to the Internet"', async () => {
        // The user is already set in beforeEach
        apiService.search = vi.fn().mockRejectedValue({ message: 'Network Error' });
        // Set keyword to trigger the search
        wrapper.vm.keyword = 'test';
        await wrapper.vm.handleSearch();
        await wrapper.vm.$nextTick();
        expect(wrapper.text()).toContain('Cannot connect to the Internet.');
    });

    // Test Case 12
    it('12. Limits search history display to 20 normalized results', async () => {
        const mockPosts = Array.from({ length: 22 }, (_, i) => ({
            id: i,
            described: 'Test Post',
            searchTerm: ' Test ',
            author: { id: 'author1' },
        }));
        apiService.search = vi.fn().mockResolvedValue({ data: { code: '1000', data: mockPosts } });
        await searchStore.searchPosts({ keyword: 'Test', user_id: 'valid_user', index: 0, count: 22 }, router);
        expect(searchStore.searchResults.length).toBe(20);
    });

    // Test Case 13
    it('13. Does not fetch newer posts when fetching beyond current index', async () => {
        const initialResults = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            searchTerm: 'test',
            author: { id: 'author1' },
            described: 'Description',
        }));
        searchStore.searchResults = initialResults;
        apiService.search = vi.fn().mockResolvedValue({ data: { code: '1000', data: [] } });
        await searchStore.searchPosts({ keyword: 'test', user_id: 'valid_user', index: 21, count: 20 }, router);
        expect(searchStore.searchResults.length).toBe(20); // Confirms no additional posts loaded
    });

    // Test Case 14
    it('14. Invalid index or count parameters - should set error message', async () => {
        apiService.search = vi.fn().mockRejectedValue({
            response: { data: { code: 1004, message: 'Parameter value is invalid' } },
        });
        await searchStore.searchPosts(
            {
                keyword: 'test',
                user_id: 'valid_user',
                index: 'invalid',
                count: 'invalid',
            },
            router
        );
        expect(searchStore.error).toContain('Parameter value is invalid');
    });
});
