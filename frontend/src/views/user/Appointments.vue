<template>
  <div class="page">
    <PageHeader title="我的预约" subtitle="查看预约进度、服务详情与订单状态通知">
      <el-button type="primary" @click="router.push('/user/venues')">
        <el-icon><Plus /></el-icon>新增预约
      </el-button>
    </PageHeader>

    <section class="panel-card appointment-panel">
      <div class="status-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          :class="{ active: activeStatus === tab.value }"
          @click="activeStatus = tab.value"
        >
          {{ tab.label }}
          <span>{{ countFor(tab.value) }}</span>
        </button>
      </div>

      <div v-loading="loading" class="appointment-list">
        <article v-for="item in filteredOrders" :key="item.id" class="appointment-card">
          <div class="order-topline">
            <span>订单号 {{ item.appointment_no }}</span>
            <span>{{ formatDate(item.created_at, true) }} 下单</span>
            <StatusTag :status="item.status" />
          </div>
          <div class="order-body">
            <div class="date-card" :class="{ past: item.status === 'completed' }">
              <strong>{{ dayOf(item.appointment_date) }}</strong>
              <span>{{ monthOf(item.appointment_date) }}</span>
              <small>{{ weekOf(item.appointment_date) }}</small>
            </div>
            <el-image :src="item.cover" fit="cover" class="order-cover">
              <template #error><div class="cover-fallback"><el-icon><Tickets /></el-icon></div></template>
            </el-image>
            <div class="order-main">
              <h3>{{ item.service_name }}</h3>
              <p class="provider-line"><el-icon><OfficeBuilding /></el-icon>{{ item.provider_name }}</p>
              <div class="order-tags">
                <span><el-icon><Clock /></el-icon>{{ item.time_slot }}</span>
                <span v-if="item.coach_name"><el-icon><User /></el-icon>{{ item.coach_name }}</span>
                <span><el-icon><Timer /></el-icon>{{ item.duration }} 分钟</span>
                <span v-if="item.people_count > 1">{{ item.people_count }} 人</span>
              </div>
            </div>
            <div class="order-amount">
              <span>订单金额</span>
              <strong>{{ currency(item.amount) }}</strong>
            </div>
          </div>
          <div class="order-actions">
            <el-button text size="small" @click="openDetail(item)">
              <el-icon><Document /></el-icon>订单详情
            </el-button>
            <el-button
              v-if="item.status === 'confirmed' && isToday(item.appointment_date)"
              type="primary"
              size="small"
              @click="checkin(item)"
            >
              到店打卡
            </el-button>
            <el-button
              v-if="item.status === 'completed' && !item.review_id"
              type="primary"
              plain
              size="small"
              @click="openReview(item)"
            >
              去评价
            </el-button>
            <el-button
              v-if="['pending', 'confirmed'].includes(item.status)"
              text
              type="danger"
              size="small"
              @click="cancel(item)"
            >
              取消预约
            </el-button>
          </div>
        </article>

        <div v-if="!filteredOrders.length && !loading" class="empty-panel">
          <el-icon style="font-size: 40px; color: #b6c2bc"><Calendar /></el-icon>
          <p>当前没有{{ activeStatus === 'all' ? '' : statusLabel(activeStatus) }}预约</p>
          <el-button type="primary" plain @click="router.push('/user/venues')">去预约课程</el-button>
        </div>
      </div>
    </section>

    <el-drawer v-model="detailVisible" title="订单详情" size="480px">
      <div v-if="detail" v-loading="detailLoading" class="detail-drawer">
        <div class="detail-head">
          <StatusTag :status="detail.status" />
          <h2>{{ detail.service_name }}</h2>
          <p>{{ detail.appointment_no }}</p>
        </div>
        <div class="detail-info-grid">
          <div><span>预约日期</span><strong>{{ detail.appointment_date }}</strong></div>
          <div><span>预约时段</span><strong>{{ detail.time_slot }}</strong></div>
          <div><span>预约人数</span><strong>{{ detail.people_count }} 人</strong></div>
          <div><span>订单金额</span><strong>{{ currency(detail.amount) }}</strong></div>
        </div>
        <div class="detail-section">
          <h3>门店与教练</h3>
          <p><el-icon><OfficeBuilding /></el-icon>{{ detail.provider_name }}</p>
          <p><el-icon><Location /></el-icon>{{ detail.provider_address }}</p>
          <p><el-icon><Phone /></el-icon>{{ detail.provider_phone }}</p>
          <p v-if="detail.coach_name"><el-icon><User /></el-icon>{{ detail.coach_name }} · {{ detail.coach_title }}</p>
        </div>
        <div class="detail-section">
          <h3>联系人</h3>
          <p>{{ detail.contact_name }} · {{ detail.contact_phone }}</p>
          <p v-if="detail.remark">备注：{{ detail.remark }}</p>
          <p v-if="detail.cancel_reason" class="text-danger">取消原因：{{ detail.cancel_reason }}</p>
        </div>
        <div class="detail-section">
          <h3>订单跟踪</h3>
          <el-timeline>
            <el-timeline-item
              v-for="log in detail.logs"
              :key="log.id"
              :timestamp="formatDate(log.created_at, true)"
              placement="top"
              :type="log.to_status === 'completed' ? 'success' : log.to_status === 'cancelled' ? 'info' : 'primary'"
            >
              <div class="timeline-copy">
                <strong>{{ statusLabel(log.to_status) }}</strong>
                <p>{{ log.note }}</p>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="reviewVisible" title="评价本次服务" width="480px">
      <div class="review-dialog-head">
        <h3>{{ reviewTarget?.service_name }}</h3>
        <p>{{ reviewTarget?.provider_name }} · {{ reviewTarget?.appointment_date }}</p>
      </div>
      <div class="rating-pick">
        <span>整体评分</span>
        <el-rate v-model="reviewForm.rating" size="large" show-text :texts="['很差', '较差', '一般', '满意', '非常满意']" />
      </div>
      <el-input
        v-model="reviewForm.content"
        type="textarea"
        :rows="4"
        maxlength="500"
        show-word-limit
        placeholder="说说这次课程或服务的真实体验，帮助更多用户做选择..."
      />
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="reviewSubmitting" @click="submitReview">提交评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import StatusTag from '../../components/StatusTag.vue';
import { currency, formatDate, orderStatusMap } from '../../utils/constants';

const router = useRouter();
const loading = ref(false);
const orders = ref([]);
const activeStatus = ref('all');
const detailVisible = ref(false);
const detail = ref(null);
const detailLoading = ref(false);
const reviewVisible = ref(false);
const reviewTarget = ref(null);
const reviewSubmitting = ref(false);
const reviewForm = reactive({ rating: 5, content: '' });

const statusTabs = [
  { label: '全部', value: 'all' },
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' }
];

const filteredOrders = computed(() =>
  activeStatus.value === 'all'
    ? orders.value
    : orders.value.filter((item) => item.status === activeStatus.value)
);

function countFor(status) {
  if (status === 'all') return orders.value.length;
  return orders.value.filter((item) => item.status === status).length;
}
function statusLabel(status) {
  return orderStatusMap[status]?.label || status;
}
function dayOf(date) {
  return String(Number(String(date).slice(8, 10))).padStart(2, '0');
}
function monthOf(date) {
  return `${Number(String(date).slice(5, 7))}月`;
}
function weekOf(date) {
  const d = new Date(`${date}T00:00:00`);
  return `周${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}`;
}
function isToday(date) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  return date === today;
}

async function loadOrders() {
  loading.value = true;
  try {
    orders.value = await request.get('/user/appointments');
  } finally {
    loading.value = false;
  }
}

async function openDetail(item) {
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  try {
    detail.value = await request.get(`/user/appointments/${item.id}`);
  } finally {
    detailLoading.value = false;
  }
}

async function cancel(item) {
  const result = await ElMessageBox.prompt('请填写取消原因，方便门店安排后续时段。', '取消预约', {
    confirmButtonText: '确认取消',
    cancelButtonText: '暂不取消',
    inputPlaceholder: '例如：临时有事，时间冲突',
    inputValidator: (value) => Boolean(value?.trim()) || '请填写取消原因'
  }).catch(() => null);
  if (!result) return;
  await request.patch(`/user/appointments/${item.id}/cancel`, { reason: result.value });
  ElMessage.success('预约已取消');
  loadOrders();
}

async function checkin(item) {
  await ElMessageBox.confirm(
    `确认已到店参加「${item.service_name}」？提交后需由门店核验。`,
    '到店打卡',
    { confirmButtonText: '确认打卡', cancelButtonText: '取消' }
  );
  await request.post(`/user/appointments/${item.id}/checkin`, {
    duration_minutes: item.duration || 60
  });
  ElMessage.success('打卡已提交，等待门店核验');
  loadOrders();
}

function openReview(item) {
  reviewTarget.value = item;
  reviewForm.rating = 5;
  reviewForm.content = '';
  reviewVisible.value = true;
}

async function submitReview() {
  if (reviewForm.content.trim().length < 5) {
    return ElMessage.warning('评价内容至少 5 个字');
  }
  reviewSubmitting.value = true;
  try {
    await request.post('/user/reviews', {
      appointment_id: reviewTarget.value.id,
      rating: reviewForm.rating,
      content: reviewForm.content
    });
    ElMessage.success('评价已提交，审核通过后展示');
    reviewVisible.value = false;
    loadOrders();
  } finally {
    reviewSubmitting.value = false;
  }
}

onMounted(loadOrders);
</script>

<style scoped>
.appointment-panel {
  padding: 0;
  overflow: hidden;
}

.status-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 20px 0;
  border-bottom: 1px solid #edf1ef;
  overflow-x: auto;
}

.status-tabs button {
  border: 0;
  background: transparent;
  padding: 10px 14px 14px;
  font-size: 11px;
  color: #819088;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
}

.status-tabs button.active {
  color: var(--fitness-primary-dark);
  font-weight: 700;
}

.status-tabs button.active::after {
  content: '';
  position: absolute;
  left: 13px;
  right: 13px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: var(--fitness-primary);
}

.status-tabs span {
  margin-left: 4px;
  font-size: 8px;
  color: #9aa7a0;
  background: #f1f5f3;
  padding: 1px 5px;
  border-radius: 99px;
}

.appointment-list {
  padding: 20px;
  min-height: 260px;
}

.appointment-card {
  border: 1px solid #e9efec;
  border-radius: 15px;
  margin-bottom: 13px;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.appointment-card:hover {
  box-shadow: 0 8px 22px rgba(18, 50, 40, 0.06);
}

.order-topline {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #f8faf9;
  padding: 9px 15px;
  font-size: 9px;
  color: #98a59e;
}

.order-topline span:first-child {
  font-family: monospace;
  color: #6f8178;
}

.order-topline :deep(.el-tag) {
  margin-left: auto;
}

.order-body {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

.date-card {
  width: 61px;
  height: 67px;
  border-radius: 12px;
  background: #eff9f4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.date-card.past {
  background: #f5f6f5;
}

.date-card strong {
  font-size: 22px;
  line-height: 1;
  color: var(--fitness-primary-dark);
}

.date-card span {
  font-size: 8px;
  color: #7e9187;
  margin-top: 3px;
}

.date-card small {
  font-size: 7px;
  color: #a4b0aa;
}

.order-cover {
  width: 104px;
  height: 70px;
  border-radius: 10px;
  flex-shrink: 0;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  background: #e6f4ee;
  color: #138563;
  font-size: 24px;
  display: grid;
  place-items: center;
}

.order-main {
  flex: 1;
  min-width: 0;
}

.order-main h3 {
  margin: 0;
  font-size: 15px;
}

.provider-line {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #83928a;
  font-size: 10px;
  margin: 6px 0 9px;
}

.order-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.order-tags span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  color: #697d73;
  background: #f3f7f5;
  padding: 3px 7px;
  border-radius: 5px;
}

.order-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  min-width: 80px;
}

.order-amount span {
  font-size: 8px;
  color: #9aa7a0;
}

.order-amount strong {
  font-size: 18px;
  color: var(--fitness-ink);
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  padding: 9px 15px;
  border-top: 1px dashed #edf1ef;
}

.detail-drawer {
  padding: 0 3px;
}

.detail-head {
  padding-bottom: 16px;
  border-bottom: 1px solid #edf1ef;
}

.detail-head h2 {
  margin: 10px 0 4px;
  font-size: 20px;
}

.detail-head p {
  margin: 0;
  font-family: monospace;
  font-size: 9px;
  color: #9ba8a1;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 16px 0;
}

.detail-info-grid div {
  background: #f6f9f7;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-info-grid span {
  font-size: 8px;
  color: #99a69f;
}

.detail-info-grid strong {
  font-size: 12px;
}

.detail-section {
  border-top: 1px solid #eff3f1;
  padding-top: 15px;
  margin-top: 15px;
}

.detail-section h3 {
  font-size: 12px;
  margin: 0 0 10px;
}

.detail-section p {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #73837b;
  margin: 7px 0;
}

.timeline-copy strong {
  font-size: 11px;
}

.timeline-copy p {
  font-size: 9px;
  color: #8e9c95;
  margin: 3px 0 0;
}

.review-dialog-head h3 {
  margin: 0 0 4px;
  font-size: 15px;
}

.review-dialog-head p {
  margin: 0 0 16px;
  font-size: 9px;
  color: #94a19a;
}

.rating-pick {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #f7faf8;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 14px;
  font-size: 11px;
  color: #64776d;
}

@media (max-width: 700px) {
  .order-body {
    flex-wrap: wrap;
  }
  .order-main {
    min-width: calc(100% - 180px);
  }
  .order-amount {
    align-items: flex-start;
    margin-left: 75px;
  }
  .order-topline span:nth-child(2) {
    display: none;
  }
  .appointment-list {
    padding: 12px;
  }
}
</style>
