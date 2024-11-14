import { createI18n } from 'vue-i18n';

// Provide mock messages for testing purposes
const messages = {
    en: {
        postNotFound: 'The post does not exist',
        invalidSession: 'Invalid session',
        errorLoadingPost: 'Error loading post',
        postNotAvailable: 'Post is not available',
        retry: 'Retry',
        loadingComments: 'Loading comments',
        retryAction: 'Retry Action',
        comment: 'Comment',
        comments: 'Comments',
        share: 'Share',
        writeComment: 'Write a comment...',
        postComment: 'Post Comment',
        like: 'Like',
        likes: 'Likes',
        unlike: 'Unlike',
        edit: 'Edit',
        delete: 'Delete',
        apply: 'Apply',
        cancel: 'Cancel',
        save: 'Save',
        posting: "Posting...",
        confirm: "Confirm",
        processing: "Processing...",
        commentAdded: 'Comment added',
        errorAddingComment: 'Error adding comment',
        commentUpdated: 'Comment updated',
        errorUpdatingComment: 'Error updating comment',
        commentDeleted: 'Comment deleted',
        errorDeletingComment: 'Error deleting comment',
        loadingMoreComments: 'Loading more comments',
        loadMoreComments: 'Load more comments',
        beFirstToComment: 'Be the first to comment',
        commentError: 'Comment Error',
        noCommentsFound: 'No comments found',
        noInternetConnection: 'Unable to connect to the Internet',
        confirmDelete: 'Confirm Delete',
        deleteWarning: 'Are you sure you want to delete this comment?',
        editComment: 'Edit comment',
        editCommentPlaceholder: 'Edit your comment here',
        saveEditError: 'Failed to save edit. Please try again.',
        deleteError: 'Failed to delete comment. Please try again.',
        likeError: 'Failed to update like status. Please try again.',
        errorFetchingComments: 'Failed to load comments. Please try again.',
        advancedOptions: 'Advanced Options',
        details: 'Details',
        provideDetails: 'Please provide additional details',
        reportFailed: 'Failed to submit report. Please try again later.',
        reportPost: 'Report Post',
        selectReason: 'Select a Reason',
        selectReasonPlaceholder: 'Please select a reason',
        reasonOptions: {
            spam: 'Spam',
            inappropriateContent: 'Inappropriate Content',
            harassment: 'Harassment',
            hateSpeech: 'Hate Speech',
            violence: 'Violence',
            other: 'Other',
        },
        submitReport: 'Submit Report',
        submitting: 'Submitting...',
        reportSubmittedSuccess: 'Report submitted successfully.',
        pleaseSelectReason: 'Please select a reason.',
        pleaseProvideDetails: 'Please provide additional details.',
        charactersRemaining: 'Characters remaining: {count}',
        databaseError: 'Unable to connect to the database. Please try again later.',
        postNotFound: 'The post you are looking for does not exist.',
        characterCount: 'Characters: {count} / {max}',
        commentTooLong: 'Comment is too long. Please keep it under 1000 characters.',
        network: 'Network error occurred',
        unauthorized: 'Unauthorized access',
        noMorePosts: 'No more posts available',
        searchTitle: 'Search Hustbook',
        keywordLabel: 'Keyword',
        userIdLabel: 'User ID',
        searchKeywordPlaceholder: 'Search keyword',
        userIdPlaceholder: 'User ID',
        searching: 'Searching',
        search: 'Search',
        loading: 'Loading',
        loadMore: 'Load More',
        noResultsFound: 'No results found.',
        pleaseLogin: 'Please log in to search posts.',
        retrySearch: 'Retry Search',
        viewPost: 'View Post',
    },
};

const i18n = createI18n({
    legacy: false, // Use the Composition API
    locale: 'en',
    messages,
    createSpy: vi.fn,
    stubActions: false,
});

export default i18n;