import { useDebounceFn } from '@vueuse/core';

export function useDebounce(fn, delay = 300) {
    return useDebounceFn(fn, delay);
}