import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { useCommentStore } from '../stores/commentStore';
import logger from '../services/logging';
import { ref } from 'vue';

export const isLoading = ref(false);

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: { allowWithoutAuth: true }
    },
    {
        path: '/profile/:userId?',
        name: 'UserProfile',
        component: () => import('../views/user/Profile.vue'),
        meta: { requiresAuth: true },
        beforeEnter: async (to, from, next) => {
            const userStore = useUserStore();
            const targetUserId = to.params.userId;
            const currentUserId = userStore.userData?.userId;

            // If viewing /profile without userId, redirect to current user's profile
            if (!targetUserId) {
                if (currentUserId) {
                    return next({ 
                        path: `/profile/${currentUserId}`,
                        replace: true 
                    });
                }
                // If somehow we don't have currentUserId, let the component handle it
                return next();
            }

            // Continue with the navigation
            next();
        }
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
        path: '/post/:postId',
        name: 'PostDetail',
        component: () => import('../components/post/PostDetail.vue'),
        meta: {
            requiresAuth: true,
            analytics: 'PostDetail'
        },
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

router.beforeEach(async (to, from, next) => {
    if (to.meta.allowWithoutAuth) return next();

    const userStore = useUserStore();
    const isAuthenticated = await userStore.verifyAuthState();

    if (!isAuthenticated) {
        return next({ name: 'Login', query: { redirect: to.fullPath } });
    }

    if (!userStore.userData?.userId) {
        await userStore.fetchUserProfile();
    }

    next();
});

router.beforeResolve((to, from, next) => {
    logger.debug(`Resolving navigation from ${from.name} to ${to.name}`);
    isLoading.value = true;
    next();
});

router.afterEach((to, from) => {
    logger.debug(`Navigation completed to: ${to.name}`);
    setTimeout(() => {
        isLoading.value = false;
    }, 100); // Small delay to prevent flash
});

export default router;
