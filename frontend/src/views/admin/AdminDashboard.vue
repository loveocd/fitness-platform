<template>
  <div class="page" v-loading="loading">
    <section class="admin-hero">
      <div class="hero-copy">
        <span class="hero-eyebrow">PLATFORM CONTROL CENTER</span>
        <h1>平台运营总览</h1>
        <p>连接会员与优质健身服务商，用数据驱动平台运营，用审核保障服务品质。</p>
        <div class="hero-badges">
          <span><el-icon><User /></el-icon>{{ stats.users }} 位会员</span>
          <span><el-icon><OfficeBuilding /></el-icon>{{ stats.providers }} 家营业场馆</span>
          <span><el-icon><Medal /></el-icon>本周 {{ stats.weekCheckins }} 次打卡</span>
        </div>
      </div>
      <div class="hero-actions">
        <button class="audit-card" @click="router.push('/admin/providers')">
          <span class="audit-icon"><el-icon><OfficeBuilding /></el-icon></span>
          <div>
            <span>待审核入驻</span>
            <strong>{{ stats.pendingProviders }}</strong>
            <small>及时处理服务商申请</small>
          </div>
          <el-icon><Right /></el-icon>
        </button>
        <button class="audit-card review" @click="router.push('/admin/reviews')">
          <span class="audit-icon"><el-icon><ChatDotRound /></el-icon></span>
          <div>
            <span>待审核评价</span>
            <strong>{{ stats.pendingReviews }}</strong>
            <small>维护真实评价环境</small>
          </div>
          <el-icon><Right /></el-icon>
        </button>
      </div>
      <div class="hero-grid" />
    </section>

    <section class="stat-grid admin-stats">
      <StatCard label="平台会员" :value="stats.users" suffix="人" icon="User" accent="#0f9f78" hint="普通会员账号" />
      <StatCard label="服务商" :value="stats.providers" suffix="家" icon="OfficeBuilding" accent="#4f83d3" hint="已通过审核" />
      <StatCard label="本月营收" :value="stats.monthRevenue" suffix="元" icon="Money" accent="#dc9b2e" hint="已完成订单" />
      <StatCard label="今日订单" :value="stats.todayOrders" suffix="单" icon="DocumentChecked" accent="#8a6bd3" hint="今日新增预约" />
    </section>

    <div class="dashboard-grid">
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>平台近期趋势</h2>
            <span>订单、营收与新增会员</span>
          </div>
          <el-button text type="primary" @click="router.push('/admin/stats')">
            平台数据<el-icon><Right /></el-icon>
          </el-button>
        </div>
        <BaseChart :option="trendOption" height="300px" />
      </section>

      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>服务品类分布</h2>
            <span>各分类服务与订单量</span>
          </div>
        </div>
        <BaseChart :option="categoryOption" height="240px" />
        <div class="category-list">
          <div v-for="(item, index) in categoryStats.slice(0, 4)" :key="item.name">
            <span class="cat-dot" :style="{ background: palette[index] }" />
            <span>{{ item.name }}</span>
            <strong>{{ item.order_count }} 单</strong>
          </div>
        </div>
      </section>
    </div>

    <div class="bottom-grid">
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>服务商营收排行</h2>
            <span>平台累计完成订单营收</span>
          </div>
          <el-button text type="primary" @click="router.push('/admin/providers')">
            服务商管理<el-icon><Right /></el-icon>
          </el-button>
        </div>
        <div class="provider-rank">
          <div v-for="(item, index) in topProviders" :key="item.id" class="rank-row">
            <span class="rank-index" :class="{ top: index < 3 }">{{ index + 1 }}</span>
            <div class="rank-avatar">{{ item.name.slice(0, 1) }}</div>
            <div class="rank-info">
              <strong>{{ item.name }}</strong>
              <span>{{ item.orders }} 笔订单 · {{ item.rating }} 分</span>
            </div>
            <strong class="rank-revenue">{{ currency(item.revenue) }}</strong>
          </div>
          <el-empty v-if="!topProviders.length" description="暂无经营数据" :image-size="70" />
        </div>
      </section>

      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>待审核入驻</h2>
            <span>按提交时间排序</span>
          </div>
        </div>
        <div class="application-list">
          <div v-for="item in recentApplications" :key="item.id" class="application-row">
            <span class="app-avatar">{{ item.name.slice(0, 1) }}</span>
            <div class="app-info">
              <strong>{{ item.name }}</strong>
              <span>{{ item.owner_name }} · {{ item.owner_phone }}</span>
              <small><el-icon><Location /></el-icon>{{ item.address || '地址待完善' }}</small>
            </div>
            <el-button size="small" type="primary" plain @click="router.push('/admin/providers')">审核</el-button>
          </div>
          <el-empty v-if="!recentApplications.length" description="暂无待审核申请" :image-size="70" />
        </div>
      </section>
    </div>

    <section class="quick-grid">
      <button v-for="item in quickActions" :key="item.path" @click="router.push(item.path)">
        <span class="quick-icon" :style="{ background: item.bg, color: item.color }">
          <el-icon><component :is="item.icon" /></el-icon>
        </span>
        <div><strong>{{ item.title }}</strong><span>{{ item.desc }}</span></div>
        <el-icon><Right /></el-icon>
      </button>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import request from '../../api/request';
import StatCard from '../../components/StatCard.vue';
import BaseChart from '../../components/BaseChart.vue';
import { currency } from '../../utils/constants';

const router = useRouter();
const loading = ref(true);
const trend = ref([]);
const categoryStats = ref([]);
const topProviders = ref([]);
const recentApplications = ref([]);
const stats = reactive({
  users: 0,
  providers: 0,
  pendingProviders: 0,
  todayOrders: 0,
  monthRevenue: 0,
  monthOrders: 0,
  pendingReviews: 0,
  weekCheckins: 0,
  weekCalories: 0,
  activeUsers: 0
});
const palette = ['#0f9f78', '#64c9a8', '#e0ac45', '#6d84d6', '#ec7e6c', '#9b7bd6'];

const quickActions = [
  { title: '用户账号管理', desc: '查看会员与服务商账号状态', path: '/admin/users', icon: 'User', bg: '#eaf7f2', color: '#0f9f78' },
  { title: '订单监管', desc: '处理异常订单与退款申请', path: '/admin/orders', icon: 'DocumentChecked', bg: '#edf2fe', color: '#557cd0' },
  { title: '服务分类配置', desc: '维护平台服务分类体系', path: '/admin/categories', icon: 'Grid', bg: '#fff4e2', color: '#d9982e' },
  { title: '打卡规则配置', desc: '设置积分与核验规则', path: '/admin/checkin-rules', icon: 'SetUp', bg: '#f3effd', color: '#846bd2' }
];

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 0, right: 0, textStyle: { fontSize: 9, color: '#7e8e85' } },
  grid: { left: 8, right: 8, top: 36, bottom: 6, containLabel: true },
  xAxis: {
    type: 'category',
    data: trend.value.map((item) => String(item.date).slice(5)),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { fontSize: 9, color: '#95a29b' }
  },
  yAxis: [
    {
      type: 'value',
      minInterval: 1,
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
      name: '订单量',
      type: 'bar',
      data: trend.value.map((item) => Number(item.orders)),
      barWidth: 14,
      itemStyle: {
        borderRadius: [6, 6, 2, 2],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#13a07a' },
            { offset: 1, color: '#c3e8db' }
          ]
        }
      }
    },
    {
      name: '新增会员',
      type: 'line',
      data: trend.value.map((item) => Number(item.new_users)),
      smooth: true,
      lineStyle: { width: 2, color: '#e1ad47' },
      itemStyle: { color: '#e1ad47' },
      symbolSize: 4
    },
    {
      name: '营收',
      type: 'line',
      yAxisIndex: 1,
      data: trend.value.map((item) => Number(item.revenue)),
      smooth: true,
      lineStyle: { width: 1.5, type: 'dashed', color: '#6c83d7' },
      itemStyle: { color: '#6c83d7' },
      symbolSize: 3
    }
  ]
}));

const categoryOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}<br/>订单 {c} 单 ({d}%)' },
  color: palette,
  series: [
    {
      type: 'pie',
      radius: ['48%', '72%'],
      center: ['50%', '50%'],
      label: { show: false },
      data: categoryStats.value.map((item) => ({ name: item.name, value: Number(item.order_count) }))
    }
  ]
}));

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/admin/dashboard');
    Object.assign(stats, data.stats);
    trend.value = data.trend;
    categoryStats.value = data.categoryStats;
    topProviders.value = data.topProviders;
    recentApplications.value = data.recentApplications;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.admin-hero {
  border-radius: 22px;
  background:
    radial-gradient(circle at 88% 12%, rgba(241, 201, 107, 0.17), transparent 25%),
    linear-gradient(112deg, #1b211b, #263128 62%, #314232);
  color: #f6f8f3;
  padding: 30px 34px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(24, 34, 25, 0.2);
}

.hero-copy {
  position: relative;
  z-index: 2;
  max-width: 560px;
}

.hero-eyebrow {
  font-size: 8px;
  letter-spacing: 2.2px;
  color: #f1c96b;
  font-weight: 700;
}

.hero-copy h1 {
  font-size: 30px;
  margin: 12px 0 8px;
  letter-spacing: -1px;
}

.hero-copy p {
  font-size: 10px;
  line-height: 1.8;
  color: rgba(246, 248, 243, 0.53);
  margin: 0;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.hero-badges span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  color: rgba(246, 248, 243, 0.58);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 99px;
  padding: 5px 9px;
}

.hero-actions {
  display: flex;
  gap: 10px;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}

.audit-card {
  min-width: 195px;
  display: flex;
  align-items: center;
  gap: 11px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 13px;
  color: #f6f8f3;
  cursor: pointer;
  text-align: left;
  backdrop-filter: blur(8px);
}

.audit-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(241, 201, 107, 0.16);
  color: #f1c96b;
  display: grid;
  place-items: center;
  font-size: 17px;
  flex-shrink: 0;
}

.audit-card.review .audit-icon {
  background: rgba(111, 224, 193, 0.14);
  color: #6fe0c1;
}

.audit-card div {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.audit-card div span {
  font-size: 8px;
  color: rgba(246, 248, 243, 0.5);
}

.audit-card strong {
  font-size: 23px;
  line-height: 1.1;
}

.audit-card small {
  font-size: 7px;
  color: rgba(246, 248, 243, 0.36);
}

.audit-card > .el-icon {
  color: rgba(246, 248, 243, 0.35);
  font-size: 11px;
}

.hero-grid {
  position: absolute;
  inset: 0;
  opacity: 0.32;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(90deg, black, transparent 70%);
}

.admin-stats {
  margin: 16px 0;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.7fr);
  gap: 16px;
}

.category-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 12px;
}

.category-list div {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 8px;
  color: #7f8f87;
}

.cat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.category-list strong {
  margin-left: auto;
  color: var(--fitness-ink);
  font-size: 9px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.provider-rank,
.application-list {
  display: flex;
  flex-direction: column;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f4f2;
}

.rank-row:last-child {
  border-bottom: 0;
}

.rank-index {
  width: 18px;
  font-size: 9px;
  color: #9aa7a0;
  font-weight: 700;
}

.rank-index.top {
  color: #d09a2c;
}

.rank-avatar {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: #e5f5ee;
  color: #197c5f;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
}

.rank-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rank-info strong {
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-info span {
  font-size: 7px;
  color: #98a59e;
}

.rank-revenue {
  font-size: 11px;
  color: var(--fitness-primary-dark);
}

.application-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f4f2;
}

.application-row:last-child {
  border-bottom: 0;
}

.app-avatar {
  width: 33px;
  height: 33px;
  border-radius: 9px;
  background: #fff4e2;
  color: #c88d24;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
}

.app-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.app-info strong {
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-info span {
  font-size: 7px;
  color: #8e9c95;
}

.app-info small {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 7px;
  color: #a0aca6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.quick-grid button {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 13px;
  padding: 13px;
  cursor: pointer;
  text-align: left;
}

.quick-icon {
  width: 35px;
  height: 35px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}

.quick-grid button div {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.quick-grid strong {
  font-size: 10px;
}

.quick-grid div span {
  font-size: 8px;
  color: #98a59e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-grid button > .el-icon {
  color: #bcc7c1;
  font-size: 11px;
}

@media (max-width: 1150px) {
  .admin-hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .dashboard-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .admin-hero {
    padding: 25px 20px;
  }
  .hero-actions {
    width: 100%;
    flex-direction: column;
  }
  .audit-card {
    width: 100%;
  }
  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
