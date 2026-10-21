<template>
  <div class="page">
    <PageHeader title="评价管理" subtitle="倾听会员真实反馈，及时回复并持续优化服务体验">
      <el-button plain @click="load">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </PageHeader>

    <div class="review-layout">
      <aside class="summary-panel">
        <section class="rating-card">
          <span class="rating-label">门店综合评分</span>
          <div class="rating-main">
            <strong>{{ summary.average || '5.0' }}</strong>
            <div>
              <el-rate :model-value="Number(summary.average || 5)" disabled />
              <span>共 {{ summary.total || 0 }} 条已展示评价</span>
            </div>
          </div>
          <div class="rating-dist">
            <div v-for="star in [5, 4, 3, 2, 1]" :key="star">
              <span>{{ star }} 星</span>
              <div class="dist-track"><i :style="{ width: `${percent(star)}%` }" /></div>
              <b>{{ summary[starKey(star)] || 0 }}</b>
            </div>
          </div>
        </section>
        <section class="summary-mini">
          <div>
            <span class="mini-icon gold"><el-icon><ChatLineSquare /></el-icon></span>
            <strong>{{ summary.unreplied || 0 }}</strong>
            <span>待回复评价</span>
          </div>
          <div>
            <span class="mini-icon green"><el-icon><StarFilled /></el-icon></span>
            <strong>{{ fiveStarRate }}%</strong>
            <span>五星好评率</span>
          </div>
        </section>
        <section class="reply-tip">
          <el-icon><InfoFilled /></el-icon>
          <p>真诚、具体的回复能提升会员信任。建议在 24 小时内回复新评价。</p>
        </section>
      </aside>

      <section class="panel-card review-panel">
        <div class="panel-title">
          <div>
            <h2>会员评价</h2>
            <span>查看并回复会员的课程与服务反馈</span>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              :class="{ active: statusFilter === tab.value }"
              @click="changeFilter(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>
          <el-select v-model="ratingFilter" clearable placeholder="全部评分" style="width: 120px" @change="load">
            <el-option v-for="star in [5, 4, 3, 2, 1]" :key="star" :label="`${star} 星`" :value="star" />
          </el-select>
        </div>

        <div v-loading="loading" class="review-list">
          <article v-for="item in list" :key="item.id" class="review-item">
            <div class="review-head">
              <img v-if="item.user_avatar" :src="item.user_avatar" class="review-avatar" alt="" />
              <span v-else class="review-avatar fallback">{{ item.user_name?.slice(0, 1) || 'U' }}</span>
              <div class="review-user">
                <strong>{{ item.user_name }}</strong>
                <span>{{ item.service_name }} · {{ formatDate(item.created_at, true) }}</span>
              </div>
              <div class="review-score">
                <el-rate :model-value="item.rating" disabled />
                <StatusTag :status="item.status" kind="review" />
              </div>
            </div>
            <p class="review-content">{{ item.content }}</p>
            <div v-if="item.status === 'pending'" class="pending-note">
              <el-icon><Clock /></el-icon>该评价正在等待平台审核，审核通过后将展示在会员端。
            </div>
            <div v-if="item.reply" class="reply-block">
              <div class="reply-title"><el-icon><ChatDotRound /></el-icon>我的回复</div>
              <p>{{ item.reply }}</p>
              <span>{{ formatDate(item.replied_at, true) }}</span>
            </div>
            <div class="review-foot">
              <span class="order-ref">订单 {{ item.appointment_no || '—' }}</span>
              <el-button type="primary" size="small" plain @click="openReply(item)">
                {{ item.reply ? '修改回复' : '回复评价' }}
              </el-button>
            </div>
          </article>
          <el-empty v-if="!list.length && !loading" description="暂无符合条件的评价" :image-size="85" />
        </div>
      </section>
    </div>

    <el-dialog v-model="dialogVisible" title="回复会员评价" width="500px">
      <div v-if="target" class="reply-target">
        <div class="target-user">
          <span class="avatar">{{ target.user_name?.slice(0, 1) }}</span>
          <div><strong>{{ target.user_name }}</strong><span>{{ target.service_name }}</span></div>
          <el-rate :model-value="target.rating" disabled />
        </div>
        <p class="target-content">{{ target.content }}</p>
      </div>
      <el-input
        v-model="replyText"
        type="textarea"
        :rows="4"
        maxlength="500"
        show-word-limit
        placeholder="感谢会员的反馈，并针对体验给出具体回应..."
      />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReply">发布回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import StatusTag from '../../components/StatusTag.vue';
import { formatDate } from '../../utils/constants';

const loading = ref(false);
const list = ref([]);
const summary = ref({});
const statusFilter = ref('all');
const ratingFilter = ref(null);
const dialogVisible = ref(false);
const target = ref(null);
const replyText = ref('');
const submitting = ref(false);

const tabs = [
  { label: '全部评价', value: 'all' },
  { label: '已通过', value: 'approved' },
  { label: '待审核', value: 'pending' }
];

const fiveStarRate = computed(() => {
  const total = Number(summary.value.total || 0);
  if (!total) return 0;
  return Math.round((Number(summary.value.five || 0) / total) * 100);
});

function starKey(star) {
  return ['one', 'two', 'three', 'four', 'five'][star - 1];
}
function percent(star) {
  const total = Number(summary.value.total || 0);
  return total ? Math.round((Number(summary.value[starKey(star)] || 0) / total) * 100) : 0;
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/provider/reviews', {
      params: {
        status: statusFilter.value,
        rating: ratingFilter.value || undefined
      }
    });
    list.value = data.list;
    summary.value = data.summary;
  } finally {
    loading.value = false;
  }
}

function changeFilter(value) {
  statusFilter.value = value;
  load();
}

function openReply(item) {
  target.value = item;
  replyText.value = item.reply || '';
  dialogVisible.value = true;
}

async function submitReply() {
  if (!replyText.value.trim()) return ElMessage.warning('请填写回复内容');
  submitting.value = true;
  try {
    await request.post(`/provider/reviews/${target.value.id}/reply`, {
      reply: replyText.value
    });
    ElMessage.success('回复已发布');
    dialogVisible.value = false;
    load();
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.review-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  align-items: start;
}

.summary-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rating-card {
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 17px;
  padding: 20px;
  box-shadow: var(--fitness-shadow);
}

.rating-label {
  font-size: 9px;
  color: #8e9c95;
}

.rating-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 16px;
}

.rating-main > strong {
  font-size: 42px;
  line-height: 1;
  color: var(--fitness-primary-dark);
}

.rating-main > div {
  display: flex;
  flex-direction: column;
}

.rating-main :deep(.el-rate) {
  height: 17px;
}

.rating-main :deep(.el-rate__icon) {
  font-size: 13px;
}

.rating-main span {
  font-size: 7px;
  color: #98a59e;
}

.rating-dist {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.rating-dist > div {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 8px;
  color: #86958d;
}

.rating-dist span {
  width: 25px;
}

.dist-track {
  flex: 1;
  height: 4px;
  background: #f0f3f1;
  border-radius: 99px;
  overflow: hidden;
}

.dist-track i {
  display: block;
  height: 100%;
  background: #e6b144;
  border-radius: 99px;
}

.rating-dist b {
  width: 16px;
  text-align: right;
  font-weight: 500;
}

.summary-mini {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.summary-mini > div {
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 14px;
  padding: 13px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.mini-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 14px;
  margin-bottom: 3px;
}

.mini-icon.gold {
  background: #fff4e2;
  color: #d9982e;
}
.mini-icon.green {
  background: #e9f7f1;
  color: #0f9f78;
}

.summary-mini strong {
  font-size: 19px;
}

.summary-mini span:last-child {
  font-size: 7px;
  color: #98a59e;
}

.reply-tip {
  display: flex;
  gap: 6px;
  background: #f7faf8;
  border-radius: 11px;
  padding: 11px;
  color: #8e9c95;
}

.reply-tip p {
  font-size: 8px;
  line-height: 1.6;
  margin: 0;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.filter-tabs {
  display: flex;
  background: #f1f5f3;
  padding: 3px;
  border-radius: 8px;
}

.filter-tabs button {
  border: 0;
  background: transparent;
  font-size: 9px;
  color: #788980;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.filter-tabs button.active {
  background: #fff;
  color: var(--fitness-primary-dark);
  font-weight: 700;
  box-shadow: 0 2px 7px rgba(16, 53, 39, 0.07);
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 240px;
}

.review-item {
  border: 1px solid #ebf0ed;
  border-radius: 13px;
  padding: 15px;
}

.review-head {
  display: flex;
  align-items: center;
  gap: 9px;
}

.review-avatar {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  object-fit: cover;
}

.review-avatar.fallback {
  display: grid;
  place-items: center;
  background: #e1f3ea;
  color: #1a7c5e;
  font-size: 11px;
  font-weight: 700;
}

.review-user {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.review-user strong {
  font-size: 10px;
}

.review-user span {
  font-size: 7px;
  color: #98a59e;
}

.review-score {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-score :deep(.el-rate__icon) {
  font-size: 12px;
}

.review-content {
  font-size: 10px;
  line-height: 1.8;
  color: #5e7167;
  margin: 11px 0;
}

.pending-note {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  color: #c28d2c;
  background: #fff8ec;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 9px;
}

.reply-block {
  background: #f5f9f7;
  border-radius: 8px;
  padding: 9px 11px;
}

.reply-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  color: var(--fitness-primary);
  font-weight: 700;
}

.reply-block p {
  font-size: 9px;
  line-height: 1.65;
  color: #76877e;
  margin: 4px 0 3px;
}

.reply-block > span {
  font-size: 7px;
  color: #a0aca6;
}

.review-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed #edf1ef;
  padding-top: 10px;
  margin-top: 10px;
}

.order-ref {
  font-family: monospace;
  font-size: 7px;
  color: #a0aca6;
}

.reply-target {
  background: #f7faf8;
  border-radius: 10px;
  padding: 11px;
  margin-bottom: 13px;
}

.target-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-user div {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.target-user strong {
  font-size: 10px;
}

.target-user span {
  font-size: 8px;
  color: #98a59e;
}

.target-content {
  font-size: 9px;
  line-height: 1.7;
  color: #6d7f75;
  margin: 8px 0 0;
}

@media (max-width: 1000px) {
  .review-layout {
    grid-template-columns: 1fr;
  }
  .summary-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .reply-tip {
    grid-column: span 2;
  }
}

@media (max-width: 650px) {
  .summary-panel {
    grid-template-columns: 1fr;
  }
  .reply-tip {
    grid-column: auto;
  }
  .review-head {
    flex-wrap: wrap;
  }
}
</style>
