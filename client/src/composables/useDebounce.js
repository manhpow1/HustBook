import { debounce } from 'lodash-es';

export function useDebounce(fn, delay = 300) {
    const debouncedFn = debounce(fn, delay);
    return debouncedFn;
}