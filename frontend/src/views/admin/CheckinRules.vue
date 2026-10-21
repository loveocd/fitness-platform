<template>
  <div class="page">
    <PageHeader title="打卡规则" subtitle="配置自主打卡与场馆打卡的积分、次数和时长规则">
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>新增规则
      </el-button>
    </PageHeader>

    <section class="rule-intro">
      <div class="intro-copy">
        <span class="intro-eyebrow">CHECK-IN POLICY</span>
        <h2>用合理规则，激励持续运动</h2>
        <p>自主打卡即时到账，场馆打卡需门店核验。规则修改后会立即影响后续打卡，不影响历史积分记录。</p>
      </div>
      <div class="intro-stats">
        <div><strong>{{ list.length }}</strong><span>规则总数</span></div>
        <div><strong>{{ enabledCount }}</strong><span>启用规则</span></div>
        <div><strong>{{ maxPoints }}</strong><span>最高单次积分</span></div>
      </div>
      <div class="intro-deco" />
    </section>

    <div class="rules-grid">
      <section v-for="rule in list" :key="rule.id" class="rule-card" :class="rule.checkin_type">
        <div class="rule-head">
          <span class="rule-icon">
            <el-icon><OfficeBuilding v-if="rule.checkin_type === 'venue'" /><Sunny v-else /></el-icon>
          </span>
          <div class="rule-title">
            <div>
              <span class="rule-type">{{ rule.checkin_type === 'venue' ? '场馆打卡' : '自主打卡' }}</span>
              <h3>{{ rule.name }}</h3>
            </div>
            <el-switch
              :model-value="Number(rule.status)"
              :active-value="1"
              :inactive-value="0"
              @change="(value) => toggleStatus(rule, value)"
            />
          </div>
        </div>
        <div class="rule-metrics">
          <div><strong>{{ rule.points_per_checkin }}</strong><span>积分 / 次</span></div>
          <div><strong>{{ rule.daily_limit }}</strong><span>每日上限</span></div>
          <div><strong>{{ rule.min_duration }}</strong><span>最低分钟</span></div>
        </div>
        <p class="rule-desc">{{ rule.description || '暂无规则说明' }}</p>
        <div class="rule-foot">
          <span class="rule-flow">
            <template v-if="rule.checkin_type === 'venue'">会员提交 → 门店核验 → 积分到账</template>
            <template v-else>会员提交 → 自动通过 → 积分到账</template>
          </span>
          <div>
            <el-button text type="primary" size="small" @click="openEdit(rule)">编辑</el-button>
            <el-button text type="danger" size="small" @click="remove(rule)">删除</el-button>
          </div>
        </div>
      </section>
    </div>

    <section class="panel-card rule-table-panel">
      <div class="panel-title">
        <div>
          <h2>规则明细</h2>
          <span>所有打卡规则配置</span>
        </div>
      </div>
      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="name" label="规则名称" min-width="160" />
        <el-table-column label="打卡类型" width="110">
          <template #default="{ row }">
            <el-tag :type="row.checkin_type === 'venue' ? 'primary' : 'warning'" effect="light" size="small">
              {{ row.checkin_type === 'venue' ? '场馆打卡' : '自主打卡' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="单次积分" width="100">
          <template #default="{ row }"><strong class="points">+{{ row.points_per_checkin }}</strong></template>
        </el-table-column>
        <el-table-column prop="daily_limit" label="每日上限" width="95" />
        <el-table-column prop="min_duration" label="最低时长" width="95">
          <template #default="{ row }">{{ row.min_duration }} 分钟</template>
        </el-table-column>
        <el-table-column prop="description" label="规则说明" min-width="260" show-overflow-tooltip />
        <el-table-column label="状态" width="85">
          <template #default="{ row }">
            <el-tag :type="Number(row.status) ? 'success' : 'info'" effect="light" size="small">
              {{ Number(row.status) ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑打卡规则' : '新增打卡规则'" width="540px">
      <div class="dialog-tip">
        <el-icon><InfoFilled /></el-icon>
        规则修改会立即生效。积分仅在打卡审核通过后发放。
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：自主运动打卡规则" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="打卡类型" prop="checkin_type">
            <el-select v-model="form.checkin_type" style="width: 100%">
              <el-option label="自主打卡" value="self" />
              <el-option label="场馆打卡" value="venue" />
            </el-select>
          </el-form-item>
          <el-form-item label="单次积分">
            <el-input-number v-model="form.points_per_checkin" :min="0" :max="1000" style="width: 100%" />
          </el-form-item>
          <el-form-item label="每日次数上限">
            <el-input-number v-model="form.daily_limit" :min="1" :max="10" style="width: 100%" />
          </el-form-item>
          <el-form-item label="最低运动时长（分钟）">
            <el-input-number v-model="form.min_duration" :min="1" :max="600" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="规则说明">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存规则</el-button>
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
const dialogVisible = ref(false);
const editingId = ref(null);
const formRef = ref();
const form = reactive({
  name: '',
  checkin_type: 'self',
  points_per_checkin: 10,
  daily_limit: 1,
  min_duration: 30,
  description: '',
  status: 1
});

const rules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  checkin_type: [{ required: true, message: '请选择打卡类型', trigger: 'change' }]
};

const enabledCount = computed(() => list.value.filter((item) => Number(item.status) === 1).length);
const maxPoints = computed(() => Math.max(...list.value.map((item) => Number(item.points_per_checkin || 0)), 0));

async function load() {
  loading.value = true;
  try {
    list.value = await request.get('/admin/checkin-rules');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    name: '',
    checkin_type: 'self',
    points_per_checkin: 10,
    daily_limit: 1,
    min_duration: 30,
    description: '',
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
    checkin_type: row.checkin_type,
    points_per_checkin: Number(row.points_per_checkin),
    daily_limit: Number(row.daily_limit),
    min_duration: Number(row.min_duration),
    description: row.description || '',
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
      await request.put(`/admin/checkin-rules/${editingId.value}`, { ...form });
      ElMessage.success('打卡规则已更新');
    } else {
      await request.post('/admin/checkin-rules', { ...form });
      ElMessage.success('打卡规则已创建');
    }
    dialogVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row, value) {
  await request.put(`/admin/checkin-rules/${row.id}`, { ...row, status: value });
  ElMessage.success(value === 1 ? '规则已启用' : '规则已停用');
  load();
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除「${row.name}」吗？删除后相关打卡将使用其他启用规则。`, '删除规则', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    type: 'warning'
  });
  await request.delete(`/admin/checkin-rules/${row.id}`);
  ElMessage.success('规则已删除');
  load();
}

onMounted(load);
</script>

<style scoped>
.rule-intro {
  border-radius: 18px;
  background:
    radial-gradient(circle at 85% 15%, rgba(241, 201, 107, 0.18), transparent 26%),
    linear-gradient(110deg, #1c241d, #2a372c);
  color: #f6f8f3;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  gap: 30px;
  position: relative;
  overflow: hidden;
}

.intro-copy {
  flex: 1;
  position: relative;
  z-index: 2;
}

.intro-eyebrow {
  font-size: 7px;
  letter-spacing: 2px;
  color: #f1c96b;
  font-weight: 700;
}

.intro-copy h2 {
  margin: 8px 0 6px;
  font-size: 22px;
}

.intro-copy p {
  max-width: 620px;
  font-size: 9px;
  line-height: 1.8;
  color: rgba(246, 248, 243, 0.5);
  margin: 0;
}

.intro-stats {
  display: flex;
  gap: 28px;
  position: relative;
  z-index: 2;
}

.intro-stats div {
  display: flex;
  flex-direction: column;
}

.intro-stats strong {
  font-size: 23px;
}

.intro-stats span {
  font-size: 7px;
  color: rgba(246, 248, 243, 0.42);
}

.intro-deco {
  position: absolute;
  width: 250px;
  height: 250px;
  border: 1px solid rgba(241, 201, 107, 0.12);
  border-radius: 50%;
  right: -80px;
  top: -150px;
}

.rules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 15px 0;
}

.rule-card {
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 16px;
  padding: 18px;
  box-shadow: var(--fitness-shadow);
}

.rule-head {
  display: flex;
  gap: 11px;
}

.rule-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: #eaf7f2;
  color: #0f9f78;
  display: grid;
  place-items: center;
  font-size: 19px;
  flex-shrink: 0;
}

.rule-card.venue .rule-icon {
  background: #edf2fe;
  color: #557cd0;
}

.rule-title {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.rule-type {
  font-size: 7px;
  color: var(--fitness-primary);
  background: #edf8f3;
  border-radius: 4px;
  padding: 2px 5px;
}

.rule-card.venue .rule-type {
  color: #5079ca;
  background: #eef3fe;
}

.rule-title h3 {
  margin: 4px 0 0;
  font-size: 13px;
}

.rule-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 14px 0 12px;
}

.rule-metrics div {
  background: #f7faf8;
  border-radius: 9px;
  padding: 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rule-metrics strong {
  font-size: 18px;
  color: var(--fitness-primary-dark);
}

.rule-metrics span {
  font-size: 7px;
  color: #98a59e;
}

.rule-desc {
  font-size: 8px;
  line-height: 1.7;
  color: #7a8b82;
  min-height: 28px;
  margin: 0 0 11px;
}

.rule-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed #edf1ef;
  padding-top: 9px;
}

.rule-flow {
  font-size: 7px;
  color: #9aa7a0;
}

.rule-table-panel {
  margin-top: 15px;
}

.points {
  color: var(--fitness-primary);
  font-size: 11px;
}

.dialog-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #fff8ec;
  color: #a97c25;
  font-size: 8px;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 14px;
}

@media (max-width: 900px) {
  .rule-intro {
    flex-direction: column;
    align-items: flex-start;
  }
  .rules-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .intro-stats {
    gap: 20px;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
