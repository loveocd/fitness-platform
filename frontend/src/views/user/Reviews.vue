<template>
  <div class="page">
    <PageHeader title="我的评价" subtitle="分享真实体验，也看看自己留下的每一次反馈" />

    <section class="review-overview">
      <div class="overview-card">
        <span class="overview-icon green"><el-icon><ChatDotRound /></el-icon></span>
        <div><strong>{{ reviews.length }}</strong><span>累计评价</span></div>
      </div>
      <div class="overview-card">
        <span class="overview-icon gold"><el-icon><StarFilled /></el-icon></span>
        <div><strong>{{ averageRating }}</strong><span>平均评分</span></div>
      </div>
      <div class="overview-card">
        <span class="overview-icon blue"><el-icon><Clock /></el-icon></span>
        <div><strong>{{ pendingOrders.length }}</strong><span>待评价订单</span></div>
      </div>
      <div class="overview-card">
        <span class="overview-icon purple"><el-icon><CircleCheck /></el-icon></span>
        <div><strong>{{ approvedCount }}</strong><span>已展示评价</span></div>
      </div>
    </section>

    <section v-if="pendingOrders.length" class="pending-section">
      <div class="section-head">
        <div>
          <h2>待评价服务</h2>
          <p>你的真实感受，能帮助更多健身爱好者</p>
        </div>
      </div>
      <div class="pending-grid">
        <article v-for="order in pendingOrders" :key="order.id" class="pending-card">
          <div class="pending-date">
            <strong>{{ String(order.appointment_date).slice(8, 10) }}</strong>
            <span>{{ String(order.appointment_date).slice(5, 7) }}月</span>
          </div>
          <div class="pending-main">
            <h3>{{ order.service_name }}</h3>
            <p>{{ order.provider_name }} · {{ order.coach_name || '门店安排' }}</p>
            <span>{{ currency(order.amount) }}</span>
          </div>
          <el-button type="primary" size="small" round @click="openReview(order)">写评价</el-button>
        </article>
      </div>
    </section>

    <section class="panel-card review-panel">
      <div class="panel-title">
        <div>
          <h2>评价记录</h2>
          <span>审核通过后会展示在场馆详情页</span>
        </div>
      </div>
      <div v-loading="loading" class="my-review-list">
        <article v-for="item in reviews" :key="item.id" class="my-review">
          <div class="review-left">
            <el-image :src="item.cover" fit="cover" class="review-cover">
              <template #error><div class="cover-fallback"><el-icon><Tickets /></el-icon></div></template>
            </el-image>
          </div>
          <div class="review-body">
            <div class="review-head">
              <div>
                <h3>{{ item.service_name }}</h3>
                <p>{{ item.provider_name }} · {{ formatDate(item.created_at) }}</p>
              </div>
              <StatusTag :status="item.status" kind="review" />
            </div>
            <div class="review-rating">
              <el-rate :model-value="item.rating" disabled />
              <span>{{ ratingText(item.rating) }}</span>
            </div>
            <p class="review-text">{{ item.content }}</p>
            <div v-if="item.reply" class="reply-box">
              <div class="reply-head"><el-icon><ChatLineSquare /></el-icon>商家回复</div>
              <p>{{ item.reply }}</p>
            </div>
            <div v-if="item.status === 'rejected' && item.audit_remark" class="reject-box">
              审核说明：{{ item.audit_remark }}
            </div>
          </div>
        </article>
        <el-empty v-if="!reviews.length && !loading" description="还没有写过评价" :image-size="85" />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="分享你的健身体验" width="480px">
      <div class="dialog-service">
        <h3>{{ target?.service_name }}</h3>
        <p>{{ target?.provider_name }} · {{ target?.appointment_date }}</p>
      </div>
      <div class="dialog-rating">
        <span>整体评分</span>
        <el-rate
          v-model="form.rating"
          size="large"
          show-text
          :texts="['很差', '较差', '一般', '满意', '非常满意']"
        />
      </div>
      <el-input
        v-model="form.content"
        type="textarea"
        :rows="5"
        maxlength="500"
        show-word-limit
        placeholder="环境、教练、课程体验如何？你的评价对其他用户很重要..."
      />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">提交评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import StatusTag from '../../components/StatusTag.vue';
import { currency, formatDate } from '../../utils/constants';

const loading = ref(false);
const reviews = ref([]);
const completedOrders = ref([]);
const dialogVisible = ref(false);
const target = ref(null);
const submitting = ref(false);
const form = reactive({ rating: 5, content: '' });

const pendingOrders = computed(() => completedOrders.value.filter((item) => !item.review_id));
const approvedCount = computed(() => reviews.value.filter((item) => item.status === 'approved').length);
const averageRating = computed(() => {
  if (!reviews.value.length) return '—';
  return (reviews.value.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.value.length).toFixed(1);
});

function ratingText(rating) {
  return ['', '很不满意', '不太满意', '一般', '满意', '非常满意'][rating] || '';
}

async function load() {
  loading.value = true;
  try {
    const [reviewData, orderData] = await Promise.all([
      request.get('/user/reviews'),
      request.get('/user/appointments', { params: { status: 'completed' } })
    ]);
    reviews.value = reviewData;
    completedOrders.value = orderData;
  } finally {
    loading.value = false;
  }
}

function openReview(order) {
  target.value = order;
  form.rating = 5;
  form.content = '';
  dialogVisible.value = true;
}

async function submit() {
  if (form.content.trim().length < 5) return ElMessage.warning('评价内容至少 5 个字');
  submitting.value = true;
  try {
    await request.post('/user/reviews', {
      appointment_id: target.value.id,
      rating: form.rating,
      content: form.content
    });
    ElMessage.success('评价已提交，等待平台审核');
    dialogVisible.value = false;
    load();
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.review-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 13px;
  margin-bottom: 20px;
}

.overview-card {
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 15px;
  padding: 15px 17px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.overview-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.overview-icon.green {
  background: #eaf7f1;
  color: #0f9f78;
}
.overview-icon.gold {
  background: #fff4df;
  color: #dc9a2c;
}
.overview-icon.blue {
  background: #edf2fe;
  color: #5b7fd4;
}
.overview-icon.purple {
  background: #f2effd;
  color: #8269d6;
}

.overview-card div {
  display: flex;
  flex-direction: column;
}

.overview-card strong {
  font-size: 22px;
  line-height: 1.1;
}

.overview-card span:last-child {
  font-size: 8px;
  color: #97a49d;
  margin-top: 3px;
}

.pending-section {
  margin-bottom: 22px;
}

.section-head {
  margin-bottom: 12px;
}

.section-head h2 {
  margin: 0 0 4px;
  font-size: 17px;
}

.section-head p {
  margin: 0;
  font-size: 9px;
  color: #94a19a;
}

.pending-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 11px;
}

.pending-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(100deg, #fff, #f6fbf8);
  border: 1px solid #e2eee8;
  border-radius: 14px;
  padding: 13px 15px;
}

.pending-date {
  width: 42px;
  text-align: center;
  flex-shrink: 0;
}

.pending-date strong {
  display: block;
  font-size: 18px;
  color: var(--fitness-primary-dark);
  line-height: 1;
}

.pending-date span {
  font-size: 7px;
  color: #94a19a;
}

.pending-main {
  flex: 1;
  min-width: 0;
}

.pending-main h3 {
  margin: 0;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pending-main p {
  margin: 3px 0 2px;
  font-size: 8px;
  color: #91a098;
}

.pending-main span {
  font-size: 9px;
  font-weight: 700;
  color: var(--fitness-primary-dark);
}

.my-review-list {
  display: flex;
  flex-direction: column;
}

.my-review {
  display: flex;
  gap: 14px;
  padding: 16px 0;
  border-bottom: 1px solid #eff3f1;
}

.my-review:last-child {
  border-bottom: 0;
}

.review-cover {
  width: 95px;
  height: 78px;
  border-radius: 10px;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #e9f4ef;
  color: #198d6b;
  font-size: 22px;
}

.review-body {
  flex: 1;
  min-width: 0;
}

.review-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.review-head h3 {
  margin: 0;
  font-size: 13px;
}

.review-head p {
  margin: 4px 0 0;
  font-size: 8px;
  color: #97a49d;
}

.review-rating {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 7px;
}

.review-rating :deep(.el-rate__icon) {
  font-size: 13px;
}

.review-rating span {
  font-size: 8px;
  color: #d29a32;
}

.review-text {
  font-size: 10px;
  line-height: 1.75;
  color: #5f7368;
  margin: 8px 0 0;
}

.reply-box {
  background: #f5f9f7;
  border-radius: 8px;
  padding: 8px 11px;
  margin-top: 9px;
}

.reply-head {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 8px;
  color: var(--fitness-primary);
  font-weight: 700;
}

.reply-box p {
  font-size: 9px;
  color: #7b8b83;
  margin: 3px 0 0;
}

.reject-box {
  margin-top: 8px;
  background: #fff0ef;
  border-radius: 7px;
  padding: 7px 10px;
  font-size: 8px;
  color: #c65b50;
}

.dialog-service h3 {
  margin: 0 0 4px;
  font-size: 15px;
}

.dialog-service p {
  margin: 0 0 16px;
  font-size: 9px;
  color: #94a19a;
}

.dialog-rating {
  display: flex;
  align-items: center;
  gap: 13px;
  background: #f7faf8;
  border-radius: 9px;
  padding: 11px 13px;
  margin-bottom: 13px;
  font-size: 10px;
  color: #677a70;
}

@media (max-width: 1000px) {
  .review-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  .pending-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .my-review {
    flex-direction: column;
  }
  .review-cover {
    width: 100%;
    height: 130px;
  }
}
</style>
