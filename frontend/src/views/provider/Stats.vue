<template>
  <div class="page" v-loading="loading">
    <PageHeader title="营业数据" subtitle="从订单、营收、客户和项目维度全面了解门店经营表现">
      <el-radio-group v-model="days" @change="load">
        <el-radio-button :value="7">近 7 天</el-radio-button>
        <el-radio-button :value="30">近 30 天</el-radio-button>
        <el-radio-button :value="90">近 90 天</el-radio-button>
      </el-radio-group>
    </PageHeader>

    <section class="stat-grid">
      <StatCard
        label="完成订单营收"
        :value="Number(totals.revenue || 0)"
        suffix="元"
        icon="Money"
        accent="#0f9f78"
        hint="仅统计已完成订单"
      />
      <StatCard
        label="完成订单数"
        :value="Number(totals.orders || 0)"
        suffix="单"
        icon="DocumentChecked"
        accent="#4f83d3"
        hint="所选周期内"
      />
      <StatCard
        label="客单价"
        :value="Number(totals.avg_amount || 0).toFixed(0)"
        suffix="元"
        icon="Wallet"
        accent="#dc9b2e"
        hint="平均每笔完成订单"
      />
      <StatCard
        label="成交会员"
        :value="Number(customerStats.total_users || 0)"
        suffix="人"
        icon="User"
        accent="#8a6bd3"
        :hint="`复购会员 ${customerStats.returning_users || 0} 人`"
      />
    </section>

    <div class="chart-grid">
      <section class="panel-card trend-panel">
        <div class="panel-title">
          <div>
            <h2>营收与订单趋势</h2>
            <span>按预约日期统计</span>
          </div>
          <span class="chart-total">{{ currency(totals.revenue) }}</span>
        </div>
        <BaseChart :option="trendOption" height="310px" />
      </section>
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>服务分类营收</h2>
            <span>各分类完成订单占比</span>
          </div>
        </div>
        <BaseChart :option="categoryOption" height="310px" />
      </section>
    </div>

    <div class="chart-grid bottom">
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>项目营收排行</h2>
            <span>Top 10 服务项目</span>
          </div>
        </div>
        <BaseChart :option="rankOption" height="310px" />
      </section>
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>预约时段分布</h2>
            <span>会员更偏好的到店时段</span>
          </div>
        </div>
        <BaseChart :option="hourOption" height="310px" />
      </section>
    </div>

    <section class="panel-card table-panel">
      <div class="panel-title">
        <div>
          <h2>服务经营明细</h2>
          <span>按完成订单营收排序</span>
        </div>
        <span class="period-label">统计周期：近 {{ days }} 天</span>
      </div>
      <el-table :data="serviceRank" style="width: 100%">
        <el-table-column type="index" label="排名" width="65" />
        <el-table-column prop="name" label="服务名称" min-width="200" />
        <el-table-column prop="sales" label="累计销量" width="100" />
        <el-table-column label="本期订单" width="100">
          <template #default="{ row }">{{ row.orders }} 单</template>
        </el-table-column>
        <el-table-column label="本期营收" width="130">
          <template #default="{ row }"><strong class="revenue">{{ currency(row.revenue) }}</strong></template>
        </el-table-column>
        <el-table-column label="营收占比" min-width="200">
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
import { currency } from '../../utils/constants';

const loading = ref(false);
const days = ref(30);
const trend = ref([]);
const categoryStats = ref([]);
const serviceRank = ref([]);
const statusStats = ref([]);
const customerStats = ref({});
const hourStats = ref([]);
const totals = ref({});

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 0, right: 0, textStyle: { fontSize: 9, color: '#7e8e85' } },
  grid: { left: 8, right: 10, top: 36, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category',
    data: trend.value.map((item) => String(item.date).slice(5)),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#95a29b', fontSize: 9, interval: days.value > 30 ? 6 : 'auto' }
  },
  yAxis: [
    {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f4f2' } },
      axisLabel: { color: '#95a29b', fontSize: 9 }
    },
    {
      type: 'value',
      minInterval: 1,
      splitLine: { show: false },
      axisLabel: { color: '#95a29b', fontSize: 9 }
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
  legend: {
    bottom: 0,
    left: 'center',
    textStyle: { fontSize: 8, color: '#7e8e85' },
    itemWidth: 8,
    itemHeight: 8
  },
  color: ['#0f9f78', '#64c9a8', '#e0ac45', '#6d84d6', '#ec7e6c', '#9b7bd6'],
  series: [
    {
      type: 'pie',
      radius: ['42%', '66%'],
      center: ['50%', '44%'],
      label: { show: false },
      data: categoryStats.value.map((item) => ({ name: item.name, value: Number(item.revenue) }))
    }
  ]
}));

const rankOption = computed(() => {
  const sorted = [...serviceRank.value].reverse();
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 18, top: 10, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f4f2' } },
      axisLabel: { fontSize: 8, color: '#95a29b' }
    },
    yAxis: {
      type: 'category',
      data: sorted.map((item) => item.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 8, color: '#667a70', width: 100, overflow: 'truncate' }
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((item) => Number(item.revenue)),
        barWidth: 12,
        itemStyle: {
          borderRadius: [0, 5, 5, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#a5dfcb' },
              { offset: 1, color: '#0f9f78' }
            ]
          }
        }
      }
    ]
  };
});

const hourOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 8, right: 10, top: 18, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category',
    data: hourStats.value.map((item) => item.hour),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontSize: 8, color: '#95a29b' }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f1f4f2' } },
    axisLabel: { fontSize: 8, color: '#95a29b' }
  },
  series: [
    {
      type: 'bar',
      data: hourStats.value.map((item) => Number(item.total)),
      barWidth: 16,
      itemStyle: {
        borderRadius: [7, 7, 2, 2],
        color: '#e2b255'
      }
    }
  ]
}));

function sharePercent(row) {
  const total = Number(totals.value.revenue || 0);
  return total ? Math.round((Number(row.revenue || 0) / total) * 100) : 0;
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/provider/stats/business', { params: { days: days.value } });
    trend.value = data.trend;
    categoryStats.value = data.categoryStats;
    serviceRank.value = data.serviceRank;
    statusStats.value = data.statusStats;
    customerStats.value = data.customerStats;
    hourStats.value = data.hourStats;
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

.chart-total {
  font-size: 20px;
  font-weight: 800;
  color: var(--fitness-primary-dark);
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
  font-size: 8px;
  color: #7f9087;
  width: 28px;
}

@media (max-width: 1100px) {
  .chart-grid,
  .chart-grid.bottom {
    grid-template-columns: 1fr;
  }
}
</style>
