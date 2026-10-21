import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore, homePathForRole } from '../stores/auth';

const routes = [
  { path: '/', redirect: '/user/home' },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/Register.vue'),
    meta: { public: true, title: '注册' }
  },
  {
    path: '/user',
    component: () => import('../layouts/PortalLayout.vue'),
    meta: { role: 'user' },
    redirect: '/user/home',
    children: [
      { path: 'home', component: () => import('../views/user/UserHome.vue'), meta: { title: '首页概览' } },
      { path: 'venues', component: () => import('../views/user/Venues.vue'), meta: { title: '场馆服务' } },
      {
        path: 'venues/:id',
        component: () => import('../views/user/VenueDetail.vue'),
        meta: { title: '场馆详情', hideInMenu: true }
      },
      { path: 'appointments', component: () => import('../views/user/Appointments.vue'), meta: { title: '我的预约' } },
      { path: 'checkins', component: () => import('../views/user/Checkins.vue'), meta: { title: '健身打卡' } },
      { path: 'body-tests', component: () => import('../views/user/BodyTests.vue'), meta: { title: '体测数据' } },
      { path: 'favorites', component: () => import('../views/user/Favorites.vue'), meta: { title: '我的收藏' } },
      { path: 'reviews', component: () => import('../views/user/Reviews.vue'), meta: { title: '我的评价' } },
      {
        path: 'notifications',
        component: () => import('../views/user/Notifications.vue'),
        meta: { title: '消息通知' }
      },
      { path: 'profile', component: () => import('../views/user/Profile.vue'), meta: { title: '个人中心' } }
    ]
  },
  {
    path: '/provider',
    component: () => import('../layouts/PortalLayout.vue'),
    meta: { role: 'provider' },
    redirect: '/provider/dashboard',
    children: [
      {
        path: 'dashboard',
        component: () => import('../views/provider/ProviderDashboard.vue'),
        meta: { title: '经营概览' }
      },
      { path: 'store', component: () => import('../views/provider/Store.vue'), meta: { title: '门店信息' } },
      { path: 'coaches', component: () => import('../views/provider/Coaches.vue'), meta: { title: '教练管理' } },
      { path: 'services', component: () => import('../views/provider/Services.vue'), meta: { title: '服务管理' } },
      { path: 'orders', component: () => import('../views/provider/Orders.vue'), meta: { title: '预约订单' } },
      { path: 'checkins', component: () => import('../views/provider/Checkins.vue'), meta: { title: '打卡核验' } },
      { path: 'body-tests', component: () => import('../views/provider/BodyTests.vue'), meta: { title: '学员体测' } },
      { path: 'reviews', component: () => import('../views/provider/Reviews.vue'), meta: { title: '评价管理' } },
      { path: 'stats', component: () => import('../views/provider/Stats.vue'), meta: { title: '营业数据' } }
    ]
  },
  {
    path: '/admin',
    component: () => import('../layouts/PortalLayout.vue'),
    meta: { role: 'admin' },
    redirect: '/admin/dashboard',
    children: [
      { path: 'dashboard', component: () => import('../views/admin/AdminDashboard.vue'), meta: { title: '平台概览' } },
      { path: 'providers', component: () => import('../views/admin/Providers.vue'), meta: { title: '服务商入驻' } },
      { path: 'users', component: () => import('../views/admin/Users.vue'), meta: { title: '用户账号' } },
      { path: 'orders', component: () => import('../views/admin/Orders.vue'), meta: { title: '订单监管' } },
      { path: 'categories', component: () => import('../views/admin/Categories.vue'), meta: { title: '服务分类' } },
      {
        path: 'checkin-rules',
        component: () => import('../views/admin/CheckinRules.vue'),
        meta: { title: '打卡规则' }
      },
      { path: 'reviews', component: () => import('../views/admin/Reviews.vue'), meta: { title: '评价审核' } },
      { path: 'stats', component: () => import('../views/admin/Stats.vue'), meta: { title: '平台数据' } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.public) {
    if (auth.isLoggedIn && (to.path === '/login' || to.path === '/register')) {
      return homePathForRole(auth.role);
    }
    return true;
  }
  if (!auth.isLoggedIn) return { path: '/login', query: { redirect: to.fullPath } };
  const requiredRole = to.matched.find((record) => record.meta.role)?.meta.role;
  if (requiredRole && auth.role !== requiredRole) {
    return homePathForRole(auth.role);
  }
  return true;
});

router.afterEach((to) => {
  document.title = `${to.meta.title || '综合服务平台'} · FIT PLUS`;
});

export default router;
