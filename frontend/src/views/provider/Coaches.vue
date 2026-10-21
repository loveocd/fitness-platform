<template>
  <div class="page">
    <PageHeader title="教练管理" subtitle="维护教练档案与专业信息，让会员更了解你的团队">
      <el-button type="primary" :disabled="providerStatus !== 'approved'" @click="openCreate">
        <el-icon><Plus /></el-icon>添加教练
      </el-button>
    </PageHeader>

    <el-alert
      v-if="providerStatus && providerStatus !== 'approved'"
      class="coach-alert"
      type="warning"
      :closable="false"
      show-icon
      title="门店通过平台审核后，才能添加或编辑教练信息。"
    />

    <section class="coach-summary">
      <div v-for="item in summary" :key="item.label" class="summary-item">
        <span class="summary-icon" :style="{ background: item.bg, color: item.color }">
          <el-icon><component :is="item.icon" /></el-icon>
        </span>
        <div><strong>{{ item.value }}</strong><span>{{ item.label }}</span></div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-title">
        <div>
          <h2>教练团队</h2>
          <span>共 {{ list.length }} 位教练，{{ activeCount }} 位在职</span>
        </div>
        <el-input v-model="keyword" placeholder="搜索教练姓名或擅长领域" clearable style="width: 240px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
      </div>

      <el-table v-loading="loading" :data="filteredList" style="width: 100%">
        <el-table-column label="教练" min-width="180">
          <template #default="{ row }">
            <div class="coach-cell">
              <img v-if="row.avatar" :src="row.avatar" class="coach-avatar" alt="" />
              <span v-else class="coach-avatar fallback">{{ row.name.slice(0, 1) }}</span>
              <div>
                <strong>{{ row.name }}</strong>
                <span>{{ row.title || '教练' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="specialties" label="擅长领域" min-width="200" show-overflow-tooltip />
        <el-table-column label="从业年限" width="100">
          <template #default="{ row }">{{ row.experience_years }} 年</template>
        </el-table-column>
        <el-table-column label="评分" width="90">
          <template #default="{ row }">
            <span class="rating"><el-icon><StarFilled /></el-icon>{{ row.rating }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="order_count" label="服务订单" width="100" />
        <el-table-column label="在职状态" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="Number(row.status)"
              :active-value="1"
              :inactive-value="0"
              :disabled="providerStatus !== 'approved'"
              @change="(value) => toggleStatus(row, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button text type="danger" size="small" @click="remove(row)">设为离职</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑教练信息' : '添加教练'" width="600px" destroy-on-close>
      <div class="dialog-coach-head">
        <img v-if="form.avatar" :src="form.avatar" class="dialog-avatar" alt="" />
        <div v-else class="dialog-avatar fallback">{{ (form.name || '教').slice(0, 1) }}</div>
        <div>
          <strong>{{ form.name || '新教练' }}</strong>
          <span>{{ form.title || '完善职称与擅长领域' }}</span>
        </div>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="教练姓名" prop="name">
            <el-input v-model="form.name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="职称">
            <el-input v-model="form.title" placeholder="例如：高级私人教练" />
          </el-form-item>
          <el-form-item label="从业年限">
            <el-input-number v-model="form.experience_years" :min="0" :max="50" style="width: 100%" />
          </el-form-item>
          <el-form-item label="评分">
            <el-input-number v-model="form.rating" :min="1" :max="5" :step="0.1" :precision="1" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="擅长领域">
          <el-input v-model="form.specialties" placeholder="多个领域用顿号分隔，例如：增肌塑形、减脂、体态改善" />
        </el-form-item>
        <el-form-item label="头像地址">
          <el-input v-model="form.avatar" placeholder="填写教练头像图片 URL" />
        </el-form-item>
        <el-form-item label="教练简介">
          <el-input v-model="form.intro" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="介绍教练资质、教学风格与代表成果" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存教练</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';

const loading = ref(false);
const saving = ref(false);
const list = ref([]);
const keyword = ref('');
const providerStatus = ref('approved');
const dialogVisible = ref(false);
const editingId = ref(null);
const formRef = ref();
const form = reactive({
  name: '',
  avatar: '',
  title: '',
  specialties: '',
  experience_years: 3,
  intro: '',
  rating: 5.0,
  status: 1
});

const rules = {
  name: [{ required: true, message: '请输入教练姓名', trigger: 'blur' }]
};

const activeCount = computed(() => list.value.filter((item) => Number(item.status) === 1).length);
const filteredList = computed(() => {
  const key = keyword.value.trim().toLowerCase();
  if (!key) return list.value;
  return list.value.filter(
    (item) =>
      item.name.toLowerCase().includes(key) ||
      String(item.specialties || '').toLowerCase().includes(key) ||
      String(item.title || '').toLowerCase().includes(key)
  );
});
const summary = computed(() => [
  { label: '教练总数', value: list.value.length, icon: 'UserFilled', bg: '#eaf7f2', color: '#0f9f78' },
  { label: '在职教练', value: activeCount.value, icon: 'CircleCheck', bg: '#edf2fe', color: '#557cd0' },
  { label: '累计服务订单', value: list.value.reduce((sum, item) => sum + Number(item.order_count || 0), 0), icon: 'Tickets', bg: '#fff4e2', color: '#d9982e' },
  { label: '团队平均评分', value: averageRating.value, icon: 'StarFilled', bg: '#f3effd', color: '#846bd2' }
]);

const averageRating = computed(() => {
  if (!list.value.length) return '—';
  return (list.value.reduce((sum, item) => sum + Number(item.rating), 0) / list.value.length).toFixed(1);
});

async function load() {
  loading.value = true;
  try {
    const [coaches, profile] = await Promise.all([
      request.get('/provider/coaches'),
      request.get('/provider/profile')
    ]);
    list.value = coaches;
    providerStatus.value = profile.status;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    name: '',
    avatar: '',
    title: '',
    specialties: '',
    experience_years: 3,
    intro: '',
    rating: 5.0,
    status: 1
  });
}

function openCreate() {
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    avatar: row.avatar || '',
    title: row.title || '',
    specialties: row.specialties || '',
    experience_years: row.experience_years,
    intro: row.intro || '',
    rating: Number(row.rating),
    status: Number(row.status)
  });
  dialogVisible.value = true;
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (editingId.value) {
      await request.put(`/provider/coaches/${editingId.value}`, { ...form });
      ElMessage.success('教练信息已更新');
    } else {
      await request.post('/provider/coaches', { ...form });
      ElMessage.success('教练已添加');
    }
    dialogVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row, value) {
  await request.put(`/provider/coaches/${row.id}`, { ...row, status: value });
  ElMessage.success(value ? '教练已恢复在职' : '教练已设为离职');
  load();
}

async function remove(row) {
  await ElMessageBox.confirm(`确定将「${row.name}」设为离职吗？历史订单会保留。`, '设为离职', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  });
  await request.delete(`/provider/coaches/${row.id}`);
  ElMessage.success('已设为离职');
  load();
}

onMounted(load);
</script>

<style scoped>
.coach-alert {
  border-radius: 10px;
  margin-bottom: 14px;
}

.coach-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 14px;
  padding: 14px 15px;
}

.summary-icon {
  width: 35px;
  height: 35px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 17px;
}

.summary-item div {
  display: flex;
  flex-direction: column;
}

.summary-item strong {
  font-size: 19px;
  line-height: 1.1;
}

.summary-item span:last-child {
  font-size: 8px;
  color: #98a59e;
  margin-top: 2px;
}

.coach-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.coach-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  object-fit: cover;
}

.coach-avatar.fallback {
  background: #e4f5ed;
  color: #167c5d;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 13px;
}

.coach-cell div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.coach-cell strong {
  font-size: 11px;
}

.coach-cell span {
  font-size: 8px;
  color: #98a59e;
}

.rating {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #d89519;
  font-size: 10px;
  font-weight: 700;
}

.dialog-coach-head {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #f6f9f7;
  border-radius: 11px;
  padding: 10px;
  margin-bottom: 16px;
}

.dialog-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
}

.dialog-avatar.fallback {
  background: #dcf2e8;
  color: #167d5e;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.dialog-coach-head div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dialog-coach-head strong {
  font-size: 13px;
}

.dialog-coach-head span {
  font-size: 9px;
  color: #98a59e;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 14px;
}

@media (max-width: 1000px) {
  .coach-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .coach-summary,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
