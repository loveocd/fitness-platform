<template>
  <div class="page">
    <PageHeader title="服务管理" subtitle="配置课程与服务项目，灵活控制上下架与预约容量">
      <el-button type="primary" :disabled="providerStatus !== 'approved'" @click="openCreate">
        <el-icon><Plus /></el-icon>新增服务
      </el-button>
    </PageHeader>

    <el-alert
      v-if="providerStatus && providerStatus !== 'approved'"
      class="service-alert"
      type="warning"
      :closable="false"
      show-icon
      title="门店通过平台审核后，才能新增或编辑服务。"
    />

    <section class="service-summary">
      <div class="summary-card">
        <div class="summary-icon green"><el-icon><Tickets /></el-icon></div>
        <div><strong>{{ list.length }}</strong><span>服务总数</span></div>
      </div>
      <div class="summary-card">
        <div class="summary-icon blue"><el-icon><Sell /></el-icon></div>
        <div><strong>{{ onSaleCount }}</strong><span>在售服务</span></div>
      </div>
      <div class="summary-card">
        <div class="summary-icon gold"><el-icon><ShoppingCart /></el-icon></div>
        <div><strong>{{ totalOrders }}</strong><span>累计订单</span></div>
      </div>
      <div class="summary-card">
        <div class="summary-icon purple"><el-icon><Money /></el-icon></div>
        <div><strong>{{ avgPrice }}</strong><span>平均价格</span></div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-title">
        <div>
          <h2>服务列表</h2>
          <span>在售 {{ onSaleCount }} 项 · 已下架 {{ list.length - onSaleCount }} 项</span>
        </div>
      </div>
      <div class="filter-bar">
        <el-input v-model="keyword" placeholder="搜索服务名称" clearable style="width: 220px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="statusFilter" style="width: 130px">
          <el-option label="全部状态" value="all" />
          <el-option label="在售" value="on" />
          <el-option label="已下架" value="off" />
        </el-select>
        <el-select v-model="categoryFilter" clearable placeholder="全部分类" style="width: 150px">
          <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </div>

      <el-table v-loading="loading" :data="filteredList" style="width: 100%">
        <el-table-column label="服务信息" min-width="260">
          <template #default="{ row }">
            <div class="service-cell">
              <el-image :src="row.cover" fit="cover" class="service-thumb">
                <template #error><div class="thumb-fallback"><el-icon><Tickets /></el-icon></div></template>
              </el-image>
              <div>
                <strong>{{ row.name }}</strong>
                <span>{{ row.category_name }} · {{ row.duration }} 分钟</span>
                <small v-if="row.tags">{{ row.tags }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="价格" width="110">
          <template #default="{ row }">
            <div class="price-cell">
              <strong>{{ currency(row.price) }}</strong>
              <small v-if="row.original_price">{{ currency(row.original_price) }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="capacity" label="每场容量" width="100">
          <template #default="{ row }">{{ row.capacity }} 人</template>
        </el-table-column>
        <el-table-column label="销量 / 订单" width="120">
          <template #default="{ row }">{{ row.sales }} / {{ row.order_count }}</template>
        </el-table-column>
        <el-table-column label="评分" width="80">
          <template #default="{ row }">
            <span class="rating"><el-icon><StarFilled /></el-icon>{{ row.rating }}</span>
          </template>
        </el-table-column>
        <el-table-column label="上架状态" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status"
              active-value="on"
              inactive-value="off"
              :disabled="providerStatus !== 'approved'"
              @change="(value) => toggleStatus(row, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button text type="danger" size="small" @click="remove(row)">下架</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑服务' : '新增服务'" width="680px" destroy-on-close>
      <div v-if="form.cover" class="cover-preview">
        <el-image :src="form.cover" fit="cover" class="cover-preview-img" />
        <div class="cover-preview-shade" />
        <span>{{ form.name || '服务名称预览' }}</span>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="服务名称" prop="name">
            <el-input v-model="form.name" placeholder="例如：私教体验课 · 体态评估" />
          </el-form-item>
          <el-form-item label="服务分类" prop="category_id">
            <el-select v-model="form.category_id" placeholder="选择分类" style="width: 100%">
              <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="销售价格（元）" prop="price">
            <el-input-number v-model="form.price" :min="0" :max="99999" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="原价（元）">
            <el-input-number v-model="form.original_price" :min="0" :max="99999" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="服务时长（分钟）">
            <el-input-number v-model="form.duration" :min="10" :max="1440" :step="5" style="width: 100%" />
          </el-form-item>
          <el-form-item label="每场可预约人数">
            <el-input-number v-model="form.capacity" :min="1" :max="500" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="标签">
          <el-input v-model="form.tags" placeholder="多个标签用英文逗号分隔，例如：一对一定制,体态评估,新手友好" />
        </el-form-item>
        <el-form-item label="封面图片地址">
          <el-input v-model="form.cover" placeholder="填写图片 URL">
            <template #prefix><el-icon><Picture /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="服务详情">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            placeholder="介绍服务内容、适合人群、包含项目等"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存服务</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import { currency } from '../../utils/constants';

const loading = ref(false);
const saving = ref(false);
const list = ref([]);
const categories = ref([]);
const providerStatus = ref('approved');
const keyword = ref('');
const statusFilter = ref('all');
const categoryFilter = ref(null);
const dialogVisible = ref(false);
const editingId = ref(null);
const formRef = ref();

const form = reactive({
  category_id: null,
  name: '',
  cover: '',
  description: '',
  price: 99,
  original_price: null,
  duration: 60,
  capacity: 20,
  tags: '',
  status: 'on'
});

const rules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择服务分类', trigger: 'change' }],
  price: [{ required: true, message: '请填写销售价格', trigger: 'change' }]
};

const onSaleCount = computed(() => list.value.filter((item) => item.status === 'on').length);
const totalOrders = computed(() => list.value.reduce((sum, item) => sum + Number(item.order_count || 0), 0));
const avgPrice = computed(() => {
  if (!list.value.length) return '—';
  return currency(list.value.reduce((sum, item) => sum + Number(item.price), 0) / list.value.length);
});
const filteredList = computed(() => {
  const key = keyword.value.trim().toLowerCase();
  return list.value.filter((item) => {
    const matchKeyword = !key || item.name.toLowerCase().includes(key);
    const matchStatus = statusFilter.value === 'all' || item.status === statusFilter.value;
    const matchCategory = !categoryFilter.value || item.category_id === categoryFilter.value;
    return matchKeyword && matchStatus && matchCategory;
  });
});

async function load() {
  loading.value = true;
  try {
    const [services, categoryData, profile] = await Promise.all([
      request.get('/provider/services'),
      request.get('/public/categories'),
      request.get('/provider/profile')
    ]);
    list.value = services;
    categories.value = categoryData;
    providerStatus.value = profile.status;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    category_id: categories.value[0]?.id || null,
    name: '',
    cover: '',
    description: '',
    price: 99,
    original_price: null,
    duration: 60,
    capacity: 20,
    tags: '',
    status: 'on'
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
    category_id: row.category_id,
    name: row.name,
    cover: row.cover || '',
    description: row.description || '',
    price: Number(row.price),
    original_price: row.original_price ? Number(row.original_price) : null,
    duration: row.duration,
    capacity: row.capacity,
    tags: row.tags || '',
    status: row.status
  });
  dialogVisible.value = true;
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (editingId.value) {
      await request.put(`/provider/services/${editingId.value}`, { ...form });
      ElMessage.success('服务信息已更新');
    } else {
      await request.post('/provider/services', { ...form });
      ElMessage.success('服务已上架');
    }
    dialogVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row, value) {
  await request.put(`/provider/services/${row.id}`, { ...row, status: value });
  ElMessage.success(value === 'on' ? '服务已上架' : '服务已下架');
  load();
}

async function remove(row) {
  await ElMessageBox.confirm(`确定下架「${row.name}」吗？已产生的订单不受影响。`, '下架服务', {
    confirmButtonText: '确认下架',
    cancelButtonText: '取消',
    type: 'warning'
  });
  await request.delete(`/provider/services/${row.id}`);
  ElMessage.success('服务已下架');
  load();
}

onMounted(load);
</script>

<style scoped>
.service-alert {
  border-radius: 10px;
  margin-bottom: 14px;
}

.service-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
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

.summary-icon.green {
  background: #eaf7f2;
  color: #0f9f78;
}
.summary-icon.blue {
  background: #edf2fe;
  color: #567cd1;
}
.summary-icon.gold {
  background: #fff4e2;
  color: #d9982e;
}
.summary-icon.purple {
  background: #f3effd;
  color: #846bd2;
}

.summary-card div:last-child {
  display: flex;
  flex-direction: column;
}

.summary-card strong {
  font-size: 19px;
  line-height: 1.1;
}

.summary-card span {
  font-size: 8px;
  color: #98a59e;
  margin-top: 2px;
}

.service-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.service-thumb {
  width: 58px;
  height: 44px;
  border-radius: 8px;
  flex-shrink: 0;
}

.thumb-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #e6f4ee;
  color: #14815f;
  font-size: 17px;
}

.service-cell > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.service-cell strong {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.service-cell span {
  font-size: 8px;
  color: #91a098;
}

.service-cell small {
  font-size: 7px;
  color: #a5b0aa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price-cell {
  display: flex;
  flex-direction: column;
}

.price-cell strong {
  color: var(--fitness-primary-dark);
  font-size: 12px;
}

.price-cell small {
  color: #a1ada7;
  text-decoration: line-through;
  font-size: 8px;
}

.rating {
  color: #d89519;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.cover-preview {
  height: 130px;
  border-radius: 11px;
  overflow: hidden;
  position: relative;
  margin-bottom: 16px;
}

.cover-preview-img {
  width: 100%;
  height: 100%;
}

.cover-preview-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(6, 26, 18, 0.7), transparent 60%);
}

.cover-preview span {
  position: absolute;
  left: 16px;
  bottom: 13px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 14px;
}

@media (max-width: 1000px) {
  .service-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .service-summary,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
