import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import SignUpPage from '../components/SignUpPage.vue'
import Login from '../components/Login.vue'
import Logout from '../components/Logout.vue'
import GetVerifyCode from '../components/GetVerifyCode.vue'
import VerifyCode from '../components/VerifyCode.vue'
import ChangeInfoAfterSignup from '../components/ChangeInfoAfterSignup.vue'

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
        component: SignUpPage
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/logout',
        name: 'Logout',
        component: Logout
    },
    {
        path: '/get_verify_code',
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

export default router