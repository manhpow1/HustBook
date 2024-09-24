import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../components/Login.vue'
import Logout from '../components/Logout.vue'
import GetVerifyCode from '../components/GetVerifyCode.vue'
import VerifyCode from '../components/VerifyCode.vue'
import ChangeInfoAfterSignup from '../components/ChangeInfoAfterSignup.vue'
import SignUp from '../components/SignUp.vue'
import { useUserState } from '../store/user-state'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue')
    },
    {
        path: '/friends',
        name: 'Friends',
        component: () => import('../views/Friends.vue')
    },
    {
        path: '/messages',
        name: 'Messages',
        component: () => import('../views/Messages.vue')
    },
    {
        path: '/signup',
        name: 'SignUp',
        component: SignUp
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/get-verify-code',
        name: 'GetVerifyCode',
        component: GetVerifyCode
    },
    {
        path: '/verify-code/:verificationCode',
        name: 'VerifyCode',
        component: VerifyCode,
        props: true
    },
    {
        path: '/complete-profile',
        name: 'CompleteProfile',
        component: ChangeInfoAfterSignup
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach(async (to, from, next) => {
    console.log("Navigation guard triggered");
    console.log("Navigating to:", to.path);

    const { checkAuth, isLoggedIn } = useUserState();

    const publicPages = ['/', '/login', '/signup', '/get-verify-code', '/verify-code'];
    const authRequired = !publicPages.includes(to.path);

    console.log("Auth required:", authRequired);
    console.log("Current isLoggedIn state:", isLoggedIn.value);

    if (authRequired) {
        await checkAuth();
        console.log("After checkAuth - isLoggedIn:", isLoggedIn.value);

        if (!isLoggedIn.value) {
            console.log("User not authenticated, redirecting to login");
            return next('/login');
        }
    }

    console.log("Proceeding with navigation");
    next();
})

export default router