<template>
  <div class="portal-shell">
    <aside v-if="!isMobile" class="sidebar" :class="{ collapsed }">
      <div class="brand" @click="router.push(homePath)">
        <div class="brand-mark">F+</div>
        <div v-show="!collapsed" class="brand-copy">
          <strong>FIT PLUS</strong>
          <span>健身房综合服务平台</span>
        </div>
      </div>

      <div v-show="!collapsed" class="role-card">
        <span class="role-eyebrow">{{ roleInfo.short }}</span>
        <strong>{{ roleInfo.label }}</strong>
        <span>{{ roleSubtitle }}</span>
      </div>

      <nav class="nav-list">
        <router-link
          v-for="item in menuList"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          :title="item.label"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span v-show="!collapsed">{{ item.label }}</span>
          <i v-if="!collapsed" class="nav-dot" />
        </router-link>
      </nav>

      <div class="sidebar-foot">
        <div class="sidebar-user">
          <div class="avatar sidebar-avatar">{{ initial }}</div>
          <div v-show="!collapsed" class="user-copy">
            <strong>{{ auth.displayName }}</strong>
            <span>{{ roleInfo.label }}</span>
          </div>
        </div>
        <button class="collapse-btn" @click="collapsed = !collapsed">
          <el-icon><Expand v-if="collapsed" /><Fold v-else /></el-icon>
        </button>
      </div>
    </aside>

    <el-drawer
      v-model="mobileMenu"
      direction="ltr"
      size="270px"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="mobile-brand">
        <div class="brand-mark">F+</div>
        <div class="brand-copy">
          <strong>FIT PLUS</strong>
          <span>{{ roleInfo.label }}</span>
        </div>
      </div>
      <nav class="nav-list mobile-nav">
        <router-link
          v-for="item in menuList"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="mobileMenu = false"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </el-drawer>

    <div class="main-area" :class="{ 'sidebar-collapsed': collapsed && !isMobile }">
      <header class="topbar">
        <div class="topbar-left">
          <button v-if="isMobile" class="mobile-menu-btn" @click="mobileMenu = true">
            <el-icon><Menu /></el-icon>
          </button>
          <div>
            <div class="breadcrumb">
              <span>{{ roleInfo.label }}</span>
              <i>/</i>
              <strong>{{ route.meta.title }}</strong>
            </div>
            <h2>{{ greeting }}，{{ auth.displayName }}</h2>
          </div>
        </div>
        <div class="topbar-actions">
          <div class="date-chip">
            <el-icon><Calendar /></el-icon>
            <span>{{ todayText }}</span>
          </div>
          <button
            v-if="auth.role === 'user'"
            class="bell-btn"
            @click="router.push('/user/notifications')"
          >
            <el-icon><Bell /></el-icon>
            <b v-if="unread > 0">{{ unread > 99 ? '99+' : unread }}</b>
          </button>
          <el-dropdown trigger="click" @command="handleCommand">
            <button class="profile-trigger">
              <img v-if="auth.user?.avatar" :src="auth.user.avatar" class="avatar" alt="" />
              <span v-else class="avatar">{{ initial }}</span>
              <span class="trigger-name">{{ auth.displayName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  {{ auth.role === 'provider' ? '门店信息' : auth.role === 'admin' ? '平台概览' : '个人中心' }}
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { menus, roleMeta } from '../config/menus';
import { useAuthStore, homePathForRole } from '../stores/auth';
import request from '../api/request';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const collapsed = ref(false);
const mobileMenu = ref(false);
const isMobile = ref(window.innerWidth < 1000);
const unread = ref(0);

const roleInfo = computed(() => roleMeta[auth.role] || roleMeta.user);
const menuList = computed(() => menus[auth.role] || []);
const homePath = computed(() => homePathForRole(auth.role));
const initial = computed(() => (auth.displayName || 'U').slice(0, 1).toUpperCase());
const todayText = computed(() => {
  const date = new Date();
  const week = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  return `${date.getMonth() + 1}月${date.getDate()}日 周${week}`;
});
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});
const roleSubtitle = computed(() => {
  if (auth.role === 'provider') return auth.provider?.name || '完善门店资料';
  if (auth.role === 'admin') return '平台运营与审核中心';
  return `健身积分 ${auth.user?.points || 0}`;
});

function isActive(path) {
  if (path === '/user/venues') return route.path.startsWith('/user/venues');
  return route.path === path;
}

async function loadUnread() {
  if (auth.role !== 'user') return;
  try {
    const data = await request.get('/user/notifications', { params: { pageSize: 1, unread: 1 } });
    unread.value = data.unread || 0;
  } catch {
    // 静默失败，不打断页面使用
  }
}

async function handleCommand(command) {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出当前账号吗？', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    });
    auth.logout();
    router.replace('/login');
    return;
  }
  if (auth.role === 'provider') router.push('/provider/store');
  else if (auth.role === 'admin') router.push('/admin/dashboard');
  else router.push('/user/profile');
}

function handleResize() {
  isMobile.value = window.innerWidth < 1000;
}

onMounted(() => {
  loadUnread();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => window.removeEventListener('resize', handleResize));
</script>

<style scoped>
.portal-shell {
  min-height: 100vh;
  display: flex;
  background:
    radial-gradient(circle at 90% 0%, rgba(200, 236, 102, 0.12), transparent 22%),
    var(--fitness-bg);
}

.sidebar {
  width: 246px;
  flex-shrink: 0;
  background:
    radial-gradient(circle at 15% 5%, rgba(200, 236, 102, 0.13), transparent 28%),
    linear-gradient(180deg, #0f2b21 0%, #0a1d17 100%);
  color: #eaf4ef;
  display: flex;
  flex-direction: column;
  padding: 22px 16px 16px;
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 20;
  transition: width 0.25s ease;
}

.sidebar.collapsed {
  width: 82px;
  padding-left: 12px;
  padding-right: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 6px;
  cursor: pointer;
  min-height: 48px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: var(--fitness-lime);
  color: #17321f;
  font-weight: 900;
  font-size: 17px;
  display: grid;
  place-items: center;
  letter-spacing: -1px;
  box-shadow: 0 8px 24px rgba(200, 236, 102, 0.2);
  flex-shrink: 0;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-copy strong {
  font-size: 16px;
  letter-spacing: 1.3px;
}

.brand-copy span {
  color: rgba(234, 244, 239, 0.52);
  font-size: 10px;
  margin-top: 2px;
  white-space: nowrap;
}

.role-card {
  margin: 22px 4px 20px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.role-card .role-eyebrow {
  font-size: 9px;
  letter-spacing: 1.8px;
  color: var(--fitness-lime);
}

.role-card strong {
  font-size: 14px;
}

.role-card > span:last-child {
  font-size: 11px;
  color: rgba(234, 244, 239, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
  padding-right: 2px;
  flex: 1;
}

.nav-item {
  min-height: 44px;
  padding: 0 13px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(234, 244, 239, 0.62);
  font-size: 13px;
  transition: all 0.18s ease;
  position: relative;
  white-space: nowrap;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.active {
  background: var(--fitness-lime);
  color: #152b1d;
  font-weight: 700;
  box-shadow: 0 10px 22px rgba(200, 236, 102, 0.13);
}

.nav-item .el-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.nav-dot {
  margin-left: auto;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0;
}

.nav-item.active .nav-dot {
  opacity: 0.7;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0;
}

.sidebar-foot {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.sidebar-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(200, 236, 102, 0.16);
  color: var(--fitness-lime);
}

.user-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-copy strong {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-copy span {
  font-size: 10px;
  color: rgba(234, 244, 239, 0.42);
}

.collapse-btn {
  width: 30px;
  height: 30px;
  border: 0;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(234, 244, 239, 0.6);
  border-radius: 8px;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.main-area {
  flex: 1;
  margin-left: 246px;
  min-width: 0;
  transition: margin-left 0.25s ease;
}

.main-area.sidebar-collapsed {
  margin-left: 82px;
}

.topbar {
  height: 88px;
  padding: 18px 32px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 15;
  background: rgba(244, 247, 245, 0.86);
  backdrop-filter: blur(14px);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #8a9992;
  margin-bottom: 5px;
}

.breadcrumb i {
  font-style: normal;
  opacity: 0.5;
}

.breadcrumb strong {
  color: var(--fitness-primary);
  font-weight: 600;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar h2 {
  margin: 0;
  font-size: 21px;
  letter-spacing: -0.3px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-chip {
  height: 38px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-radius: 99px;
  background: #fff;
  border: 1px solid var(--fitness-line);
  color: #6e7e76;
  font-size: 12px;
}

.bell-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--fitness-line);
  background: #fff;
  color: #53665d;
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
}

.bell-btn b {
  position: absolute;
  top: -3px;
  right: -2px;
  min-width: 17px;
  height: 17px;
  border-radius: 99px;
  background: #f26d5b;
  color: #fff;
  font-size: 9px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border: 2px solid var(--fitness-bg);
}

.profile-trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  background: #fff;
  border: 1px solid var(--fitness-line);
  border-radius: 99px;
  padding: 4px 11px 4px 4px;
  cursor: pointer;
  color: var(--fitness-ink);
}

.profile-trigger .avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.trigger-name {
  font-size: 12px;
  font-weight: 600;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-area {
  padding: 10px 32px 32px;
  max-width: 1520px;
  margin: 0 auto;
}

.mobile-menu-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--fitness-line);
  background: #fff;
  border-radius: 10px;
  color: var(--fitness-ink);
}

.mobile-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 8px 20px;
}

.mobile-brand .brand-copy strong {
  color: #15251f;
}

.mobile-brand .brand-copy span {
  color: #8b9a93;
}

.mobile-nav .nav-item {
  color: #53665d;
  min-height: 48px;
}

.mobile-nav .nav-item.active {
  color: #152b1d;
}

@media (max-width: 1000px) {
  .main-area,
  .main-area.sidebar-collapsed {
    margin-left: 0;
  }
  .topbar {
    padding: 14px 18px 10px;
    height: 78px;
  }
  .content-area {
    padding: 10px 18px 24px;
  }
  .date-chip {
    display: none;
  }
}

@media (max-width: 640px) {
  .topbar h2 {
    font-size: 17px;
  }
  .trigger-name {
    display: none;
  }
  .profile-trigger {
    padding-right: 4px;
  }
  .content-area {
    padding: 8px 12px 22px;
  }
}
</style>
