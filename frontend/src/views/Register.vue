<template>
  <div class="register-page">
    <div class="register-panel">
      <div class="register-brand" @click="router.push('/login')">
        <div class="brand-mark">F+</div>
        <div>
          <strong>FIT PLUS</strong>
          <span>健身房综合服务平台</span>
        </div>
      </div>

      <div class="register-heading">
        <span class="eyebrow">JOIN FIT PLUS</span>
        <h1>创建你的账号</h1>
        <p>选择身份，开启属于你的健身服务体验</p>
      </div>

      <div class="role-switch">
        <button :class="{ active: form.role === 'user' }" @click="form.role = 'user'">
          <el-icon><User /></el-icon>
          <span><strong>我是会员</strong><small>找场馆、约课程、记录训练</small></span>
        </button>
        <button :class="{ active: form.role === 'provider' }" @click="form.role = 'provider'">
          <el-icon><Shop /></el-icon>
          <span><strong>我是服务商</strong><small>入驻平台、管理门店与订单</small></span>
        </button>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="登录账号" prop="username">
            <el-input v-model="form.username" size="large" placeholder="3-20 位字母或数字" />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="form.nickname" size="large" placeholder="展示在平台中的名称" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" size="large" show-password placeholder="至少 6 位" />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              size="large"
              show-password
              placeholder="再次输入密码"
            />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" size="large" placeholder="用于接收预约通知" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" size="large" placeholder="选填" />
          </el-form-item>
        </div>

        <div v-if="form.role === 'provider'" class="provider-fields">
          <div class="section-label"><span>门店入驻信息</span><i /></div>
          <el-form-item label="门店名称" prop="storeName">
            <el-input v-model="form.storeName" size="large" placeholder="例如：燃力健身 · 中心店" />
          </el-form-item>
          <div class="form-grid">
            <el-form-item label="门店地址">
              <el-input v-model="form.storeAddress" size="large" placeholder="详细经营地址" />
            </el-form-item>
            <el-form-item label="营业执照编号">
              <el-input v-model="form.licenseNo" size="large" placeholder="统一社会信用代码" />
            </el-form-item>
          </div>
          <div class="audit-tip">
            <el-icon><InfoFilled /></el-icon>
            提交后门店将进入平台审核，审核通过后即可上架服务。
          </div>
        </div>

        <el-button type="primary" size="large" class="register-btn" :loading="loading" @click="submit">
          创建账号
        </el-button>
      </el-form>

      <p class="login-link">已有账号？<router-link to="/login">返回登录</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const formRef = ref();
const loading = ref(false);
const form = reactive({
  role: 'user',
  username: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  phone: '',
  email: '',
  storeName: '',
  storeAddress: '',
  licenseNo: ''
});

const validateConfirm = (rule, value, callback) => {
  if (value !== form.password) callback(new Error('两次输入的密码不一致'));
  else callback();
};

const rules = {
  username: [
    { required: true, message: '请输入登录账号', trigger: 'blur' },
    { min: 3, max: 20, message: '账号长度为 3-20 位', trigger: 'blur' }
  ],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  storeName: [{ required: true, message: '请输入门店名称', trigger: 'blur' }]
};

watch(
  () => form.role,
  () => formRef.value?.clearValidate()
);

async function submit() {
  if (loading.value) return;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    const result = await auth.register({ ...form });
    ElMessage.success(
      form.role === 'provider' ? '入驻申请已提交，请等待平台审核' : '注册成功，请使用新账号登录'
    );
    router.replace({ path: '/login', query: { username: form.username } });
  } catch {
    // 统一错误提示
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  padding: 32px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  background:
    radial-gradient(circle at 8% 5%, rgba(200, 236, 102, 0.24), transparent 24%),
    radial-gradient(circle at 95% 90%, rgba(15, 159, 120, 0.16), transparent 25%),
    #f4f7f5;
}

.register-panel {
  width: min(760px, 100%);
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(20, 60, 45, 0.07);
  box-shadow: 0 30px 80px rgba(15, 55, 40, 0.11);
  border-radius: 26px;
  padding: 34px 48px 30px;
  backdrop-filter: blur(10px);
}

.register-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  cursor: pointer;
  width: fit-content;
}

.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--fitness-lime);
  color: #17321f;
  font-weight: 900;
  display: grid;
  place-items: center;
}

.register-brand div:last-child {
  display: flex;
  flex-direction: column;
}

.register-brand strong {
  font-size: 14px;
  letter-spacing: 1.2px;
}

.register-brand span {
  font-size: 9px;
  color: #91a098;
  margin-top: 2px;
}

.register-heading {
  margin: 32px 0 24px;
}

.eyebrow {
  font-size: 9px;
  letter-spacing: 2.2px;
  color: var(--fitness-primary);
  font-weight: 700;
}

.register-heading h1 {
  font-size: 30px;
  margin: 9px 0 6px;
  letter-spacing: -1px;
}

.register-heading p {
  margin: 0;
  font-size: 12px;
  color: var(--fitness-muted);
}

.role-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 26px;
}

.role-switch button {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f7f9f8;
  border: 1.5px solid transparent;
  border-radius: 13px;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  color: #708078;
  transition: all 0.18s ease;
}

.role-switch button.active {
  background: #f0faf6;
  border-color: var(--fitness-primary);
  color: var(--fitness-primary-dark);
  box-shadow: 0 8px 18px rgba(15, 159, 120, 0.07);
}

.role-switch .el-icon {
  font-size: 22px;
}

.role-switch span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.role-switch strong {
  font-size: 12px;
  color: var(--fitness-ink);
}

.role-switch small {
  font-size: 9px;
  color: #9aa8a1;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 16px;
}

.provider-fields {
  border-top: 1px dashed #e2e9e5;
  padding-top: 20px;
  margin-top: 2px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  font-weight: 700;
  color: #5b6e65;
  margin-bottom: 14px;
}

.section-label i {
  height: 1px;
  flex: 1;
  background: #e7ece9;
}

.audit-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f6f9f7;
  border-radius: 9px;
  padding: 9px 12px;
  color: #7d8d85;
  font-size: 10px;
  margin-bottom: 18px;
}

.register-btn {
  width: 100%;
  height: 47px;
  border-radius: 12px;
  margin-top: 4px;
}

.login-link {
  text-align: center;
  color: #8e9c95;
  font-size: 11px;
  margin: 18px 0 0;
}

.login-link a {
  color: var(--fitness-primary);
  font-weight: 700;
}

@media (max-width: 640px) {
  .register-page {
    padding: 12px;
  }
  .register-panel {
    padding: 24px 20px;
    border-radius: 18px;
  }
  .form-grid,
  .role-switch {
    grid-template-columns: 1fr;
  }
}
</style>
