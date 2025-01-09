import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { useCommentStore } from '../stores/commentStore';
import logger from '../services/logging';

/**
 * Route definitions
 */
const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: { allowWithoutAuth: true }
    },
    {
        path: '/profile',
        name: 'CurrentUserProfile',
        component: () => import('../views/user/Profile.vue'),
        meta: { requiresAuth: true },
    },
    {
        path: '/profile/:userId',
        name: 'UserProfile',
        component: () => import('../views/user/Profile.vue'),
        meta: { requiresAuth: true },
    },
    {
        path: '/friends',
        name: 'Friends',
        component: () => import('../views/user/Friends.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/messages',
        name: 'Messages',
        component: () => import('../views/user/Messages.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/settings',
        name: 'Settings',
        component: () => import('../views/SettingsView.vue')
    },
    {
        path: '/signup',
        name: 'SignUp',
        component: () => import('../components/user/SignUp.vue'),
        meta: { allowWithoutAuth: true }
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../components/user/Login.vue'),
        meta: { allowWithoutAuth: true }
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: () => import('../components/user/ForgotPassword.vue'),
        meta: { allowWithoutAuth: true }
    },
    {
        path: '/get-verify-code',
        name: 'GetVerifyCode',
        component: () => import('../components/user/GetVerifyCode.vue'),
        meta: { allowWithoutAuth: true }
    },
    {
        path: '/verify-code',
        name: 'VerifyCode',
        component: () => import('../components/user/VerifyCode.vue'),
        meta: { allowWithoutAuth: true }
    },
    {
        path: '/complete-profile',
        name: 'CompleteProfile',
        component: () => import('../components/user/ChangeInfoAfterSignup.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/add-post',
        name: 'AddPost',
        component: () => import('../components/post/AddPost.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/post/:postId',
        name: 'PostDetail',
        component: () => import('../components/post/PostDetail.vue'),
        meta: {
            requiresAuth: true,
            analytics: 'PostDetail'
        },
        // We keep this per-route guard to prefetch comments
        beforeEnter: (to, from, next) => {
            const commentStore = useCommentStore();
            commentStore.prefetchComments(to.params.postId);
            next();
        }
    },
    {
        path: '/edit-post/:postId',
        name: 'EditPost',
        component: () => import('../components/post/EditPost.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/watch/:postId',
        name: 'Watch',
        component: () => import('../views/Watch.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/delete-post/:postId',
        name: 'DeletePost',
        component: () => import('../components/post/DeletePost.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/report-post/:postId',
        name: 'ReportPost',
        component: () => import('../components/post/ReportPostModal.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/search',
        name: 'Search',
        component: () => import('../components/search/SearchPosts.vue'),
        meta: { requiresAuth: true }
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

/**
 * Global Navigation Guard:
 * - Checks auth state for protected routes
 * - Redirects /profile to /profile/:userId if user is valid
 * - Fetches user profile if needed
 */
router.beforeEach(async (to, from, next) => {
    // If route is public, just proceed
    if (to.meta.allowWithoutAuth) return next();

    // Otherwise, verify auth
    const userStore = useUserStore();
    const isAuthenticated = await userStore.verifyAuthState();
    if (!isAuthenticated) {
        // If not authenticated, go to login
        return next({ name: 'Login', query: { redirect: to.fullPath } });
    }

    // Optionally fetch user profile only if userData is missing
    if (!userStore.userData?.userId) {
        await userStore.fetchUserProfile(); // Make sure userId is available
    }

    next();
});

/**
 * Optional guard to log or track "resolving" step
 */
router.beforeResolve((to, from, next) => {
    logger.debug(`Resolving navigation from ${from.name} to ${to.name}`);
    next();
});

/**
 * Optional guard to log or track "after each" step
 */
router.afterEach((to, from) => {
    logger.debug(`Navigation completed to: ${to.name}`);
});

export default router;
