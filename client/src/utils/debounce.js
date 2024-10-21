import { debounce } from 'lodash-es';

export const debouncedValidateInput = debounce((input, errorRef, t) => {
    if (input.length > 1000) {
        errorRef.value = t('commentTooLong');
    } else {
        errorRef.value = '';
    }
}, 300);