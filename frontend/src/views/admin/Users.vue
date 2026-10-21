<template>
  <div class="page">
    <PageHeader title="用户账号" subtitle="管理会员与服务商账号，维护平台账号安全与使用秩序">
      <el-button plain @click="load">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </PageHeader>

    <section class="user-summary">
      <div class="summary-card">
        <span class="summary-icon green"><el-icon><User /></el-icon></span>
        <div><strong>{{ total }}</strong><span>当前筛选账号</span></div>
      </div>
      <div class="summary-card">
        <span class="summary-icon blue"><el-icon><CircleCheck /></el-icon></span>
        <div><strong>{{ enabledCount }}</strong><span>正常账号</span></div>
      </div>
      <div class="summary-card">
        <span class="summary-icon red"><el-icon><CircleClose /></el-icon></span>
        <div><strong>{{ disabledCount }}</strong><span>已禁用账号</span></div>
      </div>
      <div class="summary-card">
        <span class="summary-icon gold"><el-icon><Trophy /></el-icon></span>
        <div><strong>{{ totalPoints }}</strong><span>累计健身积分</span></div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-title">
        <div>
          <h2>账号列表</h2>
          <span>管理员账号不在列表中展示</span>
        </div>
      </div>

      <div class="filter-bar">
        <div class="role-tabs">
          <button
            v-for="tab in roleTabs"
            :key="tab.value"
            :class="{ active: roleFilter === tab.value }"
            @click="changeRole(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
        <el-select v-model="statusFilter" style="width: 130px" @change="search">
          <el-option label="全部状态" value="all" />
          <el-option label="正常" value="1" />
          <el-option label="已禁用" value="0" />
        </el-select>
        <el-input
          v-model="keyword"
          placeholder="账号 / 昵称 / 手机号"
          clearable
          style="width: 240px"
          @keyup.enter="search"
          @clear="search"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
          <template #append><el-button @click="search">搜索</el-button></template>
        </el-input>
      </div>

      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column label="用户" min-width="170">
          <template #default="{ row }">
            <div class="user-cell">
              <img v-if="row.avatar" :src="row.avatar" class="user-avatar" alt="" />
              <span v-else class="user-avatar fallback">{{ (row.nickname || row.username).slice(0, 1) }}</span>
              <div>
                <strong>{{ row.nickname || row.username }}</strong>
                <span>@{{ row.username }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="联系方式" width="130">
          <template #default="{ row }">
            <div class="contact-cell">
              <span>{{ row.phone || '未绑定手机' }}</span>
              <small>{{ row.email || '—' }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="95">
          <template #default="{ row }">
            <el-tag :type="row.role === 'provider' ? 'warning' : 'success'" effect="light" size="small">
              {{ row.role === 'provider' ? '服务商' : '会员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="业务数据" width="135">
          <template #default="{ row }">
            <div class="business-cell">
              <span v-if="row.role === 'user'">{{ row.order_count }} 笔预约 · {{ row.checkin_count }} 次打卡</span>
              <span v-else>{{ row.provider_name || '未创建门店' }}</span>
              <small v-if="row.role === 'provider'">门店状态：{{ providerStatusMap[row.provider_status]?.label || '—' }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="积分" width="75">
          <template #default="{ row }"><span class="points">{{ row.points }}</span></template>
        </el-table-column>
        <el-table-column label="最近登录" width="110">
          <template #default="{ row }">{{ row.last_login_at ? formatDate(row.last_login_at) : '从未登录' }}</template>
        </el-table-column>
        <el-table-column label="注册时间" width="105">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="Number(row.status)"
              :active-value="1"
              :inactive-value="0"
              @change="(value) => toggleStatus(row, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="resetPassword(row)">重置密码</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <span>共 {{ total }} 个账号</span>
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
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import { formatDate, providerStatusMap } from '../../utils/constants';

const loading = ref(false);
const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const roleFilter = ref('user');
const statusFilter = ref('all');
const keyword = ref('');

const roleTabs = [
  { label: '会员账号', value: 'user' },
  { label: '服务商账号', value: 'provider' },
  { label: '全部账号', value: 'all' }
];

const enabledCount = computed(() => list.value.filter((item) => Number(item.status) === 1).length);
const disabledCount = computed(() => list.value.filter((item) => Number(item.status) === 0).length);
const totalPoints = computed(() => list.value.reduce((sum, item) => sum + Number(item.points || 0), 0));

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/admin/users', {
      params: {
        page: page.value,
        pageSize,
        role: roleFilter.value,
        status: statusFilter.value,
        keyword: keyword.value || undefined
      }
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function changeRole(value) {
  roleFilter.value = value;
  page.value = 1;
  load();
}
function search() {
  page.value = 1;
  load();
}

async function toggleStatus(row, value) {
  if (value === 0) {
    await ElMessageBox.confirm(`禁用后「${row.nickname || row.username}」将无法登录平台，确定继续吗？`, '禁用账号', {
      confirmButtonText: '确认禁用',
      cancelButtonText: '取消',
      type: 'warning'
    });
  }
  await request.patch(`/admin/users/${row.id}/status`, { status: value });
  ElMessage.success(value === 1 ? '账号已启用' : '账号已禁用');
  load();
}

async function resetPassword(row) {
  const result = await ElMessageBox.prompt(
    `为「${row.nickname || row.username}」设置新的登录密码，留空则重置为 123456。`,
    '重置密码',
    {
      confirmButtonText: '确认重置',
      cancelButtonText: '取消',
      inputPlaceholder: '新密码（至少 6 位）',
      inputValue: '123456'
    }
  ).catch(() => null);
  if (!result) return;
  const data = await request.patch(`/admin/users/${row.id}/reset-password`, {
    password: result.value || '123456'
  });
  ElMessage.success(`密码已重置为 ${data.password}`);
}

onMounted(load);
</script>

<style scoped>
.user-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 14px;
  padding: 14px 16px;
}

.summary-icon {
  width: 37px;
  height: 37px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.summary-icon.green {
  background: #eaf7f2;
  color: #0f9f78;
}
.summary-icon.blue {
  background: #edf2fe;
  color: #557cd0;
}
.summary-icon.red {
  background: #fdeeed;
  color: #db6b60;
}
.summary-icon.gold {
  background: #fff4e2;
  color: #d9982e;
}

.summary-card div {
  display: flex;
  flex-direction: column;
}

.summary-card strong {
  font-size: 19px;
  line-height: 1.1;
}

.summary-card span:last-child {
  font-size: 8px;
  color: #98a59e;
  margin-top: 2px;
}

.role-tabs {
  display: flex;
  gap: 3px;
  background: #f2f6f4;
  border-radius: 8px;
  padding: 3px;
}

.role-tabs button {
  border: 0;
  background: transparent;
  font-size: 9px;
  color: #788980;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}

.role-tabs button.active {
  background: #fff;
  color: var(--fitness-primary-dark);
  font-weight: 700;
  box-shadow: 0 2px 7px rgba(16, 53, 39, 0.07);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  object-fit: cover;
}

.user-avatar.fallback {
  display: grid;
  place-items: center;
  background: #e1f3ea;
  color: #1a7c5e;
  font-size: 11px;
  font-weight: 700;
}

.user-cell div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-cell strong {
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-cell span {
  font-size: 7px;
  color: #98a59e;
}

.contact-cell,
.business-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contact-cell span,
.business-cell span {
  font-size: 8px;
  color: #677a70;
}

.contact-cell small,
.business-cell small {
  font-size: 7px;
  color: #9da9a3;
}

.points {
  font-size: 10px;
  color: var(--fitness-primary-dark);
  font-weight: 700;
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

@media (max-width: 1000px) {
  .user-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .user-summary {
    grid-template-columns: 1fr;
  }
}
</style>
