<template>
  <div class="page">
    <PageHeader title="评价审核" subtitle="审核会员评价内容，维护真实、友善的平台评价环境">
      <el-button plain @click="load">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </PageHeader>

    <section class="review-stats">
      <button
        v-for="item in statItems"
        :key="item.status"
        class="review-stat"
        :class="{ active: statusFilter === item.status }"
        @click="changeStatus(item.status)"
      >
        <span class="stat-icon" :style="{ background: item.bg, color: item.color }">
          <el-icon><component :is="item.icon" /></el-icon>
        </span>
        <div><strong>{{ item.value }}</strong><span>{{ item.label }}</span></div>
      </button>
    </section>

    <section class="panel-card">
      <div class="panel-title">
        <div>
          <h2>评价内容</h2>
          <span>共 {{ total }} 条评价</span>
        </div>
        <div class="toolbar">
          <el-select v-model="ratingFilter" clearable placeholder="全部评分" style="width: 115px" @change="search">
            <el-option v-for="star in [5, 4, 3, 2, 1]" :key="star" :label="`${star} 星`" :value="star" />
          </el-select>
          <el-input
            v-model="keyword"
            placeholder="评价内容 / 会员 / 服务商"
            clearable
            style="width: 250px"
            @keyup.enter="search"
            @clear="search"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
            <template #append><el-button @click="search">搜索</el-button></template>
          </el-input>
        </div>
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

      <div v-loading="loading" class="review-list">
        <article v-for="item in list" :key="item.id" class="review-row">
          <div class="review-main">
            <div class="review-head">
              <img v-if="item.user_avatar" :src="item.user_avatar" class="review-avatar" alt="" />
              <span v-else class="review-avatar fallback">{{ item.user_name?.slice(0, 1) }}</span>
              <div class="user-info">
                <strong>{{ item.user_name }}</strong>
                <span>{{ item.provider_name }} · {{ item.service_name }}</span>
              </div>
              <div class="score-info">
                <el-rate :model-value="item.rating" disabled />
                <StatusTag :status="item.status" kind="review" />
              </div>
            </div>
            <p class="content">{{ item.content }}</p>
            <div v-if="item.reply" class="reply">
              <span>商家回复</span>
              <p>{{ item.reply }}</p>
            </div>
            <div class="review-meta">
              <span>评价时间：{{ formatDate(item.created_at, true) }}</span>
              <span v-if="item.appointment_no">订单：{{ item.appointment_no }}</span>
              <span v-if="item.audit_remark" class="audit-remark">审核说明：{{ item.audit_remark }}</span>
            </div>
          </div>
          <div class="review-actions">
            <el-button
              v-if="item.status === 'pending'"
              type="primary"
              size="small"
              @click="openAudit(item, 'approved')"
            >
              审核
            </el-button>
            <el-button size="small" plain @click="openAudit(item, item.status === 'approved' ? 'approved' : 'pending')">
              查看
            </el-button>
          </div>
        </article>
        <el-empty v-if="!list.length && !loading" description="暂无评价记录" :image-size="85" />
      </div>

      <div class="pagination-wrap">
        <span>共 {{ total }} 条评价</span>
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

    <el-dialog v-model="auditVisible" title="评价审核" width="580px">
      <div v-if="current" class="audit-content">
        <div class="audit-user">
          <span class="avatar">{{ current.user_name?.slice(0, 1) }}</span>
          <div>
            <strong>{{ current.user_name }}</strong>
            <span>{{ current.provider_name }} · {{ current.service_name }}</span>
          </div>
          <el-rate :model-value="current.rating" disabled />
        </div>
        <div class="audit-text">{{ current.content }}</div>
        <div v-if="current.reply" class="audit-reply">
          <span>商家回复</span>
          <p>{{ current.reply }}</p>
        </div>
        <div class="audit-date">提交时间：{{ formatDate(current.created_at, true) }}</div>
        <template v-if="current.status === 'pending'">
          <div class="decision-row">
            <button :class="{ active: auditStatus === 'approved' }" @click="auditStatus = 'approved'">
              <el-icon><CircleCheck /></el-icon>
              <span><strong>审核通过</strong><small>展示在服务详情与场馆页</small></span>
            </button>
            <button class="reject" :class="{ active: auditStatus === 'rejected' }" @click="auditStatus = 'rejected'">
              <el-icon><CircleClose /></el-icon>
              <span><strong>驳回评价</strong><small>不展示并通知会员原因</small></span>
            </button>
          </div>
          <el-input
            v-if="auditStatus === 'rejected'"
            v-model="auditRemark"
            type="textarea"
            :rows="3"
            placeholder="请填写驳回原因，例如：包含不当言论、与订单服务无关"
          />
        </template>
        <div v-else class="current-result">
          当前状态：{{ reviewStatusMap[current.status]?.label }}<span v-if="current.audit_remark"> · {{ current.audit_remark }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="auditVisible = false">关闭</el-button>
        <el-button
          v-if="current?.status === 'pending'"
          type="primary"
          :loading="saving"
          @click="submitAudit"
        >
          提交审核
        </el-button>
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
import { formatDate, reviewStatusMap } from '../../utils/constants';

const loading = ref(false);
const saving = ref(false);
const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const statusFilter = ref('pending');
const ratingFilter = ref(null);
const keyword = ref('');
const counts = ref([]);
const auditVisible = ref(false);
const current = ref(null);
const auditStatus = ref('approved');
const auditRemark = ref('');

const tabs = [
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '全部评价', value: 'all' }
];

const statItems = computed(() => [
  { label: '待审核评价', value: countOf('pending'), status: 'pending', icon: 'Clock', bg: '#fff4e2', color: '#d9982e' },
  { label: '已通过评价', value: countOf('approved'), status: 'approved', icon: 'CircleCheck', bg: '#eaf7f2', color: '#0f9f78' },
  { label: '已驳回评价', value: countOf('rejected'), status: 'rejected', icon: 'CircleClose', bg: '#fdeeed', color: '#db6b60' },
  { label: '全部评价', value: counts.value.reduce((sum, item) => sum + Number(item.total), 0), status: 'all', icon: 'ChatDotRound', bg: '#edf2fe', color: '#557cd0' }
]);

function countOf(status) {
  return Number(counts.value.find((item) => item.status === status)?.total || 0);
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/admin/reviews', {
      params: {
        page: page.value,
        pageSize,
        status: statusFilter.value,
        rating: ratingFilter.value || undefined,
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

function openAudit(item, status) {
  current.value = item;
  auditStatus.value = status === 'pending' ? 'approved' : status;
  auditRemark.value = item.audit_remark || '';
  auditVisible.value = true;
}

async function submitAudit() {
  if (auditStatus.value === 'rejected' && !auditRemark.value.trim()) {
    return ElMessage.warning('请填写驳回原因');
  }
  saving.value = true;
  try {
    await request.patch(`/admin/reviews/${current.value.id}/audit`, {
      status: auditStatus.value,
      audit_remark: auditRemark.value || undefined
    });
    ElMessage.success(auditStatus.value === 'approved' ? '评价已通过审核' : '评价已驳回');
    auditVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.review-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}

.review-stat {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  text-align: left;
}

.review-stat.active {
  border-color: var(--fitness-primary);
  box-shadow: 0 6px 16px rgba(15, 159, 120, 0.07);
}

.stat-icon {
  width: 37px;
  height: 37px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.review-stat div {
  display: flex;
  flex-direction: column;
}

.review-stat strong {
  font-size: 19px;
  line-height: 1.1;
}

.review-stat span:last-child {
  font-size: 8px;
  color: #98a59e;
  margin-top: 2px;
}

.toolbar {
  display: flex;
  gap: 8px;
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

.review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 220px;
}

.review-row {
  border: 1px solid #ebf0ed;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  gap: 14px;
}

.review-main {
  flex: 1;
  min-width: 0;
}

.review-head {
  display: flex;
  align-items: center;
  gap: 9px;
}

.review-avatar {
  width: 32px;
  height: 32px;
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

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-info strong {
  font-size: 10px;
}

.user-info span {
  font-size: 7px;
  color: #98a59e;
}

.score-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-info :deep(.el-rate__icon) {
  font-size: 12px;
}

.content {
  font-size: 10px;
  line-height: 1.75;
  color: #5f7167;
  margin: 9px 0;
}

.reply {
  background: #f5f9f7;
  border-radius: 7px;
  padding: 8px 10px;
}

.reply span {
  font-size: 7px;
  color: var(--fitness-primary);
  font-weight: 700;
}

.reply p {
  font-size: 8px;
  line-height: 1.6;
  color: #7b8b83;
  margin: 3px 0 0;
}

.review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  font-size: 7px;
  color: #a0aca6;
}

.audit-remark {
  color: #bd6a60;
}

.review-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
  flex-shrink: 0;
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

.audit-user {
  display: flex;
  align-items: center;
  gap: 9px;
}

.audit-user div {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.audit-user strong {
  font-size: 11px;
}

.audit-user span {
  font-size: 8px;
  color: #98a59e;
}

.audit-text {
  background: #f7faf8;
  border-radius: 10px;
  padding: 13px;
  font-size: 10px;
  line-height: 1.8;
  color: #596d63;
  margin: 12px 0;
}

.audit-reply {
  background: #f1f8f4;
  border-radius: 8px;
  padding: 9px 11px;
}

.audit-reply span {
  font-size: 7px;
  color: var(--fitness-primary);
  font-weight: 700;
}

.audit-reply p {
  font-size: 8px;
  line-height: 1.6;
  color: #7b8b83;
  margin: 3px 0 0;
}

.audit-date {
  font-size: 7px;
  color: #a0aca6;
  margin: 10px 0 14px;
}

.decision-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-bottom: 11px;
}

.decision-row button {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1.5px solid #e6ece8;
  background: #fff;
  border-radius: 10px;
  padding: 11px;
  text-align: left;
  cursor: pointer;
  color: #7f8f87;
}

.decision-row button.active {
  border-color: var(--fitness-primary);
  background: #f1faf6;
  color: var(--fitness-primary-dark);
}

.decision-row button.reject.active {
  border-color: #e26f64;
  background: #fff4f3;
  color: #c65349;
}

.decision-row .el-icon {
  font-size: 20px;
}

.decision-row span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.decision-row strong {
  font-size: 10px;
}

.decision-row small {
  font-size: 7px;
  color: #98a59e;
}

.current-result {
  background: #f7faf8;
  border-radius: 9px;
  padding: 11px;
  font-size: 9px;
  color: #64766c;
}

@media (max-width: 1000px) {
  .review-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .review-row {
    flex-direction: column;
  }
  .review-actions {
    flex-direction: row;
  }
  .panel-title {
    align-items: flex-start;
    flex-direction: column;
  }
  .toolbar {
    width: 100%;
  }
}

@media (max-width: 550px) {
  .review-stats {
    grid-template-columns: 1fr;
  }
  .toolbar {
    flex-direction: column;
  }
  .toolbar > * {
    width: 100% !important;
  }
  .decision-row {
    grid-template-columns: 1fr;
  }
}
</style>
