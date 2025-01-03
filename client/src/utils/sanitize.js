import DOMPurify from 'dompurify';

export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
};

export const sanitizeOutput = (output) => {
    if (typeof output !== 'string') return output;
    return DOMPurify.sanitize(output);
};