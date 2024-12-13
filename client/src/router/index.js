import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore';
import { useCommentStore } from '../stores/commentStore';

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
        component: () => import('../components/auth/SignUp.vue')
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../components/auth/Login.vue')
    },
    {
        path: '/get-verify-code',
        name: 'GetVerifyCode',
        component: () => import('../components/auth/GetVerifyCode.vue')
    },
    {
        path: '/verify-code/:verificationCode',
        name: 'VerifyCode',
        component: () => import('../components/auth/VerifyCode.vue'),
        props: true
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
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    const userStore = useUserStore();

    if (requiresAuth) {
        if (!userStore.isLoggedIn) {
            await userStore.checkAuth();
        }
        if (userStore.isLoggedIn) {
            next();
        } else {
            next({ name: 'Login', query: { redirect: to.fullPath } });
        }
    } else {
        next();
    }
});

// Navigation guard for AddPost component
router.beforeResolve((to, from, next) => {
    if (from.name === 'AddPost' && to.name !== 'AddPost') {
        const addPostComponent = from.matched[0].instances.default
        if (addPostComponent && addPostComponent.handleRouteChange) {
            addPostComponent.handleRouteChange(to, from, next)
        } else {
            next()
        }
    } else {
        next()
    }
})

router.afterEach((to) => {
    if (to.meta.analytics) {
        trackPageView(to.meta.analytics);
    }
});

export default router