<template>
  <div class="page">
    <PageHeader title="服务分类" subtitle="维护平台统一的服务分类体系，帮助会员快速找到所需服务">
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>新增分类
      </el-button>
    </PageHeader>

    <section class="category-overview">
      <div class="overview-card">
        <span class="overview-icon green"><el-icon><Grid /></el-icon></span>
        <div><strong>{{ list.length }}</strong><span>分类总数</span></div>
      </div>
      <div class="overview-card">
        <span class="overview-icon blue"><el-icon><CircleCheck /></el-icon></span>
        <div><strong>{{ enabledCount }}</strong><span>启用分类</span></div>
      </div>
      <div class="overview-card">
        <span class="overview-icon gold"><el-icon><Tickets /></el-icon></span>
        <div><strong>{{ totalServices }}</strong><span>关联服务</span></div>
      </div>
      <div class="overview-card">
        <span class="overview-icon purple"><el-icon><Sort /></el-icon></span>
        <div><strong>{{ maxSort }}</strong><span>最大排序值</span></div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-title">
        <div>
          <h2>分类列表</h2>
          <span>排序值越小，在会员端展示越靠前</span>
        </div>
        <el-input v-model="keyword" placeholder="搜索分类名称" clearable style="width: 220px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
      </div>

      <el-table v-loading="loading" :data="filteredList" style="width: 100%">
        <el-table-column label="分类名称" min-width="180">
          <template #default="{ row }">
            <div class="category-cell">
              <span class="category-icon"><el-icon><component :is="row.icon || 'Tickets'" /></el-icon></span>
              <div><strong>{{ row.name }}</strong><span>图标：{{ row.icon || 'Tickets' }}</span></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="分类说明" min-width="240" show-overflow-tooltip />
        <el-table-column label="关联服务" width="100">
          <template #default="{ row }"><span class="service-count">{{ row.service_count }} 项</span></template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序值" width="90" />
        <el-table-column label="创建时间" width="110">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="启用状态" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="Number(row.status)"
              :active-value="1"
              :inactive-value="0"
              @change="(value) => toggleStatus(row, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button text type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑服务分类' : '新增服务分类'" width="500px">
      <div class="category-preview">
        <span class="preview-icon"><el-icon><component :is="form.icon || 'Tickets'" /></el-icon></span>
        <div>
          <strong>{{ form.name || '分类名称' }}</strong>
          <span>{{ form.description || '分类说明会展示在会员端筛选区域' }}</span>
        </div>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：瑜伽普拉提" />
        </el-form-item>
        <el-form-item label="图标组件名">
          <el-input v-model="form.icon" placeholder="Element Plus 图标名，例如：Sunny、Box、Ship" />
        </el-form-item>
        <el-form-item label="分类说明">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="255" show-word-limit />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="排序值">
            <el-input-number v-model="form.sort_order" :min="0" :max="999" style="width: 100%" />
          </el-form-item>
          <el-form-item label="启用状态">
            <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存分类</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import { formatDate } from '../../utils/constants';

const loading = ref(false);
const saving = ref(false);
const list = ref([]);
const keyword = ref('');
const dialogVisible = ref(false);
const editingId = ref(null);
const formRef = ref();
const form = reactive({
  name: '',
  icon: 'Tickets',
  description: '',
  sort_order: 0,
  status: 1
});

const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
};

const enabledCount = computed(() => list.value.filter((item) => Number(item.status) === 1).length);
const totalServices = computed(() => list.value.reduce((sum, item) => sum + Number(item.service_count || 0), 0));
const maxSort = computed(() => Math.max(...list.value.map((item) => Number(item.sort_order || 0)), 0));
const filteredList = computed(() => {
  const key = keyword.value.trim().toLowerCase();
  if (!key) return list.value;
  return list.value.filter(
    (item) =>
      item.name.toLowerCase().includes(key) ||
      String(item.description || '').toLowerCase().includes(key)
  );
});

async function load() {
  loading.value = true;
  try {
    list.value = await request.get('/admin/categories');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    name: '',
    icon: 'Tickets',
    description: '',
    sort_order: maxSort.value + 1,
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
    icon: row.icon || 'Tickets',
    description: row.description || '',
    sort_order: Number(row.sort_order),
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
      await request.put(`/admin/categories/${editingId.value}`, { ...form });
      ElMessage.success('分类已更新');
    } else {
      await request.post('/admin/categories', { ...form });
      ElMessage.success('分类已创建');
    }
    dialogVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row, value) {
  await request.put(`/admin/categories/${row.id}`, { ...row, status: value });
  ElMessage.success(value === 1 ? '分类已启用' : '分类已停用');
  load();
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除「${row.name}」分类吗？分类下存在服务时无法删除。`, '删除分类', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    type: 'warning'
  });
  await request.delete(`/admin/categories/${row.id}`);
  ElMessage.success('分类已删除');
  load();
}

onMounted(load);
</script>

<style scoped>
.category-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 14px;
  padding: 14px 16px;
}

.overview-icon {
  width: 37px;
  height: 37px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.overview-icon.green {
  background: #eaf7f2;
  color: #0f9f78;
}
.overview-icon.blue {
  background: #edf2fe;
  color: #557cd0;
}
.overview-icon.gold {
  background: #fff4e2;
  color: #d9982e;
}
.overview-icon.purple {
  background: #f3effd;
  color: #846bd2;
}

.overview-card div {
  display: flex;
  flex-direction: column;
}

.overview-card strong {
  font-size: 19px;
  line-height: 1.1;
}

.overview-card span:last-child {
  font-size: 8px;
  color: #98a59e;
  margin-top: 2px;
}

.category-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.category-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #eef8f3;
  color: var(--fitness-primary);
  display: grid;
  place-items: center;
  font-size: 16px;
}

.category-cell div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-cell strong {
  font-size: 10px;
}

.category-cell span {
  font-size: 7px;
  color: #9aa7a0;
}

.service-count {
  font-size: 9px;
  color: var(--fitness-primary-dark);
  background: #eef8f3;
  border-radius: 5px;
  padding: 2px 6px;
}

.category-preview {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #f6f9f7;
  border-radius: 11px;
  padding: 11px 13px;
  margin-bottom: 16px;
}

.preview-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #e3f5ed;
  color: #12815f;
  display: grid;
  place-items: center;
  font-size: 17px;
}

.category-preview div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.category-preview strong {
  font-size: 11px;
}

.category-preview div span {
  font-size: 8px;
  color: #98a59e;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 1000px) {
  .category-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .category-overview,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
