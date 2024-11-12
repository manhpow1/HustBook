import { ref } from 'vue';

export function usePagination(initialCount = 20) {
    const index = ref(0);
    const count = ref(initialCount);

    const loadMore = () => {
        index.value += count.value;
    };

    return {
        index,
        count,
        loadMore
    };
}