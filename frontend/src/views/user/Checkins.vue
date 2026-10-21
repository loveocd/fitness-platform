<template>
  <div class="page">
    <PageHeader title="健身打卡" subtitle="记录每一次训练，用积分见证坚持的力量">
      <el-date-picker
        v-model="month"
        type="month"
        value-format="YYYY-MM"
        :clearable="false"
        style="width: 150px"
        @change="load"
      />
    </PageHeader>

    <section class="stat-grid">
      <StatCard label="打卡次数" :value="Number(stats.total_checkins || 0)" suffix="次" icon="Medal" accent="#0f9f78" hint="本月累计" />
      <StatCard label="运动时长" :value="Number(stats.total_minutes || 0)" suffix="分钟" icon="Timer" accent="#3e7fd6" hint="本月累计" />
      <StatCard label="消耗热量" :value="Number(stats.total_calories || 0)" suffix="kcal" icon="Sunny" accent="#e88f39" hint="本月累计" />
      <StatCard label="获得积分" :value="Number(stats.total_points || 0)" suffix="分" icon="Trophy" accent="#9c6bdd" hint="审核通过后计入" />
    </section>

    <div class="checkin-layout">
      <section class="panel-card calendar-panel">
        <div class="panel-title">
          <div>
            <h2>{{ monthText(month) }}运动轨迹</h2>
            <span>颜色越深，代表当天运动时长越长</span>
          </div>
          <div class="calendar-legend">
            <span>少</span>
            <i class="level-1" /><i class="level-2" /><i class="level-3" /><i class="level-4" />
            <span>多</span>
          </div>
        </div>
        <div class="calendar-week">
          <span v-for="week in ['一', '二', '三', '四', '五', '六', '日']" :key="week">{{ week }}</span>
        </div>
        <div class="calendar-grid">
          <div
            v-for="cell in calendarCells"
            :key="cell.key"
            class="calendar-cell"
            :class="[
              cell.empty ? 'empty' : '',
              cell.level ? `level-${cell.level}` : '',
              cell.isToday ? 'today' : ''
            ]"
            :title="cell.title"
          >
            <span v-if="!cell.empty">{{ cell.day }}</span>
            <b v-if="cell.points">{{ cell.points }}</b>
          </div>
        </div>
        <div class="calendar-foot">
          <div class="streak-card">
            <span class="streak-icon"><el-icon><Lightning /></el-icon></span>
            <div>
              <strong>{{ streak }} 天</strong>
              <span>当前连续打卡</span>
            </div>
          </div>
          <div class="month-tip">
            <el-icon><InfoFilled /></el-icon>
            每天坚持 30 分钟，身体会记住你的努力。
          </div>
        </div>
      </section>

      <section class="panel-card checkin-form-panel">
        <div class="form-panel-head">
          <span class="punch-icon"><el-icon><Medal /></el-icon></span>
          <div>
            <h2>今日运动打卡</h2>
            <p>完成运动后记录，立即获得积分</p>
          </div>
        </div>

        <div v-if="todaySelfCount >= selfLimit" class="limit-banner">
          <el-icon><CircleCheckFilled /></el-icon>
          今日自主打卡已完成，明天继续保持！
        </div>
        <template v-else>
          <div class="form-label">运动时长</div>
          <div class="duration-picker">
            <button
              v-for="value in [30, 45, 60, 90]"
              :key="value"
              :class="{ active: form.duration_minutes === value }"
              @click="form.duration_minutes = value"
            >
              {{ value }}<small>分钟</small>
            </button>
          </div>
          <el-input-number
            v-model="form.duration_minutes"
            :min="1"
            :max="600"
            :step="5"
            controls-position="right"
            style="width: 100%; margin: 8px 0 16px"
          />

          <div class="form-label">运动强度</div>
          <div class="intensity-picker">
            <button
              v-for="item in fitnessIntensityOptions"
              :key="item.value"
              :class="{ active: form.intensity === item.value }"
              @click="form.intensity = item.value"
            >
              <span class="intensity-dot" :class="item.value" />
              <span>{{ item.label }}</span>
              <small>约 {{ item.factor }} kcal/分钟</small>
            </button>
          </div>

          <div class="form-label">打卡内容</div>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="2"
            maxlength="100"
            placeholder="今天练了什么？例如：力量训练 45 分钟"
          />

          <div class="calorie-preview">
            <div>
              <span>预计消耗</span>
              <strong>{{ estimatedCalories }} <small>kcal</small></strong>
            </div>
            <div>
              <span>预计获得</span>
              <strong>{{ selfPoints }} <small>积分</small></strong>
            </div>
          </div>
          <el-button type="primary" size="large" class="punch-btn" :loading="submitting" @click="submitCheckin">
            <el-icon><Medal /></el-icon>完成打卡
          </el-button>
        </template>

        <div class="rule-list">
          <div v-for="rule in rules" :key="rule.id" class="rule-item">
            <span class="rule-type">{{ rule.checkin_type === 'self' ? '自主' : '场馆' }}</span>
            <div>
              <strong>{{ rule.name }}</strong>
              <p>{{ rule.description }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="panel-card records-panel">
      <div class="panel-title">
        <div>
          <h2>打卡记录</h2>
          <span>{{ monthText(month) }} · 共 {{ records.length }} 条</span>
        </div>
        <el-button text type="primary" @click="load">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
      </div>
      <div v-loading="loading">
        <div v-for="record in records" :key="record.id" class="record-row">
          <div class="record-date">
            <strong>{{ String(record.checkin_date).slice(8, 10) }}</strong>
            <span>{{ record.checkin_date.slice(5, 7) }}月</span>
          </div>
          <span class="record-icon" :class="record.checkin_type">
            <el-icon><OfficeBuilding v-if="record.checkin_type === 'venue'" /><Sunny v-else /></el-icon>
          </span>
          <div class="record-main">
            <div class="record-title">
              <h3>{{ record.content || (record.checkin_type === 'venue' ? '场馆打卡' : '自主运动打卡') }}</h3>
              <StatusTag :status="record.status" kind="checkin" />
            </div>
            <p>
              {{ record.provider_name || '自主训练' }} · {{ record.duration_minutes }} 分钟 ·
              {{ record.calories }} kcal
            </p>
          </div>
          <div class="record-points" :class="{ pending: record.status === 'pending' }">
            <strong>+{{ record.points || 0 }}</strong>
            <span>{{ record.status === 'pending' ? '待核验' : '积分' }}</span>
          </div>
        </div>
        <el-empty v-if="!records.length && !loading" description="本月还没有打卡记录" :image-size="80" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import StatCard from '../../components/StatCard.vue';
import StatusTag from '../../components/StatusTag.vue';
import { fitnessIntensityOptions, monthText } from '../../utils/constants';

const now = new Date();
const month = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
const loading = ref(false);
const submitting = ref(false);
const records = ref([]);
const rules = ref([]);
const todaySelfCount = ref(0);
const stats = reactive({});
const form = reactive({
  duration_minutes: 45,
  intensity: 'medium',
  content: ''
});

const selfRule = computed(() => rules.value.find((item) => item.checkin_type === 'self'));
const selfLimit = computed(() => Number(selfRule.value?.daily_limit || 1));
const selfPoints = computed(() => Number(selfRule.value?.points_per_checkin || 10));
const estimatedCalories = computed(() => {
  const factor = fitnessIntensityOptions.find((item) => item.value === form.intensity)?.factor || 7;
  return Math.round((Number(form.duration_minutes) || 0) * factor);
});

const calendarCells = computed(() => {
  const [year, monthValue] = month.value.split('-').map(Number);
  const firstDay = new Date(year, monthValue - 1, 1);
  const days = new Date(year, monthValue, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  const recordMap = new Map();
  records.value.forEach((item) => {
    const key = String(item.checkin_date).slice(0, 10);
    const current = recordMap.get(key) || { duration: 0, points: 0, count: 0 };
    current.duration += Number(item.duration_minutes || 0);
    current.points += Number(item.points || 0);
    current.count += 1;
    recordMap.set(key, current);
  });

  for (let i = 0; i < offset; i += 1) {
    cells.push({ key: `empty-${i}`, empty: true });
  }
  const today = new Date();
  for (let day = 1; day <= days; day += 1) {
    const key = `${year}-${String(monthValue).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const item = recordMap.get(key);
    let level = 0;
    if (item) {
      if (item.duration >= 90) level = 4;
      else if (item.duration >= 60) level = 3;
      else if (item.duration >= 40) level = 2;
      else level = 1;
    }
    cells.push({
      key,
      day,
      level,
      points: item?.points || 0,
      isToday:
        today.getFullYear() === year && today.getMonth() + 1 === monthValue && today.getDate() === day,
      title: item ? `${item.count} 次打卡 · ${item.duration} 分钟 · ${item.points} 积分` : ''
    });
  }
  return cells;
});

const streak = computed(() => {
  const approved = new Set(
    records.value.filter((item) => item.status === 'approved').map((item) => String(item.checkin_date).slice(0, 10))
  );
  let count = 0;
  const cursor = new Date();
  if (!approved.has(toKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (approved.has(toKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
});

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/user/checkins', { params: { month: month.value } });
    records.value = data.list;
    rules.value = data.rules;
    todaySelfCount.value = data.todaySelfCount;
    Object.assign(stats, data.stats);
  } finally {
    loading.value = false;
  }
}

async function submitCheckin() {
  const min = Number(selfRule.value?.min_duration || 30);
  if (Number(form.duration_minutes) < min) {
    return ElMessage.warning(`自主打卡至少需要运动 ${min} 分钟`);
  }
  submitting.value = true;
  try {
    const result = await request.post('/user/checkins', { ...form });
    ElMessage.success(`打卡成功，获得 ${result.points} 积分`);
    form.content = '';
    await load();
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.checkin-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.72fr);
  gap: 18px;
  margin-top: 18px;
}

.calendar-panel {
  min-height: 480px;
}

.calendar-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  color: #9aa79f;
}

.calendar-legend i {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

.level-1 {
  background: #e1f4ec;
}
.level-2 {
  background: #b6e6d3;
}
.level-3 {
  background: #72cbb0;
}
.level-4 {
  background: #0f9f78;
}

.calendar-week,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 7px;
}

.calendar-week {
  margin-bottom: 7px;
}

.calendar-week span {
  text-align: center;
  font-size: 9px;
  color: #9aa79f;
  padding: 4px 0;
}

.calendar-cell {
  height: 55px;
  border-radius: 10px;
  background: #f7f9f8;
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 7px 8px;
  font-size: 10px;
  color: #6d7e75;
  transition: transform 0.15s ease;
}

.calendar-cell:not(.empty):hover {
  transform: scale(1.04);
}

.calendar-cell.empty {
  background: transparent;
}

.calendar-cell.level-1 {
  color: #41715f;
}

.calendar-cell.level-2,
.calendar-cell.level-3 {
  color: #215c47;
}

.calendar-cell.level-4 {
  color: #fff;
}

.calendar-cell.today {
  outline: 2px solid var(--fitness-primary);
  outline-offset: -2px;
}

.calendar-cell b {
  position: absolute;
  right: 6px;
  bottom: 5px;
  font-size: 7px;
  font-weight: 600;
  opacity: 0.65;
}

.calendar-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
  border-top: 1px solid #eff3f1;
  padding-top: 16px;
  gap: 16px;
}

.streak-card {
  display: flex;
  align-items: center;
  gap: 10px;
}

.streak-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: #fff4df;
  color: #d99222;
  display: grid;
  place-items: center;
  font-size: 18px;
}

.streak-card div {
  display: flex;
  flex-direction: column;
}

.streak-card strong {
  font-size: 17px;
}

.streak-card div span {
  font-size: 8px;
  color: #96a39c;
}

.month-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  color: #96a39c;
}

.checkin-form-panel {
  display: flex;
  flex-direction: column;
}

.form-panel-head {
  display: flex;
  gap: 11px;
  align-items: center;
  margin-bottom: 18px;
}

.punch-icon {
  width: 41px;
  height: 41px;
  border-radius: 12px;
  background: var(--fitness-primary-soft);
  color: var(--fitness-primary);
  display: grid;
  place-items: center;
  font-size: 20px;
}

.form-panel-head h2 {
  margin: 0 0 3px;
  font-size: 16px;
}

.form-panel-head p {
  margin: 0;
  font-size: 9px;
  color: #96a39c;
}

.form-label {
  font-size: 10px;
  font-weight: 600;
  color: #62766b;
  margin: 13px 0 7px;
}

.duration-picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.duration-picker button {
  height: 42px;
  border-radius: 9px;
  border: 1px solid #e7ece9;
  background: #fff;
  color: #5e7167;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.duration-picker button.active {
  border-color: var(--fitness-primary);
  background: #effaf5;
  color: var(--fitness-primary-dark);
}

.duration-picker small {
  font-size: 7px;
  font-weight: 400;
  display: block;
}

.intensity-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.intensity-picker button {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e7ece9;
  background: #fff;
  border-radius: 9px;
  padding: 8px 10px;
  font-size: 10px;
  color: #5f7268;
  cursor: pointer;
  text-align: left;
}

.intensity-picker button.active {
  border-color: var(--fitness-primary);
  background: #f3fbf7;
}

.intensity-picker small {
  margin-left: auto;
  font-size: 8px;
  color: #9ba8a1;
}

.intensity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.intensity-dot.low {
  background: #7bc8a9;
}
.intensity-dot.medium {
  background: #e2ae45;
}
.intensity-dot.high {
  background: #e86b5b;
}

.calorie-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 16px 0 13px;
}

.calorie-preview div {
  background: #f7faf8;
  border-radius: 9px;
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.calorie-preview span {
  font-size: 8px;
  color: #98a59e;
}

.calorie-preview strong {
  font-size: 17px;
  color: var(--fitness-primary-dark);
}

.calorie-preview small {
  font-size: 7px;
  font-weight: 500;
}

.punch-btn {
  width: 100%;
  height: 44px;
  border-radius: 10px;
}

.limit-banner {
  background: #effaf5;
  border: 1px solid #d4f0e4;
  color: #167f61;
  border-radius: 10px;
  padding: 14px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rule-list {
  margin-top: auto;
  border-top: 1px dashed #e8eeeb;
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rule-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.rule-type {
  flex-shrink: 0;
  font-size: 8px;
  color: var(--fitness-primary);
  background: #e9f7f2;
  border-radius: 4px;
  padding: 2px 5px;
  margin-top: 1px;
}

.rule-item strong {
  font-size: 9px;
  color: #65776d;
}

.rule-item p {
  font-size: 8px;
  line-height: 1.55;
  color: #9aa7a0;
  margin: 2px 0 0;
}

.records-panel {
  margin-top: 18px;
}

.record-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid #f0f4f2;
}

.record-row:last-child {
  border-bottom: 0;
}

.record-date {
  width: 38px;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.record-date strong {
  font-size: 17px;
  line-height: 1;
}

.record-date span {
  font-size: 7px;
  color: #9ba8a1;
}

.record-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 16px;
  flex-shrink: 0;
}

.record-icon.venue {
  background: #eaf6f1;
  color: #168d6b;
}

.record-icon.self {
  background: #fff6e6;
  color: #d99b2f;
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-title {
  display: flex;
  align-items: center;
  gap: 7px;
}

.record-title h3 {
  font-size: 11px;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-main p {
  font-size: 8px;
  color: #94a19a;
  margin: 4px 0 0;
}

.record-points {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.record-points strong {
  font-size: 15px;
  color: var(--fitness-primary);
}

.record-points span {
  font-size: 7px;
  color: #9ba8a1;
}

.record-points.pending strong {
  color: #d0a03d;
}

@media (max-width: 1100px) {
  .checkin-layout {
    grid-template-columns: 1fr;
  }
  .rule-list {
    margin-top: 18px;
  }
}

@media (max-width: 650px) {
  .calendar-cell {
    height: 43px;
    padding: 5px;
  }
  .calendar-grid,
  .calendar-week {
    gap: 4px;
  }
  .calendar-foot {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
