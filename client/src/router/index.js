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
        name: 'CurrentUserProfile',
        component: () => import('../views/user/Profile.vue'),
        meta: { requiresAuth: true },
        beforeEnter: async (to, from, next) => {
            const userStore = useUserStore();
            try {
                logger.debug('Checking auth state for profile access');
                const isAuthenticated = await userStore.verifyAuthState();
                
                if (!isAuthenticated) {
                    next({ 
                        name: 'Login',
                        query: { redirect: to.fullPath }  
                    });
                    return;
                }
    
                if (userStore.userData?.userId) {
                    next({ 
                        name: 'UserProfile',
                        params: { userId: userStore.userData.userId }
                    });
                    return;
                }
    
                next();
            } catch (error) {
                logger.error('Profile route error:', error);
                next({ name: 'Login' });
            }
        }
    },
    {
        path: '/profile/:userId',
        name: 'UserProfile', 
        component: () => import('../views/user/Profile.vue'),
        meta: { requiresAuth: true },
        beforeEnter: async (to, from, next) => {
            const userStore = useUserStore();
            try {
                // Nếu không có userId trong params
                if (!to.params.userId) {
                    next({ name: 'CurrentUserProfile' });
                    return;
                }
    
                // Nếu đang xem profile của chính mình
                if (userStore.userData?.userId === to.params.userId) {
                    // Vẫn cho phép xem nhưng cập nhật URL
                    next();
                    return;
                }
    
                next();
            } catch (error) {
                logger.error('UserProfile route error:', error);
                next({ name: 'CurrentUserProfile' });
            }
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
        meta: { requiresAuth: true },
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
        meta: { requiresAuth: true },
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Global navigation guard
router.beforeEach(async (to, from, next) => {
    logger.debug(`Navigation started: ${from.path} -> ${to.path}`);
    const userStore = useUserStore();

    if (to.meta.allowWithoutAuth) {
        next();
        return;
    }

    // Check auth for protected routes
    if (to.meta.requiresAuth) {
        logger.debug('Route requires authentication');

        // Verify auth state
        const isAuthenticated = await userStore.verifyAuthState();

        if (!isAuthenticated) {
            logger.debug('User not authenticated, redirecting to login');
            next({
                name: 'Login',
                query: {
                    redirect: to.fullPath,
                    message: 'Please login to continue'
                }
            });
            return;
        }

        // Special handling for profile routes
        if (to.name === 'CurrentUserProfile' && !userStore.user.userId) {
            logger.error('No user ID available for profile page');
            next({ name: 'Home' });
            return;
        }
    }

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
