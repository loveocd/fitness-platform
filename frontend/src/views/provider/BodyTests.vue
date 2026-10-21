<template>
  <div class="page">
    <PageHeader title="学员体测" subtitle="记录学员身体数据与训练建议，形成可追踪的健康档案">
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>录入体测
      </el-button>
    </PageHeader>

    <section class="body-stats">
      <div class="body-stat">
        <span class="stat-icon green"><el-icon><DataAnalysis /></el-icon></span>
        <div><strong>{{ list.length }}</strong><span>体测记录</span></div>
      </div>
      <div class="body-stat">
        <span class="stat-icon blue"><el-icon><User /></el-icon></span>
        <div><strong>{{ students.length }}</strong><span>到店学员</span></div>
      </div>
      <div class="body-stat">
        <span class="stat-icon gold"><el-icon><Calendar /></el-icon></span>
        <div><strong>{{ latestDate }}</strong><span>最近体测日期</span></div>
      </div>
      <div class="body-stat">
        <span class="stat-icon purple"><el-icon><TrendCharts /></el-icon></span>
        <div><strong>{{ avgBodyFat }}</strong><span>学员平均体脂率</span></div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-title">
        <div>
          <h2>体测档案</h2>
          <span>支持按学员姓名或手机号查询</span>
        </div>
        <el-input
          v-model="keyword"
          placeholder="搜索学员姓名 / 手机号"
          clearable
          style="width: 250px"
          @keyup.enter="load"
          @clear="load"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
          <template #append><el-button @click="load">搜索</el-button></template>
        </el-input>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="学员" min-width="130">
          <template #default="{ row }">
            <div class="student-cell">
              <img v-if="row.user_avatar" :src="row.user_avatar" class="student-avatar" alt="" />
              <span v-else class="student-avatar fallback">{{ row.user_name?.slice(0, 1) || 'U' }}</span>
              <div><strong>{{ row.user_name }}</strong><span>{{ row.user_phone }}</span></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="test_date" label="体测日期" width="105" />
        <el-table-column label="身高 / 体重" width="115">
          <template #default="{ row }">{{ row.height }}cm / {{ row.weight }}kg</template>
        </el-table-column>
        <el-table-column label="BMI" width="75">
          <template #default="{ row }"><span class="bmi-tag">{{ row.bmi }}</span></template>
        </el-table-column>
        <el-table-column label="体脂率" width="80">
          <template #default="{ row }">{{ row.body_fat ? `${row.body_fat}%` : '—' }}</template>
        </el-table-column>
        <el-table-column label="肌肉量" width="85">
          <template #default="{ row }">{{ row.muscle_mass ? `${row.muscle_mass}kg` : '—' }}</template>
        </el-table-column>
        <el-table-column label="腰围 / 臀围" width="115">
          <template #default="{ row }">
            {{ row.waist ? `${row.waist}` : '—' }} / {{ row.hip ? `${row.hip}` : '—' }} cm
          </template>
        </el-table-column>
        <el-table-column prop="coach_name" label="体测教练" width="95">
          <template #default="{ row }">{{ row.coach_name || '—' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="训练建议" min-width="190" show-overflow-tooltip />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑体测记录' : '录入学员体测'" width="700px" destroy-on-close>
      <div v-if="editingRow" class="student-head">
        <span class="avatar">{{ editingRow.user_name?.slice(0, 1) }}</span>
        <div>
          <strong>{{ editingRow.user_name }}</strong>
          <span>{{ editingRow.user_phone }} · 原始体测日期 {{ editingRow.test_date }}</span>
        </div>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item v-if="!editingId" label="选择学员" prop="user_id">
            <el-select v-model="form.user_id" filterable placeholder="选择到店学员" style="width: 100%">
              <el-option
                v-for="student in students"
                :key="student.id"
                :label="`${student.nickname || '学员'} · ${student.phone || ''}`"
                :value="student.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="体测日期" prop="test_date">
            <el-date-picker
              v-model="form.test_date"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              :disabled-date="(date) => date.getTime() > Date.now()"
            />
          </el-form-item>
          <el-form-item label="体测教练">
            <el-select v-model="form.coach_id" placeholder="选择教练" clearable style="width: 100%">
              <el-option v-for="coach in coaches" :key="coach.id" :label="coach.name" :value="coach.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="身高（cm）" prop="height">
            <el-input-number v-model="form.height" :min="100" :max="230" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="体重（kg）" prop="weight">
            <el-input-number v-model="form.weight" :min="20" :max="250" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="体脂率（%）">
            <el-input-number v-model="form.body_fat" :min="0" :max="70" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="肌肉量（kg）">
            <el-input-number v-model="form.muscle_mass" :min="0" :max="120" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="内脏脂肪等级">
            <el-input-number v-model="form.visceral_fat" :min="0" :max="30" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="基础代谢（kcal）">
            <el-input-number v-model="form.basal_metabolism" :min="0" :max="5000" style="width: 100%" />
          </el-form-item>
          <el-form-item label="腰围（cm）">
            <el-input-number v-model="form.waist" :min="0" :max="200" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="胸围（cm）">
            <el-input-number v-model="form.chest" :min="0" :max="200" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="臀围（cm）">
            <el-input-number v-model="form.hip" :min="0" :max="200" :precision="1" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="教练建议">
          <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="根据体测数据给出训练与饮食建议" />
        </el-form-item>
        <div class="bmi-bar">
          <span>本次 BMI</span>
          <strong>{{ formBmi }}</strong>
          <span class="bmi-state">{{ bmiState }}</span>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存记录</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';

const loading = ref(false);
const saving = ref(false);
const list = ref([]);
const students = ref([]);
const coaches = ref([]);
const keyword = ref('');
const dialogVisible = ref(false);
const editingId = ref(null);
const editingRow = ref(null);
const formRef = ref();
const form = reactive({
  user_id: null,
  coach_id: null,
  test_date: '',
  height: 170,
  weight: 65,
  body_fat: null,
  muscle_mass: null,
  visceral_fat: null,
  basal_metabolism: null,
  waist: null,
  chest: null,
  hip: null,
  remark: ''
});

const rules = {
  user_id: [{ required: true, message: '请选择学员', trigger: 'change' }],
  test_date: [{ required: true, message: '请选择体测日期', trigger: 'change' }],
  height: [{ required: true, message: '请填写身高', trigger: 'change' }],
  weight: [{ required: true, message: '请填写体重', trigger: 'change' }]
};

const latestDate = computed(() => (list.value.length ? list.value[0].test_date : '—'));
const avgBodyFat = computed(() => {
  const values = list.value.map((item) => Number(item.body_fat)).filter(Boolean);
  if (!values.length) return '—';
  return `${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)}%`;
});
const formBmi = computed(() => {
  const h = Number(form.height) / 100;
  return h && form.weight ? Number((Number(form.weight) / (h * h)).toFixed(1)) : '—';
});
const bmiState = computed(() => {
  const value = Number(formBmi.value);
  if (!value) return '待计算';
  if (value < 18.5) return '偏瘦';
  if (value < 24) return '正常范围';
  if (value < 28) return '偏重';
  return '肥胖';
});

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/provider/body-tests', {
      params: { keyword: keyword.value || undefined }
    });
    list.value = data.list;
    students.value = data.students;
  } finally {
    loading.value = false;
  }
}

async function loadCoaches() {
  const data = await request.get('/provider/coaches');
  coaches.value = data.filter((item) => Number(item.status) === 1);
}

function resetForm() {
  Object.assign(form, {
    user_id: null,
    coach_id: null,
    test_date: new Date().toISOString().slice(0, 10),
    height: 170,
    weight: 65,
    body_fat: null,
    muscle_mass: null,
    visceral_fat: null,
    basal_metabolism: null,
    waist: null,
    chest: null,
    hip: null,
    remark: ''
  });
}

function openCreate() {
  editingId.value = null;
  editingRow.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  editingRow.value = row;
  Object.assign(form, {
    user_id: row.user_id,
    coach_id: row.coach_id,
    test_date: row.test_date,
    height: Number(row.height),
    weight: Number(row.weight),
    body_fat: row.body_fat ? Number(row.body_fat) : null,
    muscle_mass: row.muscle_mass ? Number(row.muscle_mass) : null,
    visceral_fat: row.visceral_fat ? Number(row.visceral_fat) : null,
    basal_metabolism: row.basal_metabolism || null,
    waist: row.waist ? Number(row.waist) : null,
    chest: row.chest ? Number(row.chest) : null,
    hip: row.hip ? Number(row.hip) : null,
    remark: row.remark || ''
  });
  dialogVisible.value = true;
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (editingId.value) {
      await request.put(`/provider/body-tests/${editingId.value}`, { ...form });
      ElMessage.success('体测记录已更新');
    } else {
      await request.post('/provider/body-tests', { ...form });
      ElMessage.success('体测记录已保存，已通知学员查看');
    }
    dialogVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([load(), loadCoaches()]);
});
</script>

<style scoped>
.body-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}

.body-stat {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 14px;
  padding: 14px 16px;
}

.stat-icon {
  width: 37px;
  height: 37px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.stat-icon.green {
  background: #e9f7f1;
  color: #0f9f78;
}
.stat-icon.blue {
  background: #edf2fe;
  color: #557cd0;
}
.stat-icon.gold {
  background: #fff4e2;
  color: #d9982e;
}
.stat-icon.purple {
  background: #f3effd;
  color: #846bd2;
}

.body-stat div {
  display: flex;
  flex-direction: column;
}

.body-stat strong {
  font-size: 18px;
  line-height: 1.1;
}

.body-stat span:last-child {
  font-size: 8px;
  color: #98a59e;
  margin-top: 2px;
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 7px;
}

.student-avatar {
  width: 29px;
  height: 29px;
  border-radius: 8px;
  object-fit: cover;
}

.student-avatar.fallback {
  display: grid;
  place-items: center;
  background: #e1f3ea;
  color: #1a7c5e;
  font-size: 10px;
  font-weight: 700;
}

.student-cell div {
  display: flex;
  flex-direction: column;
}

.student-cell strong {
  font-size: 9px;
}

.student-cell span {
  font-size: 7px;
  color: #9aa7a0;
}

.bmi-tag {
  background: #eef8f3;
  color: #167e60;
  border-radius: 5px;
  padding: 2px 5px;
  font-size: 9px;
  font-weight: 700;
}

.student-head {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f6f9f7;
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 15px;
}

.student-head div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.student-head strong {
  font-size: 11px;
}

.student-head span {
  font-size: 8px;
  color: #96a39c;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  column-gap: 13px;
}

.bmi-bar {
  display: flex;
  align-items: center;
  gap: 9px;
  background: #f5faf7;
  padding: 10px 13px;
  border-radius: 9px;
  font-size: 9px;
  color: #819088;
}

.bmi-bar strong {
  font-size: 18px;
  color: var(--fitness-primary-dark);
}

.bmi-state {
  background: #e0f3ea;
  color: #237b5e;
  font-size: 8px;
  border-radius: 99px;
  padding: 2px 7px;
}

@media (max-width: 1000px) {
  .body-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .body-stats,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
