<template>
  <div class="auth-page">
    <section class="auth-showcase">
      <div class="showcase-top">
        <div class="brand">
          <div class="brand-mark">F+</div>
          <div>
            <strong>FIT PLUS</strong>
            <span>健身房综合服务平台</span>
          </div>
        </div>
        <span class="edition">VUE × NODE.JS</span>
      </div>

      <div class="showcase-content">
        <span class="eyebrow">MOVE · TRACK · GROW</span>
        <h1>让每一次训练<br /><em>都有迹可循</em></h1>
        <p>连接会员、场馆与平台，用一套清晰的数字化流程，管理预约、打卡、体测与经营数据。</p>
        <div class="feature-row">
          <div>
            <strong>3</strong>
            <span>角色工作台</span>
          </div>
          <div>
            <strong>13</strong>
            <span>业务数据表</span>
          </div>
          <div>
            <strong>24h</strong>
            <span>服务在线</span>
          </div>
        </div>
      </div>

      <div class="showcase-quote">
        <div class="quote-mark">“</div>
        <p>自律不是约束，而是把身体和生活的主动权，重新交还给自己。</p>
        <span>FIT PLUS · 训练宣言</span>
      </div>

      <div class="orb orb-1" />
      <div class="orb orb-2" />
      <div class="grid-lines" />
      <div class="ring ring-1" />
      <div class="ring ring-2" />
    </section>

    <section class="auth-form-side">
      <div class="form-wrap">
        <div class="form-heading">
          <span class="eyebrow">WELCOME BACK</span>
          <h2>登录你的账号</h2>
          <p>会员、服务商与平台管理员使用同一个入口</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
          <el-form-item label="账号" prop="username">
            <el-input v-model="form.username" size="large" placeholder="请输入登录账号" clearable>
              <template #prefix><el-icon><User /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              size="large"
              placeholder="请输入登录密码"
              show-password
              @keyup.enter="submit"
            >
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>
          <div class="form-options">
            <el-checkbox v-model="remember">记住账号</el-checkbox>
            <span class="forgot">忘记密码请联系平台管理员</span>
          </div>
          <el-button type="primary" size="large" class="submit-btn" :loading="loading" @click="submit">
            进入平台
            <el-icon><Right /></el-icon>
          </el-button>
        </el-form>

        <div class="demo-area">
          <div class="demo-title"><span>演示账号</span><i /></div>
          <div class="demo-chips">
            <button
              v-for="account in demoAccounts"
              :key="account.username"
              class="demo-chip"
              :class="{ active: form.username === account.username }"
              @click="fillDemo(account)"
            >
              <span class="demo-icon"><el-icon><component :is="account.icon" /></el-icon></span>
              <span>
                <strong>{{ account.label }}</strong>
                <small>{{ account.username }} / {{ account.password }}</small>
              </span>
            </button>
          </div>
        </div>

        <p class="register-link">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </p>
      </div>
      <p class="copyright">© 2026 FIT PLUS · 基于Vue的健身房综合服务平台</p>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore, homePathForRole } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const formRef = ref();
const loading = ref(false);
const remember = ref(true);
const savedName = localStorage.getItem('fitness_saved_username') || '';

const form = reactive({
  username: savedName || 'demo',
  password: savedName ? '' : '123456'
});

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const demoAccounts = [
  { label: '会员端', username: 'demo', password: '123456', icon: 'User' },
  { label: '服务商端', username: 'provider', password: '123456', icon: 'Shop' },
  { label: '平台管理端', username: 'admin', password: 'admin123', icon: 'Setting' }
];

function fillDemo(account) {
  form.username = account.username;
  form.password = account.password;
}

async function submit() {
  if (loading.value) return;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    const user = await auth.login({ ...form });
    if (remember.value) localStorage.setItem('fitness_saved_username', form.username);
    else localStorage.removeItem('fitness_saved_username');
    ElMessage.success(`欢迎回来，${user.nickname || user.username}`);
    const redirect = route.query.redirect;
    router.replace(redirect || homePathForRole(user.role));
  } catch {
    // 错误提示由请求拦截器统一处理
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(480px, 1.08fr) minmax(420px, 0.92fr);
  background: #f7f9f7;
}

.auth-showcase {
  margin: 18px;
  border-radius: 28px;
  background:
    radial-gradient(circle at 82% 12%, rgba(200, 236, 102, 0.22), transparent 25%),
    radial-gradient(circle at 3% 92%, rgba(48, 151, 116, 0.33), transparent 28%),
    linear-gradient(145deg, #0e2c21 0%, #071a13 74%);
  color: #f2faf6;
  padding: 36px 42px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.showcase-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 45px;
  height: 45px;
  border-radius: 14px;
  background: var(--fitness-lime);
  color: #17321f;
  font-weight: 900;
  font-size: 18px;
  display: grid;
  place-items: center;
}

.brand div:last-child {
  display: flex;
  flex-direction: column;
}

.brand strong {
  letter-spacing: 1.5px;
  font-size: 16px;
}

.brand span {
  font-size: 10px;
  color: rgba(242, 250, 246, 0.5);
  margin-top: 2px;
}

.edition {
  font-size: 9px;
  letter-spacing: 1.8px;
  color: rgba(242, 250, 246, 0.42);
  border: 1px solid rgba(242, 250, 246, 0.13);
  border-radius: 99px;
  padding: 7px 12px;
}

.showcase-content {
  margin: auto 0;
  padding: 60px 0 48px;
  max-width: 560px;
  position: relative;
  z-index: 2;
}

.eyebrow {
  display: inline-block;
  color: var(--fitness-lime);
  font-size: 10px;
  letter-spacing: 2.5px;
  font-weight: 700;
}

.showcase-content h1 {
  font-size: clamp(42px, 5.2vw, 70px);
  line-height: 1.08;
  margin: 22px 0 22px;
  letter-spacing: -3px;
  font-weight: 800;
}

.showcase-content h1 em {
  font-style: normal;
  color: var(--fitness-lime);
}

.showcase-content > p {
  max-width: 440px;
  color: rgba(242, 250, 246, 0.58);
  font-size: 14px;
  line-height: 1.9;
}

.feature-row {
  display: flex;
  gap: 48px;
  margin-top: 40px;
}

.feature-row div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feature-row strong {
  font-size: 25px;
  color: #fff;
}

.feature-row span {
  font-size: 10px;
  color: rgba(242, 250, 246, 0.4);
  letter-spacing: 0.5px;
}

.showcase-quote {
  position: relative;
  z-index: 2;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  padding-top: 22px;
  max-width: 430px;
}

.showcase-quote p {
  font-size: 12px;
  line-height: 1.8;
  color: rgba(242, 250, 246, 0.56);
  margin: 0 0 8px;
}

.showcase-quote span {
  font-size: 9px;
  letter-spacing: 1.2px;
  color: rgba(242, 250, 246, 0.3);
}

.quote-mark {
  color: var(--fitness-lime);
  font-size: 36px;
  line-height: 1;
  height: 20px;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(1px);
}

.orb-1 {
  width: 380px;
  height: 380px;
  right: -190px;
  top: 22%;
  background: radial-gradient(circle, rgba(200, 236, 102, 0.15), transparent 70%);
}

.orb-2 {
  width: 260px;
  height: 260px;
  right: 18%;
  bottom: -150px;
  background: radial-gradient(circle, rgba(46, 183, 139, 0.18), transparent 70%);
}

.grid-lines {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: linear-gradient(120deg, black, transparent 65%);
}

.ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(200, 236, 102, 0.15);
}

.ring-1 {
  width: 430px;
  height: 430px;
  right: -120px;
  bottom: 18%;
}

.ring-2 {
  width: 560px;
  height: 560px;
  right: -185px;
  bottom: 10%;
}

.auth-form-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 60px 24px;
  position: relative;
}

.form-wrap {
  width: min(410px, 100%);
}

.form-heading {
  margin-bottom: 30px;
}

.form-heading .eyebrow {
  color: var(--fitness-primary);
}

.form-heading h2 {
  font-size: 30px;
  margin: 12px 0 8px;
  letter-spacing: -1px;
}

.form-heading p {
  color: var(--fitness-muted);
  font-size: 12px;
  margin: 0;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: -2px 0 20px;
}

.forgot {
  font-size: 11px;
  color: #99a69f;
}

.submit-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 14px;
}

.submit-btn .el-icon {
  margin-left: 6px;
}

.demo-area {
  margin-top: 28px;
}

.demo-title {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #95a39c;
  font-size: 10px;
  margin-bottom: 13px;
}

.demo-title i {
  flex: 1;
  height: 1px;
  background: #e6ebe8;
}

.demo-chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.demo-chip {
  border: 1px solid #e6ece8;
  background: #fff;
  border-radius: 12px;
  padding: 10px 8px;
  display: flex;
  align-items: center;
  gap: 7px;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.demo-chip:hover,
.demo-chip.active {
  border-color: var(--fitness-primary);
  box-shadow: 0 6px 16px rgba(15, 159, 120, 0.08);
}

.demo-icon {
  width: 27px;
  height: 27px;
  border-radius: 8px;
  background: #edf8f3;
  color: var(--fitness-primary);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.demo-chip > span:last-child {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.demo-chip strong {
  font-size: 10px;
  color: #3d5148;
}

.demo-chip small {
  font-size: 8px;
  color: #9eaaa4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.register-link {
  text-align: center;
  margin-top: 24px;
  font-size: 12px;
  color: #8d9b94;
}

.register-link a {
  color: var(--fitness-primary);
  font-weight: 700;
  margin-left: 4px;
}

.copyright {
  position: absolute;
  bottom: 18px;
  font-size: 9px;
  color: #b0bbb5;
}

@media (max-width: 980px) {
  .auth-page {
    grid-template-columns: 1fr;
  }
  .auth-showcase {
    min-height: 280px;
    margin: 12px;
    padding: 24px;
  }
  .showcase-content {
    padding: 36px 0 18px;
  }
  .showcase-content h1 {
    font-size: 38px;
    margin: 14px 0;
  }
  .showcase-content > p,
  .feature-row,
  .showcase-quote {
    display: none;
  }
  .auth-form-side {
    padding: 20px 24px 50px;
  }
  .copyright {
    bottom: 8px;
  }
}

@media (max-width: 520px) {
  .auth-showcase {
    min-height: 220px;
  }
  .showcase-content h1 {
    font-size: 31px;
    letter-spacing: -1.5px;
  }
  .edition {
    display: none;
  }
  .demo-chips {
    grid-template-columns: 1fr;
  }
  .form-heading h2 {
    font-size: 25px;
  }
}
</style>
