<template>
  <div class="page">
    <PageHeader title="服务商入驻" subtitle="审核门店资质与经营信息，保障平台服务品质">
      <el-button plain @click="load">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </PageHeader>

    <section class="provider-stats">
      <button
        v-for="item in statItems"
        :key="item.status"
        class="provider-stat"
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
          <h2>服务商列表</h2>
          <span>共 {{ total }} 家服务商</span>
        </div>
        <el-input
          v-model="keyword"
          placeholder="搜索门店名称、负责人、手机号"
          clearable
          style="width: 270px"
          @keyup.enter="search"
          @clear="search"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
          <template #append><el-button @click="search">搜索</el-button></template>
        </el-input>
      </div>

      <div class="status-filter">
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
        <el-table-column label="门店信息" min-width="220">
          <template #default="{ row }">
            <div class="provider-cell">
              <el-image :src="row.cover" fit="cover" class="provider-cover">
                <template #error><div class="cover-fallback"><el-icon><OfficeBuilding /></el-icon></div></template>
              </el-image>
              <div>
                <strong>{{ row.name }}</strong>
                <span><el-icon><Location /></el-icon>{{ row.address || '地址待完善' }}</span>
                <small>{{ row.license_no || '未填写营业执照' }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="120">
          <template #default="{ row }">
            <div class="owner-cell">
              <strong>{{ row.owner_name }}</strong>
              <span>{{ row.owner_phone }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="经营配置" width="135">
          <template #default="{ row }">
            <div class="config-cell">
              <span>{{ row.service_count }} 项服务</span>
              <span>{{ row.coach_count }} 位教练</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="订单 / 评分" width="110">
          <template #default="{ row }">
            <div class="config-cell">
              <span>{{ row.order_count }} 单</span>
              <span class="rating"><el-icon><StarFilled /></el-icon>{{ row.rating }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="入驻时间" width="105">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }"><StatusTag :status="row.status" kind="provider" /></template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDetail(row)">查看</el-button>
            <el-button
              v-if="row.status === 'pending' || row.status === 'rejected'"
              type="primary"
              size="small"
              plain
              @click="openAudit(row)"
            >
              审核
            </el-button>
            <el-button
              v-if="row.status === 'approved'"
              text
              type="danger"
              size="small"
              @click="disable(row)"
            >
              停用
            </el-button>
            <el-button v-if="row.status === 'disabled'" text type="success" size="small" @click="enable(row)">恢复</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <span>共 {{ total }} 条记录</span>
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

    <el-dialog v-model="auditVisible" title="服务商入驻审核" width="620px">
      <div v-if="current" class="audit-body">
        <div class="audit-head">
          <div class="audit-logo">{{ current.name?.slice(0, 1) }}</div>
          <div>
            <h3>{{ current.name }}</h3>
            <p>{{ current.owner_name }} · {{ current.owner_phone }}</p>
          </div>
          <StatusTag :status="current.status" kind="provider" />
        </div>
        <div class="audit-info">
          <div><span>营业执照</span><strong>{{ current.license_no || '未填写' }}</strong></div>
          <div><span>门店地址</span><strong>{{ current.address || '未填写' }}</strong></div>
          <div><span>营业时间</span><strong>{{ current.business_hours || '未填写' }}</strong></div>
          <div><span>提交时间</span><strong>{{ formatDate(current.created_at, true) }}</strong></div>
        </div>
        <div class="audit-desc">
          <span>门店简介</span>
          <p>{{ current.description || '未填写门店简介' }}</p>
        </div>
        <div class="decision-row">
          <button :class="{ active: auditStatus === 'approved' }" @click="auditStatus = 'approved'">
            <el-icon><CircleCheck /></el-icon>
            <span><strong>审核通过</strong><small>允许门店开展经营活动</small></span>
          </button>
          <button class="reject" :class="{ active: auditStatus === 'rejected' }" @click="auditStatus = 'rejected'">
            <el-icon><CircleClose /></el-icon>
            <span><strong>驳回申请</strong><small>要求服务商修改资料</small></span>
          </button>
        </div>
        <el-input
          v-if="auditStatus === 'rejected'"
          v-model="rejectReason"
          type="textarea"
          :rows="3"
          placeholder="请填写驳回原因，例如：营业执照信息不清晰、门店地址不完整"
        />
      </div>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitAudit">提交审核结果</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="服务商详情" size="470px">
      <div v-if="detail" class="detail-body">
        <el-image :src="detail.cover" fit="cover" class="detail-cover">
          <template #error><div class="detail-cover-fallback"><el-icon><OfficeBuilding /></el-icon></div></template>
        </el-image>
        <div class="detail-title">
          <h2>{{ detail.name }}</h2>
          <StatusTag :status="detail.status" kind="provider" />
        </div>
        <p class="detail-desc">{{ detail.description }}</p>
        <div class="detail-grid">
          <div><span>负责人</span><strong>{{ detail.owner_name }}</strong></div>
          <div><span>手机号</span><strong>{{ detail.owner_phone }}</strong></div>
          <div><span>门店电话</span><strong>{{ detail.phone || '—' }}</strong></div>
          <div><span>营业时间</span><strong>{{ detail.business_hours || '—' }}</strong></div>
          <div><span>服务数量</span><strong>{{ detail.service_count }} 项</strong></div>
          <div><span>教练数量</span><strong>{{ detail.coach_count }} 位</strong></div>
          <div><span>累计订单</span><strong>{{ detail.order_count }} 单</strong></div>
          <div><span>门店评分</span><strong>{{ detail.rating }} 分</strong></div>
        </div>
        <div class="detail-address"><el-icon><Location /></el-icon>{{ detail.address || '地址待完善' }}</div>
        <div v-if="detail.reject_reason" class="reject-reason">驳回原因：{{ detail.reject_reason }}</div>
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
import { formatDate } from '../../utils/constants';

const loading = ref(false);
const saving = ref(false);
const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const statusFilter = ref('all');
const keyword = ref('');
const counts = ref([]);
const auditVisible = ref(false);
const current = ref(null);
const auditStatus = ref('approved');
const rejectReason = ref('');
const detailVisible = ref(false);
const detail = ref(null);

const tabs = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'pending' },
  { label: '营业中', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '已停用', value: 'disabled' }
];

const statItems = computed(() => {
  const totalCount = counts.value.reduce((sum, item) => sum + Number(item.total), 0);
  return [
    { label: '全部服务商', value: totalCount, status: 'all', icon: 'OfficeBuilding', bg: '#eaf7f2', color: '#0f9f78' },
    { label: '营业中', value: countOf('approved'), status: 'approved', icon: 'CircleCheck', bg: '#edf2fe', color: '#557cd0' },
    { label: '待审核', value: countOf('pending'), status: 'pending', icon: 'Clock', bg: '#fff4e2', color: '#d9982e' },
    { label: '已停用', value: countOf('disabled'), status: 'disabled', icon: 'CircleClose', bg: '#f5f1ef', color: '#9a857a' }
  ];
});

function countOf(status) {
  return Number(counts.value.find((item) => item.status === status)?.total || 0);
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/admin/providers', {
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

function openAudit(row) {
  current.value = row;
  auditStatus.value = 'approved';
  rejectReason.value = '';
  auditVisible.value = true;
}

async function submitAudit() {
  if (auditStatus.value === 'rejected' && !rejectReason.value.trim()) {
    return ElMessage.warning('请填写驳回原因');
  }
  saving.value = true;
  try {
    await request.patch(`/admin/providers/${current.value.id}/audit`, {
      status: auditStatus.value,
      reject_reason: auditStatus.value === 'rejected' ? rejectReason.value : undefined
    });
    ElMessage.success(auditStatus.value === 'approved' ? '已通过入驻审核' : '已驳回申请');
    auditVisible.value = false;
    load();
  } finally {
    saving.value = false;
  }
}

function openDetail(row) {
  detail.value = row;
  detailVisible.value = true;
}

async function disable(row) {
  const result = await ElMessageBox.prompt('请填写停用原因，服务商将收到通知。', '停用门店', {
    confirmButtonText: '确认停用',
    cancelButtonText: '取消',
    inputPlaceholder: '例如：存在违规经营行为',
    inputValidator: (value) => Boolean(value?.trim()) || '请填写停用原因',
    type: 'warning'
  }).catch(() => null);
  if (!result) return;
  await request.patch(`/admin/providers/${row.id}/status`, {
    status: 'disabled',
    reason: result.value
  });
  ElMessage.success('门店已停用');
  load();
}

async function enable(row) {
  await ElMessageBox.confirm(`确认恢复「${row.name}」的营业资格吗？`, '恢复门店', {
    confirmButtonText: '确认恢复',
    cancelButtonText: '取消'
  });
  await request.patch(`/admin/providers/${row.id}/status`, { status: 'approved' });
  ElMessage.success('门店已恢复');
  load();
}

onMounted(load);
</script>

<style scoped>
.provider-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}

.provider-stat {
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

.provider-stat.active {
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

.provider-stat div {
  display: flex;
  flex-direction: column;
}

.provider-stat strong {
  font-size: 19px;
  line-height: 1.1;
}

.provider-stat span:last-child {
  font-size: 8px;
  color: #98a59e;
  margin-top: 2px;
}

.status-filter {
  display: flex;
  gap: 3px;
  background: #f2f6f4;
  border-radius: 8px;
  padding: 3px;
  width: fit-content;
  margin-bottom: 14px;
}

.status-filter button {
  border: 0;
  background: transparent;
  font-size: 9px;
  color: #788980;
  border-radius: 6px;
  padding: 5px 10px;
  cursor: pointer;
}

.status-filter button.active {
  background: #fff;
  color: var(--fitness-primary-dark);
  font-weight: 700;
  box-shadow: 0 2px 7px rgba(16, 53, 39, 0.07);
}

.provider-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.provider-cover {
  width: 55px;
  height: 45px;
  border-radius: 8px;
  flex-shrink: 0;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #153e2e;
  color: #c8ec66;
  font-size: 17px;
}

.provider-cell > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.provider-cell strong {
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-cell span {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 7px;
  color: #8e9c95;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-cell small {
  font-size: 7px;
  color: #a7b2ac;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.owner-cell,
.config-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.owner-cell strong {
  font-size: 9px;
}

.owner-cell span,
.config-cell span {
  font-size: 7px;
  color: #94a19a;
}

.rating {
  display: flex !important;
  align-items: center;
  gap: 2px;
  color: #d39a2b !important;
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

.audit-head {
  display: flex;
  align-items: center;
  gap: 11px;
  padding-bottom: 14px;
  border-bottom: 1px solid #edf1ef;
}

.audit-logo {
  width: 43px;
  height: 43px;
  border-radius: 12px;
  background: #e4f5ed;
  color: #127a5b;
  display: grid;
  place-items: center;
  font-size: 17px;
  font-weight: 800;
}

.audit-head div:nth-child(2) {
  flex: 1;
}

.audit-head h3 {
  margin: 0 0 3px;
  font-size: 15px;
}

.audit-head p {
  margin: 0;
  font-size: 8px;
  color: #94a19a;
}

.audit-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin: 14px 0;
}

.audit-info div {
  background: #f8faf9;
  border-radius: 9px;
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.audit-info span,
.audit-desc > span {
  font-size: 7px;
  color: #98a59e;
}

.audit-info strong {
  font-size: 9px;
}

.audit-desc {
  background: #f8faf9;
  border-radius: 9px;
  padding: 10px 11px;
  margin-bottom: 14px;
}

.audit-desc p {
  font-size: 9px;
  line-height: 1.7;
  color: #6c7f75;
  margin: 4px 0 0;
}

.decision-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-bottom: 12px;
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

.detail-cover {
  width: 100%;
  height: 170px;
  border-radius: 13px;
}

.detail-cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #12382a;
  color: #c8ec66;
  font-size: 38px;
}

.detail-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
}

.detail-title h2 {
  margin: 0;
  font-size: 18px;
}

.detail-desc {
  font-size: 9px;
  line-height: 1.7;
  color: #75867d;
  margin: 7px 0 14px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-grid div {
  background: #f8faf9;
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

.detail-address {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f3f9f6;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 9px;
  color: #5f766b;
  margin-top: 10px;
}

.reject-reason {
  background: #fff2f1;
  color: #c55a4f;
  border-radius: 8px;
  padding: 9px;
  font-size: 8px;
  margin-top: 9px;
}

@media (max-width: 1000px) {
  .provider-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .provider-stats {
    grid-template-columns: 1fr;
  }
  .panel-title {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
