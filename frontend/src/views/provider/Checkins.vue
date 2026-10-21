<template>
  <div class="page">
    <PageHeader title="打卡核验" subtitle="核验会员到店打卡记录，通过后积分将自动计入会员账户">
      <el-button plain @click="load">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </PageHeader>

    <section class="checkin-stats">
      <div class="checkin-stat pending">
        <span class="stat-icon"><el-icon><Clock /></el-icon></span>
        <div><strong>{{ countOf('pending') }}</strong><span>待核验</span><small>请及时处理</small></div>
      </div>
      <div class="checkin-stat approved">
        <span class="stat-icon"><el-icon><CircleCheck /></el-icon></span>
        <div><strong>{{ countOf('approved') }}</strong><span>已通过</span><small>累计核验记录</small></div>
      </div>
      <div class="checkin-stat rejected">
        <span class="stat-icon"><el-icon><CircleClose /></el-icon></span>
        <div><strong>{{ countOf('rejected') }}</strong><span>已驳回</span><small>不符合核验条件</small></div>
      </div>
      <div class="checkin-stat points">
        <span class="stat-icon"><el-icon><Trophy /></el-icon></span>
        <div><strong>{{ approvedPoints }}</strong><span>累计发放积分</span><small>已通过记录合计</small></div>
      </div>
    </section>

    <el-alert
      v-if="countOf('pending') > 0"
      class="pending-alert"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #title>
        有 {{ countOf('pending') }} 条打卡记录等待核验，请核对会员到店信息后处理。
      </template>
    </el-alert>

    <section class="panel-card checkin-panel">
      <div class="panel-title">
        <div>
          <h2>打卡记录</h2>
          <span>仅显示在当前门店提交的场馆打卡</span>
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
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="会员" min-width="135">
          <template #default="{ row }">
            <div class="member-cell">
              <img v-if="row.user_avatar" :src="row.user_avatar" class="member-avatar" alt="" />
              <span v-else class="member-avatar fallback">{{ row.user_name?.slice(0, 1) || 'U' }}</span>
              <div><strong>{{ row.user_name }}</strong><span>{{ row.user_phone }}</span></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="关联预约" min-width="165">
          <template #default="{ row }">
            <div class="appointment-cell">
              <strong>{{ row.service_name || '场馆打卡' }}</strong>
              <span>{{ row.appointment_no || '无关联订单' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="打卡时间" min-width="145">
          <template #default="{ row }">
            <div class="appointment-cell">
              <strong>{{ row.checkin_date }}</strong>
              <span>{{ formatDate(row.checkin_time, true).slice(11) || '—' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="运动数据" width="130">
          <template #default="{ row }">
            <div class="data-cell">
              <span>{{ row.duration_minutes }} 分钟</span>
              <span>{{ row.calories }} kcal</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="积分" width="75">
          <template #default="{ row }"><strong class="point-text">+{{ row.points }}</strong></template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><StatusTag :status="row.status" kind="checkin" /></template>
        </el-table-column>
        <el-table-column label="核验说明" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="note-text">{{ row.reject_reason || row.content || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="success" size="small" plain @click="approve(row)">通过</el-button>
              <el-button type="danger" size="small" text @click="reject(row)">驳回</el-button>
            </template>
            <span v-else class="handled-text">{{ row.verified_at ? formatDate(row.verified_at, true) : '已处理' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!list.length && !loading" description="暂无打卡记录" :image-size="85" />
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import StatusTag from '../../components/StatusTag.vue';
import { formatDate } from '../../utils/constants';

const loading = ref(false);
const list = ref([]);
const counts = ref([]);
const statusFilter = ref('pending');

const tabs = [
  { label: '待核验', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '全部记录', value: 'all' }
];

const summary = ref({});
const approvedPoints = computed(() => Number(summary.value.approved_points || 0));

function countOf(status) {
  return Number(counts.value.find((item) => item.status === status)?.total || 0);
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/provider/checkins', {
      params: { status: statusFilter.value }
    });
    list.value = data.list;
    counts.value = data.counts;
    summary.value = data.summary || {};
  } finally {
    loading.value = false;
  }
}

function changeStatus(status) {
  statusFilter.value = status;
  load();
}

async function approve(row) {
  await ElMessageBox.confirm(
    `确认「${row.user_name}」已完成 ${row.duration_minutes} 分钟训练，并通过本次打卡核验？通过后将发放 ${row.points} 积分。`,
    '通过打卡核验',
    { confirmButtonText: '确认通过', cancelButtonText: '取消', type: 'success' }
  );
  await request.patch(`/provider/checkins/${row.id}/verify`, { status: 'approved' });
  ElMessage.success('打卡核验通过');
  load();
}

async function reject(row) {
  const result = await ElMessageBox.prompt('请填写驳回原因，会员会在消息中心看到说明。', '驳回打卡', {
    confirmButtonText: '确认驳回',
    cancelButtonText: '返回',
    inputPlaceholder: '例如：未查询到当日到店记录',
    inputValidator: (value) => Boolean(value?.trim()) || '请填写驳回原因',
    type: 'warning'
  }).catch(() => null);
  if (!result) return;
  await request.patch(`/provider/checkins/${row.id}/verify`, {
    status: 'rejected',
    reject_reason: result.value
  });
  ElMessage.success('打卡已驳回');
  load();
}

onMounted(load);
</script>

<style scoped>
.checkin-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}

.checkin-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 14px;
  padding: 14px 16px;
}

.stat-icon {
  width: 39px;
  height: 39px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-size: 19px;
}

.checkin-stat.pending .stat-icon {
  background: #fff4e2;
  color: #d9982d;
}
.checkin-stat.approved .stat-icon {
  background: #e9f7f1;
  color: #0f9f78;
}
.checkin-stat.rejected .stat-icon {
  background: #fdeeed;
  color: #db6b60;
}
.checkin-stat.points .stat-icon {
  background: #f2effc;
  color: #826ad0;
}

.checkin-stat div {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  column-gap: 5px;
}

.checkin-stat strong {
  font-size: 21px;
  line-height: 1.1;
}

.checkin-stat div span {
  font-size: 9px;
  color: #66796e;
}

.checkin-stat small {
  grid-column: span 2;
  font-size: 7px;
  color: #9aa7a0;
}

.pending-alert {
  border-radius: 10px;
  margin-bottom: 14px;
}

.status-tabs {
  display: flex;
  background: #f1f5f3;
  padding: 3px;
  border-radius: 8px;
}

.status-tabs button {
  border: 0;
  background: transparent;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 9px;
  color: #788980;
  cursor: pointer;
}

.status-tabs button.active {
  background: #fff;
  color: var(--fitness-primary-dark);
  font-weight: 700;
  box-shadow: 0 2px 7px rgba(16, 53, 39, 0.07);
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

.member-cell div,
.appointment-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-cell strong,
.appointment-cell strong {
  font-size: 9px;
}

.member-cell span,
.appointment-cell span {
  font-size: 7px;
  color: #97a49d;
}

.data-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 8px;
  color: #6e8177;
}

.point-text {
  color: var(--fitness-primary);
  font-size: 11px;
}

.note-text {
  font-size: 8px;
  color: #8d9b94;
}

.handled-text {
  font-size: 7px;
  color: #a2aea8;
}

@media (max-width: 1000px) {
  .checkin-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .checkin-stats {
    grid-template-columns: 1fr;
  }
  .panel-title {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
