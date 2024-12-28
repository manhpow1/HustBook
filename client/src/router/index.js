import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore';
import { useCommentStore } from '../stores/commentStore';
import logger from '../services/logging';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../views/Home.vue')
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
        component: () => import('../components/user/SignUp.vue')
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../components/user/Login.vue')
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
        path: '/hashtag/:hashtag',
        name: 'Hashtag',
        component: () => import('../views/post/HashtagView.vue'),
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
    // List of public routes that don't require auth - thêm route gốc '/'
    const publicRoutes = ['Login', 'SignUp', 'GetVerifyCode', 'Home', 'ForgotPassword'];

    logger.debug('Navigating from:', from.fullPath, 'to:', to.fullPath);

    // If route is public or explicitly marked as allowWithoutAuth, allow direct access
    if (publicRoutes.includes(to.name) || to.path === '/' || to.meta.allowWithoutAuth) {
        logger.debug('Public route or explicitly allowed without auth:', to.name);
        next();
        return;
    }

    const userStore = useUserStore();

    logger.debug('Route requires authentication:', to.name);

    // For all other routes, check if authentication is required
    if (!userStore.isLoggedIn) {
        logger.debug('User not logged in, attempting to authenticate...');
        try {
            await userStore.checkAuth();
            logger.debug('Authentication check completed. isLoggedIn:', userStore.isLoggedIn);
        } catch (error) {
            logger.error('Error during authentication check:', error);
        }
    }

    if (userStore.isLoggedIn) {
        logger.debug('User is authenticated. Proceeding to:', to.name);
        next();
    } else {
        logger.warn('User is not authenticated. Redirecting to Login...');
        next({ name: 'Login', query: { redirect: to.fullPath } });
    }
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
