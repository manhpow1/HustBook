import { ref } from "vue";
import { debounce } from "lodash-es";

export function useSearch() {
    const keyword = ref('');
    const userId = ref('');
    const selectedFilter = ref('');
    const debouncedSearch = debounce(() => {
        if (keyword.value || userId.value) {
            console.log("Debounced search triggered with:", {
                keyword: keyword.value,
                userId: userId.value,
                filter: selectedFilter.value,
            });
        }
    }, 300);

    return {
        keyword,
        userId,
        selectedFilter,
        debouncedSearch,
    };
}