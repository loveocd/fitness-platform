<template>
  <div class="page" v-loading="loading">
    <PageHeader title="平台数据" subtitle="从用户、服务商、订单与打卡维度观察平台整体运营状况">
      <el-radio-group v-model="days" @change="load">
        <el-radio-button :value="7">近 7 天</el-radio-button>
        <el-radio-button :value="30">近 30 天</el-radio-button>
        <el-radio-button :value="90">近 90 天</el-radio-button>
      </el-radio-group>
    </PageHeader>

    <section class="stat-grid">
      <StatCard label="平台会员" :value="Number(totals.total_users || 0)" suffix="人" icon="User" accent="#0f9f78" hint="累计注册会员" />
      <StatCard label="营业服务商" :value="Number(totals.total_providers || 0)" suffix="家" icon="OfficeBuilding" accent="#4f83d3" hint="已通过审核" />
      <StatCard label="平台订单" :value="Number(totals.total_orders || 0)" suffix="单" icon="DocumentChecked" accent="#dc9b2e" :hint="`近 ${days} 天`" />
      <StatCard label="完成营收" :value="Number(totals.total_revenue || 0)" suffix="元" icon="Money" accent="#8a6bd3" :hint="`近 ${days} 天已完成`" />
    </section>

    <div class="chart-grid">
      <section class="panel-card trend-panel">
        <div class="panel-title">
          <div>
            <h2>平台订单与营收趋势</h2>
            <span>按预约日期统计全部订单</span>
          </div>
          <span class="trend-total">{{ currency(totals.total_revenue) }}</span>
        </div>
        <BaseChart :option="trendOption" height="320px" />
      </section>
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>服务品类表现</h2>
            <span>完成订单营收分布</span>
          </div>
        </div>
        <BaseChart :option="categoryOption" height="260px" />
        <div class="category-list">
          <div v-for="(item, index) in categoryStats.slice(0, 5)" :key="item.name">
            <span class="dot" :style="{ background: palette[index % palette.length] }" />
            <span>{{ item.name }}</span>
            <strong>{{ currency(item.revenue) }}</strong>
          </div>
        </div>
      </section>
    </div>

    <div class="chart-grid bottom">
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>打卡活跃趋势</h2>
            <span>每日打卡次数与消耗热量</span>
          </div>
        </div>
        <BaseChart :option="checkinOption" height="300px" />
      </section>
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>订单状态构成</h2>
            <span>所选周期内订单分布</span>
          </div>
        </div>
        <BaseChart :option="statusOption" height="230px" />
        <div class="status-legend">
          <div v-for="item in statusLegend" :key="item.status">
            <i :style="{ background: item.color }" />
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>
    </div>

    <section class="panel-card table-panel">
      <div class="panel-title">
        <div>
          <h2>服务商经营排行</h2>
          <span>所选周期内完成订单营收 Top 10</span>
        </div>
        <span class="period-label">近 {{ days }} 天</span>
      </div>
      <el-table :data="topProviders" style="width: 100%">
        <el-table-column type="index" label="排名" width="70" />
        <el-table-column label="服务商" min-width="220">
          <template #default="{ row }">
            <div class="provider-cell">
              <span class="provider-avatar">{{ row.name.slice(0, 1) }}</span>
              <div><strong>{{ row.name }}</strong><span>评分 {{ row.rating }} 分</span></div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="订单数" width="100">
          <template #default="{ row }">{{ row.orders }} 单</template>
        </el-table-column>
        <el-table-column label="完成营收" width="140">
          <template #default="{ row }"><strong class="revenue">{{ currency(row.revenue) }}</strong></template>
        </el-table-column>
        <el-table-column label="营收占比" min-width="220">
          <template #default="{ row }">
            <div class="share-cell">
              <div class="share-track"><i :style="{ width: `${sharePercent(row)}%` }" /></div>
              <span>{{ sharePercent(row) }}%</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import StatCard from '../../components/StatCard.vue';
import BaseChart from '../../components/BaseChart.vue';
import { currency, orderStatusMap } from '../../utils/constants';

const loading = ref(false);
const days = ref(30);
const trend = ref([]);
const categoryStats = ref([]);
const topProviders = ref([]);
const userRoles = ref([]);
const orderStatus = ref([]);
const checkinTrend = ref([]);
const totals = ref({});
const palette = ['#0f9f78', '#64c9a8', '#e0ac45', '#6d84d6', '#ec7e6c', '#9b7bd6'];

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 0, right: 0, textStyle: { fontSize: 9, color: '#7e8e85' } },
  grid: { left: 8, right: 10, top: 36, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category',
    data: trend.value.map((item) => String(item.date).slice(5)),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontSize: 9, color: '#95a29b', interval: days.value > 30 ? 6 : 'auto' }
  },
  yAxis: [
    {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f4f2' } },
      axisLabel: { fontSize: 9, color: '#95a29b' }
    },
    {
      type: 'value',
      minInterval: 1,
      splitLine: { show: false },
      axisLabel: { fontSize: 9, color: '#95a29b' }
    }
  ],
  series: [
    {
      name: '营收',
      type: 'line',
      smooth: true,
      data: trend.value.map((item) => Number(item.revenue)),
      lineStyle: { width: 2.5, color: '#0f9f78' },
      itemStyle: { color: '#0f9f78' },
      symbolSize: 4,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(15,159,120,.18)' },
            { offset: 1, color: 'rgba(15,159,120,0)' }
          ]
        }
      }
    },
    {
      name: '订单量',
      type: 'bar',
      yAxisIndex: 1,
      data: trend.value.map((item) => Number(item.orders)),
      barWidth: 9,
      itemStyle: { color: '#c6e8db', borderRadius: [4, 4, 1, 1] }
    }
  ]
}));

const categoryOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}<br/>营收 ¥{c} ({d}%)' },
  color: palette,
  series: [
    {
      type: 'pie',
      radius: ['46%', '70%'],
      center: ['50%', '50%'],
      label: { show: false },
      data: categoryStats.value.map((item) => ({ name: item.name, value: Number(item.revenue) }))
    }
  ]
}));

const checkinOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 0, right: 0, textStyle: { fontSize: 9, color: '#7e8e85' } },
  grid: { left: 8, right: 10, top: 34, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category',
    data: checkinTrend.value.map((item) => String(item.date).slice(5)),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontSize: 9, color: '#95a29b', interval: days.value > 30 ? 6 : 'auto' }
  },
  yAxis: [
    {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f4f2' } },
      axisLabel: { fontSize: 9, color: '#95a29b' }
    },
    {
      type: 'value',
      splitLine: { show: false },
      axisLabel: { fontSize: 9, color: '#95a29b' }
    }
  ],
  series: [
    {
      name: '打卡次数',
      type: 'bar',
      data: checkinTrend.value.map((item) => Number(item.checkins)),
      barWidth: 12,
      itemStyle: { color: '#0f9f78', borderRadius: [5, 5, 2, 2] }
    },
    {
      name: '消耗热量',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      data: checkinTrend.value.map((item) => Number(item.calories)),
      lineStyle: { width: 2, color: '#e0a73c' },
      itemStyle: { color: '#e0a73c' },
      symbolSize: 3
    }
  ]
}));

const statusLegend = computed(() =>
  ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'].map((status) => ({
    status,
    label: orderStatusMap[status].label,
    value: Number(orderStatus.value.find((item) => item.status === status)?.total || 0),
    color: { pending: '#e2a63c', confirmed: '#4f86d8', completed: '#0f9f78', cancelled: '#a1ada7', refunded: '#db6b60' }[status]
  }))
);

const statusOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'pie',
      radius: ['55%', '76%'],
      label: { show: false },
      data: statusLegend.value.map((item) => ({
        name: item.label,
        value: item.value,
        itemStyle: { color: item.color }
      }))
    }
  ]
}));

function sharePercent(row) {
  const total = Number(totals.value.total_revenue || 0);
  return total ? Math.round((Number(row.revenue || 0) / total) * 100) : 0;
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/admin/stats/platform', { params: { days: days.value } });
    trend.value = data.trend;
    categoryStats.value = data.categoryStats;
    topProviders.value = data.topProviders;
    userRoles.value = data.userRoles;
    orderStatus.value = data.orderStatus;
    checkinTrend.value = data.checkinTrend;
    totals.value = data.totals;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.7fr);
  gap: 16px;
  margin-top: 16px;
}

.chart-grid.bottom {
  grid-template-columns: 1fr 1fr;
}

.trend-total {
  font-size: 20px;
  font-weight: 800;
  color: var(--fitness-primary-dark);
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.category-list div {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 8px;
  color: #7f8f87;
}

.category-list .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.category-list strong {
  margin-left: auto;
  color: var(--fitness-ink);
  font-size: 9px;
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
  color: #7f8f87;
}

.status-legend i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-legend strong {
  margin-left: auto;
  font-size: 10px;
  color: var(--fitness-ink);
}

.table-panel {
  margin-top: 16px;
}

.period-label {
  font-size: 8px;
  color: #8d9b94;
  background: #f3f7f5;
  border-radius: 99px;
  padding: 4px 9px;
}

.provider-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-avatar {
  width: 31px;
  height: 31px;
  border-radius: 9px;
  background: #e5f5ee;
  color: #197c5f;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
}

.provider-cell div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-cell strong {
  font-size: 10px;
}

.provider-cell span {
  font-size: 7px;
  color: #98a59e;
}

.revenue {
  color: var(--fitness-primary-dark);
  font-size: 11px;
}

.share-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.share-track {
  flex: 1;
  height: 5px;
  background: #f0f4f2;
  border-radius: 99px;
  overflow: hidden;
}

.share-track i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #19a980, #92dbc4);
}

.share-cell span {
  width: 28px;
  font-size: 8px;
  color: #7f9087;
}

@media (max-width: 1100px) {
  .chart-grid,
  .chart-grid.bottom {
    grid-template-columns: 1fr;
  }
}
</style>
