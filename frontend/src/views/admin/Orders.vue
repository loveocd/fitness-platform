<template>
  <div class="page">
    <PageHeader title="订单监管" subtitle="监管平台预约订单，处理取消、退款与异常状态">
      <el-button plain @click="load">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </PageHeader>

    <section class="order-overview">
      <div v-for="item in overview" :key="item.status" class="overview-item">
        <span class="status-dot" :style="{ background: item.color }" />
        <div><strong>{{ item.value }}</strong><span>{{ item.label }}</span></div>
      </div>
      <div class="overview-item total">
        <span class="status-dot" style="background: #2d4238" />
        <div><strong>{{ totalCount }}</strong><span>全部订单</span></div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-title">
        <div>
          <h2>预约订单</h2>
          <span>共 {{ total }} 笔订单</span>
        </div>
        <el-input
          v-model="keyword"
          placeholder="订单号 / 会员 / 服务商 / 服务"
          clearable
          style="width: 280px"
          @keyup.enter="search"
          @clear="search"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
          <template #append><el-button @click="search">搜索</el-button></template>
        </el-input>
      </div>

      <div class="status-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          :class="{ active: statusFilter === tab.value }"
          @click="changeStatus(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="订单号" width="155">
          <template #default="{ row }"><span class="order-no">{{ row.appointment_no }}</span></template>
        </el-table-column>
        <el-table-column label="会员" width="105">
          <template #default="{ row }">
            <div class="two-line"><strong>{{ row.user_name }}</strong><span>{{ row.user_phone }}</span></div>
          </template>
        </el-table-column>
        <el-table-column label="服务商 / 服务" min-width="190">
          <template #default="{ row }">
            <div class="two-line">
              <strong>{{ row.service_name }}</strong>
              <span>{{ row.provider_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="预约时间" width="145">
          <template #default="{ row }">
            <div class="two-line"><strong>{{ row.appointment_date }}</strong><span>{{ row.time_slot }}</span></div>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="90">
          <template #default="{ row }"><strong class="amount">{{ currency(row.amount) }}</strong></template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="下单时间" width="105">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDetail(row)">订单详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <span>共 {{ total }} 笔订单</span>
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          background
          @current-change="load"
        />
      </div>
    </section>

    <el-drawer v-model="detailVisible" title="订单监管详情" size="500px">
      <div v-if="detail" class="detail-body">
        <div class="detail-head">
          <div class="detail-head-top">
            <StatusTag :status="detail.status" />
            <span class="order-no">{{ detail.appointment_no }}</span>
          </div>
          <h2>{{ detail.service_name }}</h2>
          <p>{{ detail.provider_name }} · {{ currency(detail.amount) }}</p>
        </div>
        <div class="party-grid">
          <div>
            <span>预约会员</span>
            <strong>{{ detail.user_name }}</strong>
            <small>{{ detail.user_phone }}</small>
          </div>
          <div>
            <span>服务商</span>
            <strong>{{ detail.provider_name }}</strong>
            <small>{{ detail.provider_phone || '—' }}</small>
          </div>
        </div>
        <div class="detail-grid">
          <div><span>预约日期</span><strong>{{ detail.appointment_date }}</strong></div>
          <div><span>预约时段</span><strong>{{ detail.time_slot }}</strong></div>
          <div><span>预约人数</span><strong>{{ detail.people_count }} 人</strong></div>
          <div><span>指定教练</span><strong>{{ detail.coach_name || '门店安排' }}</strong></div>
          <div><span>联系人</span><strong>{{ detail.contact_name }}</strong></div>
          <div><span>联系电话</span><strong>{{ detail.contact_phone }}</strong></div>
        </div>
        <div class="detail-block">
          <h3>备注信息</h3>
          <p>用户备注：{{ detail.remark || '无' }}</p>
          <p v-if="detail.cancel_reason" class="danger">取消/退款原因：{{ detail.cancel_reason }}</p>
        </div>
        <div class="detail-block">
          <h3>订单跟踪</h3>
          <el-timeline>
            <el-timeline-item
              v-for="log in detail.logs"
              :key="log.id"
              :timestamp="formatDate(log.created_at, true)"
              :type="log.to_status === 'completed' ? 'success' : ['cancelled', 'refunded'].includes(log.to_status) ? 'info' : 'primary'"
            >
              <div class="log-copy">
                <strong>{{ orderStatusMap[log.to_status]?.label || log.to_status }} · {{ operatorLabel(log.operator_type) }}</strong>
                <p>{{ log.note }}</p>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
        <div class="regulate-actions">
          <span>监管操作</span>
          <div>
            <el-button v-if="detail.status === 'pending'" type="primary" plain @click="updateStatus('confirmed')">
              代为确认
            </el-button>
            <el-button v-if="['pending', 'confirmed'].includes(detail.status)" type="success" plain @click="updateStatus('completed')">
              标记完成
            </el-button>
            <el-button v-if="!['cancelled', 'refunded', 'completed'].includes(detail.status)" type="danger" plain @click="updateStatus('cancelled')">
              取消订单
            </el-button>
            <el-button v-if="!['cancelled', 'refunded'].includes(detail.status)" type="warning" plain @click="updateStatus('refunded')">
              标记退款
            </el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import StatusTag from '../../components/StatusTag.vue';
import { currency, formatDate, orderStatusMap } from '../../utils/constants';

const loading = ref(false);
const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const statusFilter = ref('all');
const keyword = ref('');
const counts = ref([]);
const detailVisible = ref(false);
const detail = ref(null);
const detailLoading = ref(false);

const tabs = [
  { label: '全部状态', value: 'all' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
  { label: '已退款', value: 'refunded' }
];

const overview = computed(() =>
  ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'].map((status) => ({
    status,
    label: orderStatusMap[status].label,
    value: countOf(status),
    color: { pending: '#e2a63c', confirmed: '#4f86d8', completed: '#0f9f78', cancelled: '#a1ada7', refunded: '#db6b60' }[status]
  }))
);
const totalCount = computed(() => counts.value.reduce((sum, item) => sum + Number(item.total), 0));

function countOf(status) {
  return Number(counts.value.find((item) => item.status === status)?.total || 0);
}
function operatorLabel(type) {
  return { user: '会员', provider: '服务商', admin: '平台', system: '系统' }[type] || '系统';
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/admin/orders', {
      params: {
        page: page.value,
        pageSize,
        status: statusFilter.value,
        keyword: keyword.value || undefined
      }
    });
    list.value = data.list;
    total.value = data.total;
    counts.value = data.counts;
  } finally {
    loading.value = false;
  }
}

function changeStatus(value) {
  statusFilter.value = value;
  page.value = 1;
  load();
}
function search() {
  page.value = 1;
  load();
}

async function openDetail(row) {
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  try {
    detail.value = await request.get(`/admin/orders/${row.id}`);
  } finally {
    detailLoading.value = false;
  }
}

async function updateStatus(status) {
  const labels = { confirmed: '代为确认', completed: '标记完成', cancelled: '取消订单', refunded: '标记退款' };
  let note = '';
  if (['cancelled', 'refunded'].includes(status)) {
    const result = await ElMessageBox.prompt('请填写平台处理说明，将同步通知会员与服务商。', labels[status], {
      confirmButtonText: '确认处理',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：经平台核实，同意取消并退款',
      inputValidator: (value) => Boolean(value?.trim()) || '请填写处理说明',
      type: 'warning'
    }).catch(() => null);
    if (!result) return;
    note = result.value;
  } else {
    await ElMessageBox.confirm(`确定将订单更新为「${orderStatusMap[status].label}」吗？`, labels[status], {
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    });
  }
  await request.patch(`/admin/orders/${detail.value.id}/status`, { status, note });
  ElMessage.success('订单状态已更新');
  detailVisible.value = false;
  load();
}

onMounted(load);
</script>

<style scoped>
.order-overview {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 9px;
  margin-bottom: 15px;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 12px;
  padding: 12px 13px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.overview-item div {
  display: flex;
  flex-direction: column;
}

.overview-item strong {
  font-size: 17px;
  line-height: 1.1;
}

.overview-item span:last-child {
  font-size: 7px;
  color: #98a59e;
  margin-top: 2px;
}

.overview-item.total {
  background: #f4f8f6;
}

.status-tabs {
  display: flex;
  gap: 3px;
  background: #f2f6f4;
  padding: 3px;
  border-radius: 8px;
  width: fit-content;
  margin-bottom: 14px;
}

.status-tabs button {
  border: 0;
  background: transparent;
  font-size: 9px;
  color: #788980;
  border-radius: 6px;
  padding: 5px 10px;
  cursor: pointer;
}

.status-tabs button.active {
  background: #fff;
  color: var(--fitness-primary-dark);
  font-weight: 700;
  box-shadow: 0 2px 7px rgba(16, 53, 39, 0.07);
}

.order-no {
  font-family: monospace;
  font-size: 8px;
  color: #6d8076;
}

.two-line {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.two-line strong {
  font-size: 9px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.two-line span {
  font-size: 7px;
  color: #97a49d;
}

.amount {
  color: var(--fitness-primary-dark);
  font-size: 10px;
}

.pagination-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
}

.pagination-wrap span {
  font-size: 9px;
  color: #96a39c;
}

.detail-head {
  border-bottom: 1px solid #edf1ef;
  padding-bottom: 14px;
}

.detail-head-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-head h2 {
  margin: 9px 0 4px;
  font-size: 18px;
}

.detail-head p {
  margin: 0;
  font-size: 9px;
  color: #8e9c95;
}

.party-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin: 13px 0;
}

.party-grid div {
  background: #f6f9f7;
  border-radius: 9px;
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.party-grid span {
  font-size: 7px;
  color: #98a59e;
}

.party-grid strong {
  font-size: 10px;
}

.party-grid small {
  font-size: 7px;
  color: #8e9c95;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-grid div {
  border: 1px solid #eef2f0;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-grid span {
  font-size: 7px;
  color: #98a59e;
}

.detail-grid strong {
  font-size: 9px;
}

.detail-block {
  border-top: 1px solid #eff3f1;
  padding-top: 13px;
  margin-top: 13px;
}

.detail-block h3 {
  margin: 0 0 7px;
  font-size: 11px;
}

.detail-block p {
  font-size: 8px;
  line-height: 1.65;
  color: #73847b;
  margin: 3px 0;
}

.danger {
  color: #c9594e !important;
}

.log-copy strong {
  font-size: 9px;
}

.log-copy p {
  font-size: 7px;
  color: #95a29b;
  margin: 2px 0 0;
}

.regulate-actions {
  border-top: 1px solid #edf1ef;
  padding-top: 14px;
  margin-top: 16px;
}

.regulate-actions > span {
  font-size: 9px;
  color: #8e9c95;
}

.regulate-actions > div {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
}

@media (max-width: 1100px) {
  .order-overview {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 600px) {
  .order-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  .panel-title {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
