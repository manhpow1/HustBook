import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore';
import { useCommentStore } from '../stores/commentStore';
import logger from '../services/logging';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: { allowWithoutAuth: true }
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('../views/user/Profile.vue'),
        meta: { requiresAuth: true }
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
        path: '/post/:id',
        name: 'PostDetail',
        component: () => import('../components/post/PostDetail.vue'),
        meta: {
            requiresAuth: true,
            analytics: 'PostDetail'
        },
        beforeEnter: (to, from, next) => {
            const commentStore = useCommentStore();
            commentStore.prefetchComments(to.params.id);
            next();
        }
    },
    {
        path: '/edit-post/:id',
        name: 'EditPost',
        component: () => import('../components/post/EditPost.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/watch/:id',
        name: 'Watch',
        component: () => import('../views/Watch.vue'),
        meta: { requiresAuth: true },
    },
    {
        path: '/delete-post/:id',
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
        meta: { requiresAuth: true },
    },
    // {
    //     path: '/videos',
    //     name: 'VideoTab',
    //     component: VideoTab,
    //     meta: { requiresAuth: true },
    // },
    // {
    //     path: '/videos/search',
    //     name: 'VideoSearch',
    //     component: VideoSearch,
    //     meta: { requiresAuth: true },
    // },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Global navigation guard
router.beforeEach(async (to, from, next) => {
    logger.debug(`Router guard triggered: ${from.path} -> ${to.path}`);
    logger.debug(`Route meta: `, to.meta);

    if (to.meta.allowWithoutAuth) {
        logger.debug('Route allows access without auth');
        next();
        return;
    }

    const userStore = useUserStore();
    logger.debug(`Current login status: ${userStore.isLoggedIn}`);

    if (to.meta.requiresAuth && !userStore.isLoggedIn) {
        logger.debug('Route requires auth and user not logged in');
        const isAuthenticated = await userStore.verifyAuthState();
        logger.debug(`Auth verification result: ${isAuthenticated}`);

        if (!isAuthenticated) {
            logger.debug(`Redirecting to login with redirect=${to.fullPath}`);
            next({
                name: 'Login',
                query: { redirect: to.fullPath }
            });
            return;
        }
    }

    logger.debug('Navigation allowed');
    next();
});

// Navigation guard for AddPost component
router.beforeResolve((to, from, next) => {
    logger.debug(`Resolving navigation from ${from.name} to ${to.name}`);
    next();
});

router.afterEach((to, from) => {
    logger.debug(`Navigation completed to: ${to.name}`);
});

export default router
