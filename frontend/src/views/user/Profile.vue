<template>
  <div class="page">
    <PageHeader title="个人中心" subtitle="完善个人资料，让场馆和教练更了解你的训练需求" />

    <div class="profile-layout">
      <aside class="profile-side">
        <section class="profile-card">
          <div class="profile-cover" />
          <div class="profile-avatar-wrap">
            <img v-if="auth.user?.avatar" :src="auth.user.avatar" class="profile-avatar" alt="" />
            <div v-else class="profile-avatar fallback">{{ displayInitial }}</div>
            <span class="member-level">FIT MEMBER</span>
          </div>
          <div class="profile-copy">
            <h2>{{ form.nickname || auth.user?.username }}</h2>
            <p>@{{ auth.user?.username }}</p>
            <div class="profile-badges">
              <span><el-icon><Medal /></el-icon>健身会员</span>
              <span><el-icon><Calendar /></el-icon>{{ joinDays }} 天</span>
            </div>
          </div>
          <div class="points-card">
            <div>
              <span>FIT POINTS</span>
              <strong>{{ auth.user?.points || 0 }}</strong>
            </div>
            <el-icon><Trophy /></el-icon>
          </div>
        </section>

        <section class="panel-card safety-card">
          <h3>账号安全</h3>
          <button @click="passwordVisible = true">
            <span><el-icon><Lock /></el-icon>修改登录密码</span>
            <el-icon><ArrowRight /></el-icon>
          </button>
          <button @click="router.push('/user/notifications')">
            <span><el-icon><Bell /></el-icon>消息通知</span>
            <el-icon><ArrowRight /></el-icon>
          </button>
        </section>
      </aside>

      <section class="panel-card profile-form-panel">
        <div class="panel-title">
          <div>
            <h2>基本资料</h2>
            <span>这些信息将用于预约联系和体测档案</span>
          </div>
          <el-button type="primary" :loading="saving" @click="save">保存修改</el-button>
        </div>
        <el-form :model="form" label-position="top" class="profile-form">
          <div class="form-grid">
            <el-form-item label="昵称">
              <el-input v-model="form.nickname" placeholder="展示在平台上的名称" />
            </el-form-item>
            <el-form-item label="真实姓名">
              <el-input v-model="form.real_name" placeholder="用于预约与体测记录" />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="form.phone" placeholder="接收预约通知" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="form.email" placeholder="选填" />
            </el-form-item>
            <el-form-item label="性别">
              <el-radio-group v-model="form.gender">
                <el-radio-button value="male">男</el-radio-button>
                <el-radio-button value="female">女</el-radio-button>
                <el-radio-button value="unknown">保密</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="生日">
              <el-date-picker
                v-model="form.birthday"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择生日"
                style="width: 100%"
              />
            </el-form-item>
          </div>
          <el-form-item label="头像地址">
            <el-input v-model="form.avatar" placeholder="填写一个图片 URL，留空则显示昵称首字">
              <template #prefix><el-icon><Link /></el-icon></template>
            </el-input>
          </el-form-item>
          <div class="avatar-preview-row">
            <img v-if="form.avatar" :src="form.avatar" class="avatar-preview" alt="" />
            <div v-else class="avatar-preview fallback">{{ displayInitial }}</div>
            <div>
              <strong>头像预览</strong>
              <p>建议使用正方形图片，尺寸不小于 200 × 200 像素。</p>
            </div>
          </div>
        </el-form>

        <div class="account-info">
          <div><span>账号角色</span><strong>普通会员</strong></div>
          <div><span>注册时间</span><strong>{{ formatDate(auth.user?.created_at) }}</strong></div>
          <div><span>当前积分</span><strong>{{ auth.user?.points || 0 }} 分</strong></div>
        </div>
      </section>
    </div>

    <el-dialog v-model="passwordVisible" title="修改登录密码" width="420px">
      <el-form ref="passwordRef" :model="passwordForm" :rules="passwordRules" label-position="top">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordVisible = false">取消</el-button>
        <el-button type="primary" :loading="passwordSaving" @click="changePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import { useAuthStore } from '../../stores/auth';
import { formatDate } from '../../utils/constants';

const router = useRouter();
const auth = useAuthStore();
const saving = ref(false);
const passwordVisible = ref(false);
const passwordSaving = ref(false);
const passwordRef = ref();
const form = reactive({
  nickname: '',
  real_name: '',
  phone: '',
  email: '',
  gender: 'unknown',
  birthday: '',
  avatar: ''
});
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const displayInitial = computed(() => (form.nickname || auth.displayName || 'U').slice(0, 1).toUpperCase());
const joinDays = computed(() => {
  if (!auth.user?.created_at) return 0;
  return Math.max(Math.floor((Date.now() - new Date(auth.user.created_at).getTime()) / 86400000), 1);
});

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) =>
        value === passwordForm.newPassword ? callback() : callback(new Error('两次密码不一致')),
      trigger: 'blur'
    }
  ]
};

async function load() {
  const user = await request.get('/user/profile');
  Object.assign(form, {
    nickname: user.nickname || '',
    real_name: user.real_name || '',
    phone: user.phone || '',
    email: user.email || '',
    gender: user.gender || 'unknown',
    birthday: user.birthday || '',
    avatar: user.avatar || ''
  });
}

async function save() {
  saving.value = true;
  try {
    await request.put('/user/profile', { ...form });
    auth.updateLocalUser({ ...form });
    ElMessage.success('个人资料已更新');
  } finally {
    saving.value = false;
  }
}

async function changePassword() {
  const valid = await passwordRef.value?.validate().catch(() => false);
  if (!valid) return;
  passwordSaving.value = true;
  try {
    await request.put('/auth/password', {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    });
    ElMessage.success('密码修改成功');
    passwordVisible.value = false;
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  } finally {
    passwordSaving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 18px;
}

.profile-side {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.profile-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(19, 59, 45, 0.06);
  box-shadow: var(--fitness-shadow);
  position: relative;
}

.profile-cover {
  height: 100px;
  background:
    radial-gradient(circle at 78% 15%, rgba(200, 236, 102, 0.28), transparent 30%),
    linear-gradient(135deg, #12372a, #1d5e46);
}

.profile-avatar-wrap {
  margin: -40px 0 0 20px;
  position: relative;
  width: fit-content;
}

.profile-avatar {
  width: 82px;
  height: 82px;
  border-radius: 22px;
  object-fit: cover;
  border: 4px solid #fff;
  box-shadow: 0 6px 16px rgba(14, 49, 35, 0.14);
}

.profile-avatar.fallback {
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #d9f4e9, #a9ddc8);
  color: #166e54;
  font-size: 30px;
  font-weight: 800;
}

.member-level {
  position: absolute;
  bottom: 4px;
  left: 62px;
  background: var(--fitness-lime);
  color: #17321f;
  font-size: 6px;
  font-weight: 800;
  letter-spacing: 0.7px;
  border-radius: 99px;
  padding: 3px 6px;
  white-space: nowrap;
}

.profile-copy {
  padding: 12px 20px 15px;
}

.profile-copy h2 {
  margin: 0;
  font-size: 18px;
}

.profile-copy > p {
  margin: 3px 0 10px;
  font-size: 9px;
  color: #99a69f;
}

.profile-badges {
  display: flex;
  gap: 6px;
}

.profile-badges span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 8px;
  color: #6e8177;
  background: #f3f8f5;
  border-radius: 5px;
  padding: 3px 6px;
}

.points-card {
  margin: 0 15px 16px;
  border-radius: 13px;
  padding: 13px 15px;
  background:
    radial-gradient(circle at 90% 10%, rgba(200, 236, 102, 0.2), transparent 38%),
    #102e22;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.points-card div {
  display: flex;
  flex-direction: column;
}

.points-card span {
  font-size: 6px;
  letter-spacing: 1.5px;
  color: var(--fitness-lime);
}

.points-card strong {
  font-size: 27px;
  line-height: 1.2;
}

.points-card > .el-icon {
  font-size: 27px;
  color: rgba(200, 236, 102, 0.45);
}

.safety-card {
  padding: 16px;
}

.safety-card h3 {
  margin: 0 0 10px;
  font-size: 12px;
}

.safety-card button {
  width: 100%;
  border: 0;
  background: transparent;
  border-top: 1px solid #f0f4f2;
  padding: 10px 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #66796e;
  font-size: 9px;
  cursor: pointer;
}

.safety-card button span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-form-panel {
  min-height: 460px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 16px;
}

.avatar-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f7faf8;
  border-radius: 10px;
  padding: 11px;
  margin-top: 4px;
}

.avatar-preview {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
}

.avatar-preview.fallback {
  display: grid;
  place-items: center;
  background: #d9f0e6;
  color: #1b7c5e;
  font-weight: 800;
}

.avatar-preview-row div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.avatar-preview-row strong {
  font-size: 9px;
}

.avatar-preview-row p {
  font-size: 8px;
  color: #98a59e;
  margin: 0;
}

.account-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  border-top: 1px solid #edf1ef;
  margin-top: 22px;
  padding-top: 18px;
}

.account-info div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.account-info span {
  font-size: 8px;
  color: #98a59e;
}

.account-info strong {
  font-size: 11px;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
  .profile-side {
    flex-direction: row;
  }
  .profile-card {
    flex: 1;
  }
  .safety-card {
    width: 230px;
  }
}

@media (max-width: 700px) {
  .profile-side {
    flex-direction: column;
  }
  .safety-card {
    width: auto;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .account-info {
    grid-template-columns: 1fr;
  }
}
</style>
