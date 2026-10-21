<template>
  <div class="page user-home" v-loading="loading">
    <section class="welcome-hero">
      <div class="hero-content">
        <span class="hero-eyebrow">YOUR FITNESS JOURNEY</span>
        <h1>{{ greeting }}，{{ auth.displayName }}<br /><em>今天也要动起来。</em></h1>
        <p>把训练变成习惯，让数据见证改变。你已经完成 {{ stats.checkins }} 次打卡，累计运动 {{ stats.minutes }} 分钟。</p>
        <div class="hero-actions">
          <el-button class="hero-btn light" @click="router.push('/user/venues')">
            <el-icon><Compass /></el-icon>探索场馆
          </el-button>
          <el-button class="hero-btn ghost" @click="router.push('/user/checkins')">
            <el-icon><Medal /></el-icon>立即打卡
          </el-button>
        </div>
      </div>
      <div class="hero-side">
        <div class="points-orb">
          <span>FIT POINTS</span>
          <strong>{{ stats.points }}</strong>
          <small>可用积分</small>
        </div>
        <div class="hero-tip">
          <el-icon><Sunny /></el-icon>
          <div><strong>今日建议</strong><span>30 分钟中低强度有氧 + 10 分钟拉伸</span></div>
        </div>
      </div>
      <div class="hero-grid" />
      <div class="hero-ring" />
    </section>

    <section class="stat-grid home-stats">
      <StatCard label="待赴约" :value="stats.upcoming" suffix="场" icon="Calendar" accent="#0f9f78" hint="近期预约安排" />
      <StatCard label="本月打卡" :value="stats.checkins" suffix="次" icon="Medal" accent="#e49a2f" hint="坚持就是进步" />
      <StatCard label="消耗热量" :value="stats.calories" suffix="kcal" icon="Sunny" accent="#ef6b5d" hint="本月累计" />
      <StatCard label="我的收藏" :value="stats.favorites" suffix="项" icon="Star" accent="#6d7bda" hint="喜欢的服务" />
    </section>

    <div class="two-column">
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>最近预约</h2>
            <span>查看你的课程与服务安排</span>
          </div>
          <el-button text type="primary" @click="router.push('/user/appointments')">
            全部订单<el-icon><Right /></el-icon>
          </el-button>
        </div>
        <div v-if="recentOrders.length" class="order-list">
          <div v-for="order in recentOrders" :key="order.id" class="order-row">
            <div class="order-date">
              <strong>{{ dayOf(order.appointment_date) }}</strong>
              <span>{{ monthOf(order.appointment_date) }}</span>
            </div>
            <div class="order-main">
              <div class="order-title">
                <h3>{{ order.service_name }}</h3>
                <StatusTag :status="order.status" />
              </div>
              <p>{{ order.provider_name }} · {{ order.time_slot }}</p>
            </div>
            <span class="order-no">{{ order.appointment_no }}</span>
            <el-icon class="row-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
        <el-empty v-else description="还没有预约记录，去探索附近场馆吧" :image-size="90">
          <el-button type="primary" @click="router.push('/user/venues')">去看看</el-button>
        </el-empty>
      </section>

      <section class="panel-card activity-panel">
        <div class="panel-title">
          <div>
            <h2>近 7 天运动</h2>
            <span>每天一点，积累改变</span>
          </div>
          <span class="activity-total">{{ weekTotal }}<small> kcal</small></span>
        </div>
        <BaseChart :option="weekOption" height="235px" />
      </section>
    </div>

    <section class="quick-grid">
      <button v-for="action in quickActions" :key="action.path" class="quick-card" @click="router.push(action.path)">
        <span class="quick-icon" :style="{ background: action.bg, color: action.color }">
          <el-icon><component :is="action.icon" /></el-icon>
        </span>
        <span class="quick-copy">
          <strong>{{ action.title }}</strong>
          <small>{{ action.desc }}</small>
        </span>
        <el-icon class="quick-arrow"><Right /></el-icon>
      </button>
    </section>

    <section class="recommend-section">
      <div class="panel-title recommend-head">
        <div>
          <span class="section-eyebrow">CURATED FOR YOU</span>
          <h2>为你推荐</h2>
          <p>平台热门课程与服务，找到适合自己的训练方式</p>
        </div>
        <el-button text type="primary" @click="router.push('/user/venues')">
          浏览全部<el-icon><Right /></el-icon>
        </el-button>
      </div>
      <div class="grid-4">
        <ServiceCard
          v-for="service in recommend"
          :key="service.id"
          :service="service"
          @book="router.push(`/user/venues/${service.provider_id}`)"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import request from '../../api/request';
import StatCard from '../../components/StatCard.vue';
import StatusTag from '../../components/StatusTag.vue';
import BaseChart from '../../components/BaseChart.vue';
import ServiceCard from '../../components/ServiceCard.vue';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(true);
const recentOrders = ref([]);
const recommend = ref([]);
const week = ref([]);
const stats = reactive({
  upcoming: 0,
  checkins: 0,
  calories: 0,
  minutes: 0,
  favorites: 0,
  points: auth.user?.points || 0,
  unread: 0
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

const quickActions = [
  { title: '预约课程', desc: '挑选心仪场馆与教练', path: '/user/venues', icon: 'Compass', bg: '#e8f7f1', color: '#0f9f78' },
  { title: '运动打卡', desc: '记录今天的训练成果', path: '/user/checkins', icon: 'Medal', bg: '#fff5e3', color: '#d99123' },
  { title: '体测数据', desc: '查看身体指标变化', path: '/user/body-tests', icon: 'DataLine', bg: '#eef0ff', color: '#6675d8' },
  { title: '我的评价', desc: '分享真实健身体验', path: '/user/reviews', icon: 'ChatDotRound', bg: '#fdeeee', color: '#dd655a' }
];

function dayOf(date) {
  return String(Number(String(date).slice(8, 10))).padStart(2, '0');
}
function monthOf(date) {
  return `${Number(String(date).slice(5, 7))}月`;
}

const weekData = computed(() => {
  const map = new Map(week.value.map((item) => [String(item.checkin_date).slice(0, 10), item]));
  const labels = [];
  const calories = [];
  const counts = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    labels.push(['日', '一', '二', '三', '四', '五', '六'][date.getDay()]);
    const item = map.get(key);
    calories.push(Number(item?.calories || 0));
    counts.push(Number(item?.total || 0));
  }
  return { labels, calories, counts };
});

const weekTotal = computed(() => weekData.value.calories.reduce((sum, value) => sum + value, 0));

const weekOption = computed(() => ({
  grid: { left: 10, right: 12, top: 18, bottom: 6, containLabel: true },
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const index = params[0].dataIndex;
      return `周${weekData.value.labels[index]}<br/>运动 ${weekData.value.counts[index]} 次<br/>消耗 ${weekData.value.calories[index]} kcal`;
    }
  },
  xAxis: {
    type: 'category',
    data: weekData.value.labels.map((item) => `周${item}`),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#94a29b', fontSize: 10 }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f0f4f2' } },
    axisLabel: { color: '#a2aea8', fontSize: 9 }
  },
  series: [
    {
      type: 'bar',
      data: weekData.value.calories,
      barWidth: 18,
      itemStyle: {
        borderRadius: [8, 8, 2, 2],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#0fa27b' },
            { offset: 1, color: '#bde8d9' }
          ]
        }
      }
    }
  ]
}));

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/user/dashboard');
    Object.assign(stats, data.stats);
    recentOrders.value = data.recentOrders;
    recommend.value = data.recommend;
    week.value = data.week;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.welcome-hero {
  min-height: 286px;
  border-radius: 24px;
  padding: 38px 42px;
  color: #f2faf6;
  display: flex;
  justify-content: space-between;
  gap: 30px;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(100deg, rgba(5, 27, 19, 0.97) 2%, rgba(9, 43, 31, 0.82) 54%, rgba(8, 34, 24, 0.44)),
    url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80')
      center 45% / cover;
  box-shadow: 0 24px 50px rgba(12, 45, 32, 0.2);
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 600px;
}

.hero-eyebrow {
  font-size: 9px;
  letter-spacing: 2.6px;
  color: var(--fitness-lime);
  font-weight: 700;
}

.hero-content h1 {
  margin: 17px 0 14px;
  font-size: clamp(30px, 3.4vw, 44px);
  line-height: 1.22;
  letter-spacing: -1.7px;
}

.hero-content h1 em {
  color: var(--fitness-lime);
  font-style: normal;
}

.hero-content p {
  font-size: 12px;
  line-height: 1.8;
  color: rgba(242, 250, 246, 0.62);
  max-width: 470px;
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

.hero-btn {
  border-radius: 99px;
  height: 42px;
  padding: 0 20px;
  border: 0;
  font-size: 12px;
}

.hero-btn.light {
  background: var(--fitness-lime);
  color: #15301e;
}

.hero-btn.ghost {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
}

.hero-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}

.points-orb {
  width: 138px;
  height: 138px;
  border-radius: 50%;
  border: 1px solid rgba(200, 236, 102, 0.32);
  background: rgba(10, 38, 26, 0.42);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 40px rgba(200, 236, 102, 0.08);
}

.points-orb span {
  font-size: 7px;
  letter-spacing: 1.8px;
  color: var(--fitness-lime);
}

.points-orb strong {
  font-size: 38px;
  line-height: 1.1;
  margin: 4px 0 1px;
}

.points-orb small {
  font-size: 9px;
  color: rgba(242, 250, 246, 0.5);
}

.hero-tip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 10px 14px;
  backdrop-filter: blur(8px);
}

.hero-tip .el-icon {
  color: var(--fitness-lime);
  font-size: 19px;
}

.hero-tip div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hero-tip strong {
  font-size: 10px;
}

.hero-tip span {
  font-size: 8px;
  color: rgba(242, 250, 246, 0.48);
}

.hero-grid {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: linear-gradient(90deg, black, transparent 70%);
}

.hero-ring {
  position: absolute;
  width: 310px;
  height: 310px;
  border-radius: 50%;
  border: 1px solid rgba(200, 236, 102, 0.12);
  right: -80px;
  bottom: -140px;
}

.home-stats {
  margin-top: 18px;
}

.order-list {
  display: flex;
  flex-direction: column;
}

.order-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 2px;
  border-bottom: 1px solid #f0f4f2;
  cursor: default;
}

.order-row:last-child {
  border-bottom: 0;
}

.order-date {
  width: 47px;
  height: 47px;
  border-radius: 12px;
  background: #f2f8f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.order-date strong {
  font-size: 17px;
  line-height: 1;
}

.order-date span {
  font-size: 8px;
  color: #8b9a93;
  margin-top: 3px;
}

.order-main {
  flex: 1;
  min-width: 0;
}

.order-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-title h3 {
  font-size: 13px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-main p {
  font-size: 10px;
  color: #92a098;
  margin: 5px 0 0;
}

.order-no {
  font-size: 9px;
  color: #a8b3ae;
  font-family: monospace;
}

.row-arrow {
  color: #b3beb9;
}

.activity-total {
  font-size: 22px;
  font-weight: 800;
  color: var(--fitness-primary-dark);
}

.activity-total small {
  font-size: 9px;
  font-weight: 500;
  color: #8f9c96;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin: 18px 0 26px;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 16px;
  padding: 15px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  box-shadow: 0 6px 18px rgba(18, 50, 40, 0.04);
}

.quick-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--fitness-shadow);
}

.quick-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 18px;
  flex-shrink: 0;
}

.quick-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.quick-copy strong {
  font-size: 12px;
}

.quick-copy small {
  font-size: 9px;
  color: #96a39c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-arrow {
  color: #b4bfb9;
  font-size: 12px;
}

.recommend-head {
  align-items: flex-end;
  margin-bottom: 16px;
}

.recommend-head h2 {
  font-size: 21px;
  margin: 5px 0 4px;
}

.recommend-head p {
  margin: 0;
  font-size: 11px;
  color: #8e9c95;
}

.section-eyebrow {
  color: var(--fitness-primary);
  font-size: 8px;
  letter-spacing: 2px;
  font-weight: 700;
}

@media (max-width: 1200px) {
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 800px) {
  .welcome-hero {
    padding: 28px 24px;
    min-height: 260px;
  }
  .hero-side {
    display: none;
  }
  .hero-content h1 {
    font-size: 30px;
  }
}

@media (max-width: 560px) {
  .quick-grid {
    grid-template-columns: 1fr;
  }
  .order-no {
    display: none;
  }
}
</style>
