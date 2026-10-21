<template>
  <div class="page" v-loading="loading">
    <section class="provider-hero" :class="provider?.status">
      <div class="hero-left">
        <span class="hero-eyebrow">{{ roleLabel }}</span>
        <h1>{{ provider?.name || '我的门店' }}</h1>
        <p>{{ provider?.description || '完善门店资料，让更多会员认识你的场馆。' }}</p>
        <div class="hero-meta">
          <span><el-icon><Location /></el-icon>{{ provider?.address || '待完善地址' }}</span>
          <span><el-icon><Clock /></el-icon>{{ provider?.business_hours || '待完善营业时间' }}</span>
          <span><el-icon><StarFilled /></el-icon>{{ stats.rating }} 分</span>
        </div>
      </div>
      <div class="hero-right">
        <div class="status-pill" :class="provider?.status">
          <i />
          {{ providerStatusMap[provider?.status]?.label || '加载中' }}
        </div>
        <div class="hero-revenue">
          <span>本月营业额</span>
          <strong>{{ currency(stats.monthRevenue) }}</strong>
          <small>{{ stats.monthOrders }} 笔已完成订单</small>
        </div>
        <el-button class="store-btn" @click="router.push('/provider/store')">
          管理门店<el-icon><Right /></el-icon>
        </el-button>
      </div>
      <div class="hero-ring" />
    </section>

    <el-alert
      v-if="provider && provider.status !== 'approved'"
      class="status-alert"
      :type="provider.status === 'pending' ? 'warning' : 'error'"
      :closable="false"
      show-icon
    >
      <template #title>
        <span v-if="provider.status === 'pending'">门店资料正在等待平台审核，审核通过后即可上架服务并接收预约。</span>
        <span v-else-if="provider.status === 'rejected'">
          入驻申请未通过：{{ provider.reject_reason || '资料不完整' }}，请修改门店资料后重新提交。
        </span>
        <span v-else>门店已被平台停用，请联系平台管理员了解详情。</span>
      </template>
    </el-alert>

    <section class="stat-grid">
      <StatCard label="今日预约" :value="stats.todayOrders" suffix="单" icon="Calendar" accent="#0f9f78" hint="今日到店安排" />
      <StatCard label="待确认订单" :value="stats.pendingOrders" suffix="单" icon="Bell" accent="#e69b33" hint="请及时处理" />
      <StatCard label="本月核销打卡" :value="stats.monthCheckins" suffix="次" icon="CircleCheck" accent="#4c86d8" hint="会员到店训练" />
      <StatCard label="待核验打卡" :value="stats.pendingCheckins" suffix="条" icon="Timer" accent="#dd6b60" hint="需要门店确认" />
    </section>

    <div class="dashboard-grid">
      <section class="panel-card trend-panel">
        <div class="panel-title">
          <div>
            <h2>近 7 天经营趋势</h2>
            <span>订单量与营业额变化</span>
          </div>
          <el-button text type="primary" @click="router.push('/provider/stats')">
            详细数据<el-icon><Right /></el-icon>
          </el-button>
        </div>
        <BaseChart :option="trendOption" height="290px" />
      </section>

      <section class="panel-card status-panel">
        <div class="panel-title">
          <div>
            <h2>订单状态分布</h2>
            <span>全部预约订单</span>
          </div>
        </div>
        <BaseChart :option="statusOption" height="210px" />
        <div class="status-legend">
          <div v-for="item in statusLegend" :key="item.status">
            <i :style="{ background: item.color }" />
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>
    </div>

    <div class="bottom-grid">
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>最近预约</h2>
            <span>及时确认新订单，提升会员体验</span>
          </div>
          <el-button text type="primary" @click="router.push('/provider/orders')">
            全部订单<el-icon><Right /></el-icon>
          </el-button>
        </div>
        <el-table :data="recentOrders" style="width: 100%">
          <el-table-column label="会员" min-width="100">
            <template #default="{ row }">
              <div class="user-cell">
                <span class="avatar mini">{{ (row.user_name || 'U').slice(0, 1) }}</span>
                <span>{{ row.user_name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="service_name" label="预约服务" min-width="150" show-overflow-tooltip />
          <el-table-column label="预约时间" min-width="145">
            <template #default="{ row }">{{ row.appointment_date }} {{ row.time_slot }}</template>
          </el-table-column>
          <el-table-column label="金额" width="90">
            <template #default="{ row }">{{ currency(row.amount) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
        </el-table>
      </section>

      <section class="panel-card rank-panel">
        <div class="panel-title">
          <div>
            <h2>服务销量排行</h2>
            <span>按已完成订单统计</span>
          </div>
        </div>
        <div class="rank-list">
          <div v-for="(item, index) in serviceSales" :key="item.id" class="rank-item">
            <span class="rank-no" :class="{ top: index < 3 }">{{ index + 1 }}</span>
            <div class="rank-main">
              <div class="rank-title">
                <strong>{{ item.name }}</strong>
                <span>{{ currency(item.revenue) }}</span>
              </div>
              <div class="rank-track">
                <i :style="{ width: `${rankPercent(item)}%` }" />
              </div>
              <small>{{ item.order_count }} 笔完成 · 累计销量 {{ item.sales }}</small>
            </div>
          </div>
          <el-empty v-if="!serviceSales.length" description="暂无销售数据" :image-size="70" />
        </div>
      </section>
    </div>

    <section class="quick-actions">
      <button v-for="item in quickActions" :key="item.path" @click="router.push(item.path)">
        <span class="quick-icon" :style="{ background: item.bg, color: item.color }">
          <el-icon><component :is="item.icon" /></el-icon>
        </span>
        <div><strong>{{ item.title }}</strong><span>{{ item.desc }}</span></div>
        <el-icon class="quick-arrow"><Right /></el-icon>
      </button>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import request from '../../api/request';
import { useAuthStore } from '../../stores/auth';
import StatCard from '../../components/StatCard.vue';
import BaseChart from '../../components/BaseChart.vue';
import StatusTag from '../../components/StatusTag.vue';
import { currency, providerStatusMap, orderStatusMap } from '../../utils/constants';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(true);
const provider = ref(null);
const trend = ref([]);
const serviceSales = ref([]);
const recentOrders = ref([]);
const orderStatus = ref([]);
const stats = reactive({
  todayOrders: 0,
  pendingOrders: 0,
  monthRevenue: 0,
  monthOrders: 0,
  monthCheckins: 0,
  rating: 5,
  reviewCount: 0,
  pendingCheckins: 0
});

const roleLabel = computed(() =>
  provider.value?.status === 'approved' ? 'PARTNER WORKSPACE · 营业中' : 'PARTNER WORKSPACE'
);

const quickActions = [
  { title: '处理预约', desc: '确认新订单与到店安排', path: '/provider/orders', icon: 'List', bg: '#eaf7f2', color: '#0f9f78' },
  { title: '核验打卡', desc: '审核会员到店训练记录', path: '/provider/checkins', icon: 'CircleCheck', bg: '#fff4e1', color: '#d9982c' },
  { title: '录入体测', desc: '更新学员身体数据档案', path: '/provider/body-tests', icon: 'DataAnalysis', bg: '#edf2fe', color: '#5a7ed1' },
  { title: '查看评价', desc: '回复会员真实反馈', path: '/provider/reviews', icon: 'ChatLineSquare', bg: '#f3effd', color: '#846ad2' }
];

const trendData = computed(() => {
  const map = new Map(trend.value.map((item) => [String(item.date).slice(0, 10), item]));
  const labels = [];
  const orders = [];
  const revenue = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
    orders.push(Number(map.get(key)?.orders || 0));
    revenue.push(Number(map.get(key)?.revenue || 0));
  }
  return { labels, orders, revenue };
});

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 0, right: 0, textStyle: { fontSize: 9, color: '#7e8e85' } },
  grid: { left: 8, right: 8, top: 34, bottom: 6, containLabel: true },
  xAxis: {
    type: 'category',
    data: trendData.value.labels,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#95a29b', fontSize: 9 }
  },
  yAxis: [
    {
      type: 'value',
      name: '订单',
      minInterval: 1,
      nameTextStyle: { fontSize: 8, color: '#a0aca6' },
      splitLine: { lineStyle: { color: '#f1f4f2' } },
      axisLabel: { fontSize: 9, color: '#95a29b' }
    },
    {
      type: 'value',
      name: '营业额',
      nameTextStyle: { fontSize: 8, color: '#a0aca6' },
      splitLine: { show: false },
      axisLabel: { fontSize: 9, color: '#95a29b' }
    }
  ],
  series: [
    {
      name: '订单量',
      type: 'bar',
      data: trendData.value.orders,
      barWidth: 15,
      itemStyle: {
        borderRadius: [6, 6, 2, 2],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#15a77f' },
            { offset: 1, color: '#b9e8d8' }
          ]
        }
      }
    },
    {
      name: '营业额',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      data: trendData.value.revenue,
      lineStyle: { width: 2, color: '#e0a43a' },
      itemStyle: { color: '#e0a43a' },
      symbolSize: 5
    }
  ]
}));

const statusLegend = computed(() =>
  ['pending', 'confirmed', 'completed', 'cancelled'].map((status) => ({
    status,
    label: orderStatusMap[status].label,
    value: Number(orderStatus.value.find((item) => item.status === status)?.total || 0),
    color: { pending: '#e2a63c', confirmed: '#4f86d8', completed: '#0f9f78', cancelled: '#a3aea8' }[status]
  }))
);

const statusOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'pie',
      radius: ['58%', '78%'],
      center: ['50%', '50%'],
      label: { show: false },
      data: statusLegend.value.map((item) => ({
        name: item.label,
        value: item.value,
        itemStyle: { color: item.color }
      }))
    }
  ]
}));

function rankPercent(item) {
  const max = Math.max(...serviceSales.value.map((entry) => Number(entry.order_count || 0)), 1);
  return Math.max((Number(item.order_count || 0) / max) * 100, 4);
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/provider/dashboard');
    provider.value = data.provider;
    auth.updateLocalUser({ provider: data.provider });
    Object.assign(stats, data.stats);
    trend.value = data.trend;
    serviceSales.value = data.serviceSales;
    recentOrders.value = data.recentOrders;
    orderStatus.value = data.orderStatus;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.provider-hero {
  border-radius: 22px;
  background:
    radial-gradient(circle at 84% 8%, rgba(111, 224, 193, 0.2), transparent 28%),
    linear-gradient(115deg, #0e2e23, #174d39 62%, #1c6248);
  color: #f0faf5;
  padding: 30px 34px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(12, 45, 32, 0.18);
}

.hero-left {
  max-width: 620px;
  position: relative;
  z-index: 2;
}

.hero-eyebrow {
  font-size: 8px;
  letter-spacing: 2.1px;
  color: #6fe0c1;
  font-weight: 700;
}

.hero-left h1 {
  font-size: 30px;
  margin: 12px 0 8px;
  letter-spacing: -1px;
}

.hero-left > p {
  font-size: 10px;
  line-height: 1.8;
  color: rgba(240, 250, 245, 0.52);
  max-width: 510px;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 14px;
}

.hero-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  color: rgba(240, 250, 245, 0.56);
}

.hero-meta span:last-child {
  color: #ffe19d;
}

.hero-right {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}

.status-pill {
  position: absolute;
  right: 0;
  top: -52px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 8px;
  border-radius: 99px;
  padding: 4px 9px;
  background: rgba(255, 255, 255, 0.09);
  color: rgba(255, 255, 255, 0.7);
}

.status-pill i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #a5b7ae;
}

.status-pill.approved i {
  background: #7bf0c9;
}

.status-pill.pending i {
  background: #ffc85e;
}

.status-pill.rejected i,
.status-pill.disabled i {
  background: #ff8c7d;
}

.hero-revenue {
  min-width: 150px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(8px);
}

.hero-revenue span {
  font-size: 8px;
  color: rgba(240, 250, 245, 0.48);
}

.hero-revenue strong {
  font-size: 27px;
  line-height: 1.2;
}

.hero-revenue small {
  font-size: 8px;
  color: rgba(240, 250, 245, 0.4);
}

.store-btn {
  background: #c8ec66;
  border: 0;
  color: #17321f;
  border-radius: 99px;
  height: 40px;
  padding: 0 18px;
}

.hero-ring {
  position: absolute;
  width: 340px;
  height: 340px;
  border: 1px solid rgba(111, 224, 193, 0.12);
  border-radius: 50%;
  right: -90px;
  bottom: -220px;
}

.status-alert {
  margin-top: 14px;
  border-radius: 12px;
}

.stat-grid {
  margin: 16px 0;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(290px, 0.7fr);
  gap: 16px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr);
  gap: 16px;
  margin-top: 16px;
}

.status-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 12px;
}

.status-legend div {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 8px;
  color: #7d8e85;
}

.status-legend i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-legend strong {
  margin-left: auto;
  color: var(--fitness-ink);
  font-size: 10px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
}

.avatar.mini {
  width: 27px;
  height: 27px;
  border-radius: 8px;
  font-size: 10px;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.rank-item {
  display: flex;
  gap: 9px;
}

.rank-no {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: #f1f5f3;
  color: #8b9a93;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}

.rank-no.top {
  background: #fff2d8;
  color: #c48a20;
}

.rank-main {
  flex: 1;
  min-width: 0;
}

.rank-title {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.rank-title strong {
  font-size: 9px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-title span {
  font-size: 9px;
  color: var(--fitness-primary-dark);
  font-weight: 700;
}

.rank-track {
  height: 4px;
  background: #f0f4f2;
  border-radius: 99px;
  margin: 5px 0 3px;
  overflow: hidden;
}

.rank-track i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #19a980, #8fd8c1);
}

.rank-main small {
  font-size: 7px;
  color: #9da9a3;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.quick-actions button {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 14px;
  padding: 13px;
  cursor: pointer;
  text-align: left;
  transition: transform 0.18s ease;
}

.quick-actions button:hover {
  transform: translateY(-2px);
}

.quick-icon {
  width: 35px;
  height: 35px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.quick-actions div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.quick-actions strong {
  font-size: 10px;
}

.quick-actions div span {
  font-size: 8px;
  color: #98a59e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-arrow {
  color: #b9c4be;
  font-size: 11px;
}

@media (max-width: 1100px) {
  .dashboard-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 800px) {
  .provider-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 25px 22px;
  }
  .hero-right {
    width: 100%;
  }
  .status-pill {
    display: none;
  }
  .hero-revenue {
    flex: 1;
  }
}

@media (max-width: 540px) {
  .quick-actions {
    grid-template-columns: 1fr;
  }
  .hero-right {
    flex-wrap: wrap;
  }
}
</style>
