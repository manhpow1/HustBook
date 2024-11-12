import { ref } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import { debounce } from 'lodash-es';
import { handleError } from '../utils/errorHandler';
import { useRouter } from 'vue-router';

export function useSearch() {
    const searchStore = useSearchStore();
    const router = useRouter();
    const keyword = ref('');
    const userId = ref('');
    const selectedFilter = ref('');

    const performSearch = async ({ keyword, userId, index, count }) => {
        try {
            await searchStore.searchPosts({ keyword, user_id: userId, index, count });
        } catch (error) {
            await handleError(error, router);
        }
    };

    const debouncedSearch = debounce(() => {
        performSearch({
            keyword: keyword.value,
            userId: userId.value,
            filter: selectedFilter.value,
            index: 0,
            count: 20
        });
    }, 300);

    return {
        keyword,
        userId,
        selectedFilter,
        performSearch,
        debouncedSearch
    };
}