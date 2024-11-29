import DOMPurify from 'dompurify';

export const sanitizeInput = (input) => {
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
};

export const sanitizeOutput = (output) => {
    return DOMPurify.sanitize(output);
};