<template>
  <div class="page">
    <PageHeader title="预约订单" subtitle="及时确认预约、完成核销，保持良好的会员服务体验">
      <el-button plain @click="load">
        <el-icon><Refresh /></el-icon>刷新订单
      </el-button>
    </PageHeader>

    <section class="order-stats">
      <button
        v-for="item in statItems"
        :key="item.status"
        class="order-stat"
        :class="{ active: statusFilter === item.status }"
        @click="changeStatus(item.status)"
      >
        <span class="stat-dot" :style="{ background: item.color }" />
        <div>
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </div>
        <el-icon><Right /></el-icon>
      </button>
    </section>

    <section class="panel-card order-panel">
      <div class="order-toolbar">
        <div class="toolbar-tabs">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            :class="{ active: statusFilter === tab.value }"
            @click="changeStatus(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
        <el-input
          v-model="keyword"
          placeholder="订单号 / 会员 / 手机号 / 服务"
          clearable
          style="width: 270px"
          @keyup.enter="search"
          @clear="search"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
          <template #append><el-button @click="search">搜索</el-button></template>
        </el-input>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="订单号" width="160">
          <template #default="{ row }">
            <span class="order-no">{{ row.appointment_no }}</span>
          </template>
        </el-table-column>
        <el-table-column label="会员" min-width="120">
          <template #default="{ row }">
            <div class="member-cell">
              <img v-if="row.user_avatar" :src="row.user_avatar" class="member-avatar" alt="" />
              <span v-else class="member-avatar fallback">{{ row.user_name?.slice(0, 1) || 'U' }}</span>
              <div><strong>{{ row.user_name }}</strong><span>{{ row.user_phone }}</span></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="service_name" label="预约服务" min-width="160" show-overflow-tooltip />
        <el-table-column label="预约时间" min-width="155">
          <template #default="{ row }">
            <div class="time-cell">
              <strong>{{ row.appointment_date }}</strong>
              <span>{{ row.time_slot }}<i v-if="row.coach_name"> · {{ row.coach_name }}</i></span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="人数 / 金额" width="105">
          <template #default="{ row }">
            <div class="amount-cell"><strong>{{ currency(row.amount) }}</strong><span>{{ row.people_count }} 人</span></div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              size="small"
              plain
              @click="updateStatus(row, 'confirmed')"
            >
              确认预约
            </el-button>
            <el-button
              v-if="row.status === 'confirmed'"
              type="success"
              size="small"
              plain
              @click="updateStatus(row, 'completed')"
            >
              完成服务
            </el-button>
            <el-button
              v-if="['pending', 'confirmed'].includes(row.status)"
              text
              type="danger"
              size="small"
              @click="cancelOrder(row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <span class="total-text">共 {{ total }} 笔订单</span>
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

    <el-drawer v-model="detailVisible" title="订单详情" size="480px">
      <div v-if="detail" v-loading="detailLoading" class="detail-body">
        <div class="detail-top">
          <StatusTag :status="detail.status" />
          <h2>{{ detail.service_name }}</h2>
          <span>{{ detail.appointment_no }}</span>
        </div>
        <div class="detail-member">
          <span class="avatar">{{ detail.user_name?.slice(0, 1) }}</span>
          <div><strong>{{ detail.user_name }}</strong><span>{{ detail.user_phone }}</span></div>
          <a :href="`tel:${detail.user_phone}`"><el-icon><Phone /></el-icon>联系会员</a>
        </div>
        <div class="detail-grid">
          <div><span>预约日期</span><strong>{{ detail.appointment_date }}</strong></div>
          <div><span>预约时段</span><strong>{{ detail.time_slot }}</strong></div>
          <div><span>预约人数</span><strong>{{ detail.people_count }} 人</strong></div>
          <div><span>订单金额</span><strong>{{ currency(detail.amount) }}</strong></div>
          <div><span>指定教练</span><strong>{{ detail.coach_name || '门店安排' }}</strong></div>
          <div><span>下单时间</span><strong>{{ formatDate(detail.created_at, true) }}</strong></div>
        </div>
        <div class="detail-block">
          <h3>用户备注</h3>
          <p>{{ detail.remark || '无' }}</p>
          <p v-if="detail.cancel_reason" class="text-danger">取消原因：{{ detail.cancel_reason }}</p>
        </div>
        <div class="detail-block">
          <h3>订单跟踪</h3>
          <el-timeline>
            <el-timeline-item
              v-for="log in detail.logs"
              :key="log.id"
              :timestamp="formatDate(log.created_at, true)"
              :type="log.to_status === 'completed' ? 'success' : log.to_status === 'cancelled' ? 'info' : 'primary'"
            >
              <div class="log-copy"><strong>{{ orderStatusMap[log.to_status]?.label || log.to_status }}</strong><p>{{ log.note }}</p></div>
            </el-timeline-item>
          </el-timeline>
        </div>
        <div v-if="['pending', 'confirmed'].includes(detail.status)" class="drawer-actions">
          <el-button
            v-if="detail.status === 'pending'"
            type="primary"
            @click="updateStatus(detail, 'confirmed', true)"
          >
            确认预约
          </el-button>
          <el-button
            v-if="detail.status === 'confirmed'"
            type="success"
            @click="updateStatus(detail, 'completed', true)"
          >
            完成服务
          </el-button>
          <el-button type="danger" plain @click="cancelOrder(detail, true)">取消订单</el-button>
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

const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' }
];

const statItems = computed(() => [
  { label: '全部订单', value: totalCount.value, status: 'all', color: '#0f9f78' },
  { label: '待确认', value: countOf('pending'), status: 'pending', color: '#e1a43b' },
  { label: '已确认', value: countOf('confirmed'), status: 'confirmed', color: '#4d82d4' },
  { label: '已完成', value: countOf('completed'), status: 'completed', color: '#20a77f' },
  { label: '已取消', value: countOf('cancelled'), status: 'cancelled', color: '#a1ada7' }
]);

const totalCount = computed(() => counts.value.reduce((sum, item) => sum + Number(item.total), 0));
function countOf(status) {
  return Number(counts.value.find((item) => item.status === status)?.total || 0);
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/provider/orders', {
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

function changeStatus(status) {
  statusFilter.value = status;
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
    detail.value = await request.get(`/provider/orders/${row.id}`);
  } finally {
    detailLoading.value = false;
  }
}

async function updateStatus(row, status, fromDrawer = false) {
  const text = status === 'confirmed' ? '确认这笔预约吗？确认后将通知会员按时到店。' : '确认服务已完成吗？完成后会员可以提交评价。';
  await ElMessageBox.confirm(text, status === 'confirmed' ? '确认预约' : '完成服务', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'success'
  });
  await request.patch(`/provider/orders/${row.id}/status`, { status });
  ElMessage.success(status === 'confirmed' ? '预约已确认' : '服务已完成');
  if (fromDrawer) detailVisible.value = false;
  load();
}

async function cancelOrder(row, fromDrawer = false) {
  const result = await ElMessageBox.prompt('请填写取消原因，系统会通知会员。', '取消订单', {
    confirmButtonText: '确认取消',
    cancelButtonText: '返回',
    inputPlaceholder: '例如：场地临时维护，无法接待',
    inputValidator: (value) => Boolean(value?.trim()) || '请填写取消原因',
    type: 'warning'
  }).catch(() => null);
  if (!result) return;
  await request.patch(`/provider/orders/${row.id}/status`, {
    status: 'cancelled',
    note: result.value
  });
  ElMessage.success('订单已取消');
  if (fromDrawer) detailVisible.value = false;
  load();
}

onMounted(load);
</script>

<style scoped>
.order-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.order-stat {
  display: flex;
  align-items: center;
  gap: 9px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 13px;
  padding: 12px 13px;
  cursor: pointer;
  text-align: left;
  transition: all 0.18s ease;
}

.order-stat.active {
  border-color: var(--fitness-primary);
  box-shadow: 0 6px 16px rgba(15, 159, 120, 0.08);
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.order-stat div {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.order-stat strong {
  font-size: 18px;
  line-height: 1.1;
}

.order-stat span {
  font-size: 8px;
  color: #96a39c;
  margin-top: 2px;
}

.order-stat > .el-icon {
  color: #c2ccc7;
  font-size: 11px;
}

.order-panel {
  padding: 0;
  overflow: hidden;
}

.order-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid #edf1ef;
}

.toolbar-tabs {
  display: flex;
  gap: 3px;
}

.toolbar-tabs button {
  border: 0;
  background: transparent;
  font-size: 10px;
  color: #819088;
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 7px;
}

.toolbar-tabs button.active {
  background: #eef8f3;
  color: var(--fitness-primary-dark);
  font-weight: 700;
}

.order-panel :deep(.el-table) {
  border-radius: 0;
}

.order-no {
  font-family: monospace;
  font-size: 9px;
  color: #6f8178;
}

.member-cell {
  display: flex;
  align-items: center;
  gap: 7px;
}

.member-avatar {
  width: 29px;
  height: 29px;
  border-radius: 8px;
  object-fit: cover;
}

.member-avatar.fallback {
  display: grid;
  place-items: center;
  background: #e1f3ea;
  color: #1a7c5e;
  font-size: 10px;
  font-weight: 700;
}

.member-cell div {
  display: flex;
  flex-direction: column;
}

.member-cell strong {
  font-size: 9px;
}

.member-cell span:last-child {
  font-size: 7px;
  color: #9aa7a0;
}

.time-cell,
.amount-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-cell strong {
  font-size: 9px;
}

.time-cell span {
  font-size: 8px;
  color: #93a098;
}

.time-cell i {
  font-style: normal;
}

.amount-cell strong {
  font-size: 10px;
  color: var(--fitness-primary-dark);
}

.amount-cell span {
  font-size: 7px;
  color: #98a59e;
}

.pagination-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
}

.total-text {
  font-size: 9px;
  color: #96a39c;
}

.detail-body {
  padding: 0 3px;
}

.detail-top {
  border-bottom: 1px solid #edf1ef;
  padding-bottom: 15px;
}

.detail-top h2 {
  margin: 9px 0 4px;
  font-size: 19px;
}

.detail-top > span {
  font-family: monospace;
  font-size: 9px;
  color: #9aa7a0;
}

.detail-member {
  display: flex;
  align-items: center;
  gap: 9px;
  background: #f6f9f7;
  border-radius: 11px;
  padding: 10px 12px;
  margin: 14px 0;
}

.detail-member div {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.detail-member strong {
  font-size: 11px;
}

.detail-member span {
  font-size: 8px;
  color: #97a49d;
}

.detail-member a {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--fitness-primary);
  font-size: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}

.detail-grid div {
  background: #fafcfb;
  border: 1px solid #eef2f0;
  border-radius: 9px;
  padding: 9px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.detail-grid span {
  font-size: 7px;
  color: #9aa7a0;
}

.detail-grid strong {
  font-size: 10px;
}

.detail-block {
  border-top: 1px solid #eff3f1;
  padding-top: 14px;
  margin-top: 14px;
}

.detail-block h3 {
  font-size: 11px;
  margin: 0 0 8px;
}

.detail-block p {
  font-size: 9px;
  line-height: 1.7;
  color: #7a8b82;
  margin: 4px 0;
}

.log-copy strong {
  font-size: 10px;
}

.log-copy p {
  font-size: 8px;
  color: #95a29b;
  margin: 2px 0 0;
}

.drawer-actions {
  display: flex;
  gap: 8px;
  border-top: 1px solid #edf1ef;
  padding-top: 15px;
  margin-top: 18px;
}

@media (max-width: 1000px) {
  .order-stats {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 700px) {
  .order-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .order-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
