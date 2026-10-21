<template>
  <div class="page">
    <PageHeader title="体测数据" subtitle="持续记录身体指标，看见每一次训练带来的真实改变">
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>录入体测
      </el-button>
    </PageHeader>

    <section v-if="latest" class="body-overview">
      <div class="body-hero-copy">
        <span class="body-eyebrow">BODY COMPOSITION</span>
        <h2>你的身体，正在发生<br /><em>看得见的改变</em></h2>
        <p>
          最近一次体测：{{ latest.test_date }} · {{ latest.provider_name }}。
          当前 BMI {{ latest.bmi }}，体脂率 {{ latest.body_fat || '—' }}%，基础代谢
          {{ latest.basal_metabolism || '—' }} kcal。
        </p>
        <div class="bmi-badge">
          <span>BMI 状态</span>
          <strong>{{ bmiState.label }}</strong>
          <small>{{ bmiState.range }}</small>
        </div>
      </div>
      <div class="body-metrics">
        <div class="body-metric main">
          <span>当前体重</span>
          <strong>{{ latest.weight }}<small>kg</small></strong>
          <i v-if="weightDiff !== null" :class="{ down: weightDiff <= 0 }">
            {{ weightDiff > 0 ? '+' : '' }}{{ weightDiff }} kg 较上次
          </i>
        </div>
        <div class="body-metric">
          <span>体脂率</span>
          <strong>{{ latest.body_fat || '—' }}<small>%</small></strong>
        </div>
        <div class="body-metric">
          <span>肌肉量</span>
          <strong>{{ latest.muscle_mass || '—' }}<small>kg</small></strong>
        </div>
        <div class="body-metric">
          <span>基础代谢</span>
          <strong>{{ latest.basal_metabolism || '—' }}<small>kcal</small></strong>
        </div>
      </div>
      <div class="body-deco" />
    </section>

    <section v-else class="empty-body panel-card">
      <el-icon><DataLine /></el-icon>
      <h3>还没有体测记录</h3>
      <p>录入第一次体测数据，开始追踪身体指标的变化。</p>
      <el-button type="primary" @click="openCreate">录入体测数据</el-button>
    </section>

    <div class="two-column body-grid">
      <section class="panel-card">
        <div class="panel-title">
          <div>
            <h2>身体指标趋势</h2>
            <span>体重、体脂率与 BMI 变化曲线</span>
          </div>
          <el-radio-group v-model="chartMetric" size="small">
            <el-radio-button value="all">综合</el-radio-button>
            <el-radio-button value="weight">体重</el-radio-button>
            <el-radio-button value="fat">体脂</el-radio-button>
          </el-radio-group>
        </div>
        <BaseChart :option="trendOption" height="300px" />
      </section>

      <section class="panel-card indicator-panel">
        <div class="panel-title">
          <div>
            <h2>身体指标解读</h2>
            <span>基于最近一次体测数据</span>
          </div>
        </div>
        <div v-if="latest" class="indicator-list">
          <div v-for="item in indicators" :key="item.label" class="indicator-item">
            <div class="indicator-head">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <div class="indicator-track">
              <i :style="{ width: `${item.percent}%`, background: item.color }" />
            </div>
            <p>{{ item.hint }}</p>
          </div>
        </div>
      </section>
    </div>

    <section class="panel-card history-panel">
      <div class="panel-title">
        <div>
          <h2>体测历史记录</h2>
          <span>共 {{ records.length }} 次专业体测</span>
        </div>
      </div>
      <el-table :data="records" style="width: 100%">
        <el-table-column prop="test_date" label="体测日期" width="110" />
        <el-table-column prop="provider_name" label="体测门店" min-width="150" show-overflow-tooltip />
        <el-table-column prop="coach_name" label="体测教练" width="100">
          <template #default="{ row }">{{ row.coach_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="身高 / 体重" width="125">
          <template #default="{ row }">{{ row.height }}cm / {{ row.weight }}kg</template>
        </el-table-column>
        <el-table-column prop="bmi" label="BMI" width="75" />
        <el-table-column label="体脂率" width="85">
          <template #default="{ row }">{{ row.body_fat ? `${row.body_fat}%` : '—' }}</template>
        </el-table-column>
        <el-table-column label="肌肉量" width="85">
          <template #default="{ row }">{{ row.muscle_mass ? `${row.muscle_mass}kg` : '—' }}</template>
        </el-table-column>
        <el-table-column label="腰围" width="75">
          <template #default="{ row }">{{ row.waist ? `${row.waist}cm` : '—' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="教练建议" min-width="220" show-overflow-tooltip />
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" title="录入体测数据" width="680px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="体测门店" prop="provider_id">
            <el-select v-model="form.provider_id" placeholder="选择体测门店" style="width: 100%" @change="loadCoaches">
              <el-option v-for="venue in venues" :key="venue.id" :label="venue.name" :value="venue.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="体测教练">
            <el-select v-model="form.coach_id" placeholder="选填" clearable style="width: 100%">
              <el-option v-for="coach in coachOptions" :key="coach.id" :label="coach.name" :value="coach.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="体测日期" prop="test_date">
            <el-date-picker
              v-model="form.test_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 100%"
              :disabled-date="(date) => date.getTime() > Date.now()"
            />
          </el-form-item>
          <el-form-item label="身高（cm）" prop="height">
            <el-input-number v-model="form.height" :min="100" :max="230" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="体重（kg）" prop="weight">
            <el-input-number v-model="form.weight" :min="20" :max="250" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="体脂率（%）">
            <el-input-number v-model="form.body_fat" :min="0" :max="70" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="肌肉量（kg）">
            <el-input-number v-model="form.muscle_mass" :min="0" :max="120" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="内脏脂肪等级">
            <el-input-number v-model="form.visceral_fat" :min="0" :max="30" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="基础代谢（kcal）">
            <el-input-number v-model="form.basal_metabolism" :min="0" :max="5000" style="width: 100%" />
          </el-form-item>
          <el-form-item label="腰围（cm）">
            <el-input-number v-model="form.waist" :min="0" :max="200" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="胸围（cm）">
            <el-input-number v-model="form.chest" :min="0" :max="200" :precision="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="臀围（cm）">
            <el-input-number v-model="form.hip" :min="0" :max="200" :precision="1" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="备注 / 训练建议">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="记录身体感受或教练建议" />
        </el-form-item>
        <div class="bmi-preview">
          <span>预计 BMI</span>
          <strong>{{ formBmi }}</strong>
          <span>{{ bmiLabel(formBmi) }}</span>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存记录</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import BaseChart from '../../components/BaseChart.vue';

const records = ref([]);
const venues = ref([]);
const coachOptions = ref([]);
const dialogVisible = ref(false);
const saving = ref(false);
const formRef = ref();
const chartMetric = ref('all');

const form = reactive({
  provider_id: null,
  coach_id: null,
  test_date: '',
  height: 170,
  weight: 65,
  body_fat: null,
  muscle_mass: null,
  visceral_fat: null,
  basal_metabolism: null,
  waist: null,
  chest: null,
  hip: null,
  remark: ''
});

const rules = {
  provider_id: [{ required: true, message: '请选择体测门店', trigger: 'change' }],
  test_date: [{ required: true, message: '请选择体测日期', trigger: 'change' }],
  height: [{ required: true, message: '请填写身高', trigger: 'change' }],
  weight: [{ required: true, message: '请填写体重', trigger: 'change' }]
};

const latest = computed(() => records.value[0] || null);
const weightDiff = computed(() => {
  if (records.value.length < 2) return null;
  return Number((Number(records.value[0].weight) - Number(records.value[1].weight)).toFixed(1));
});
const formBmi = computed(() => {
  const h = Number(form.height) / 100;
  return h && form.weight ? Number((Number(form.weight) / (h * h)).toFixed(1)) : '—';
});
const bmiState = computed(() => {
  const value = Number(latest.value?.bmi || 0);
  if (!value) return { label: '待评估', range: '' };
  if (value < 18.5) return { label: '偏瘦', range: '< 18.5' };
  if (value < 24) return { label: '正常', range: '18.5 - 23.9' };
  if (value < 28) return { label: '偏重', range: '24 - 27.9' };
  return { label: '肥胖', range: '≥ 28' };
});

function bmiLabel(value) {
  const number = Number(value);
  if (!number) return '';
  if (number < 18.5) return '偏瘦';
  if (number < 24) return '正常范围';
  if (number < 28) return '偏重';
  return '肥胖';
}

const indicators = computed(() => {
  if (!latest.value) return [];
  return [
    {
      label: '体脂率',
      value: `${latest.value.body_fat || '—'} %`,
      percent: Math.min((Number(latest.value.body_fat || 0) / 40) * 100, 100),
      color: '#ef765f',
      hint: '建议结合力量训练与饮食控制，将体脂保持在健康区间。'
    },
    {
      label: '肌肉量',
      value: `${latest.value.muscle_mass || '—'} kg`,
      percent: Math.min((Number(latest.value.muscle_mass || 0) / 70) * 100, 100),
      color: '#0f9f78',
      hint: '肌肉量是基础代谢的重要支撑，保持规律力量训练。'
    },
    {
      label: '内脏脂肪',
      value: `${latest.value.visceral_fat || '—'} 级`,
      percent: Math.min((Number(latest.value.visceral_fat || 0) / 15) * 100, 100),
      color: '#dfa735',
      hint: '建议控制在 9 级以内，有氧运动与饮食管理同样重要。'
    },
    {
      label: '腰臀状态',
      value: latest.value.waist ? `${latest.value.waist} cm` : '—',
      percent: Math.min((Number(latest.value.waist || 0) / 110) * 100, 100),
      color: '#6f7dd8',
      hint: '腰围是评估中心性肥胖的重要指标，建议持续关注变化。'
    }
  ];
});

const trendOption = computed(() => {
  const sorted = [...records.value].reverse();
  const dates = sorted.map((item) => String(item.test_date).slice(5));
  const weight = sorted.map((item) => Number(item.weight));
  const fat = sorted.map((item) => Number(item.body_fat || 0));
  const bmi = sorted.map((item) => Number(item.bmi || 0));
  const series = [];
  if (chartMetric.value !== 'fat') {
    series.push({
      name: '体重 (kg)',
      type: 'line',
      smooth: true,
      data: weight,
      symbolSize: 6,
      lineStyle: { width: 3, color: '#0f9f78' },
      itemStyle: { color: '#0f9f78' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(15,159,120,.22)' },
            { offset: 1, color: 'rgba(15,159,120,0)' }
          ]
        }
      }
    });
  }
  if (chartMetric.value !== 'weight') {
    series.push({
      name: '体脂率 (%)',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: fat,
      symbolSize: 5,
      lineStyle: { width: 2, color: '#e4a63a' },
      itemStyle: { color: '#e4a63a' }
    });
  }
  if (chartMetric.value === 'all') {
    series.push({
      name: 'BMI',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: bmi,
      symbolSize: 4,
      lineStyle: { width: 1.5, type: 'dashed', color: '#7b88dc' },
      itemStyle: { color: '#7b88dc' }
    });
  }
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, textStyle: { fontSize: 9, color: '#7f8e86' } },
    grid: { left: 8, right: 10, top: 38, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 9, color: '#95a29b' }
    },
    yAxis: [
      {
        type: 'value',
        scale: true,
        axisLabel: { fontSize: 9, color: '#95a29b' },
        splitLine: { lineStyle: { color: '#f1f4f2' } }
      },
      {
        type: 'value',
        scale: true,
        axisLabel: { fontSize: 9, color: '#95a29b' },
        splitLine: { show: false }
      }
    ],
    series
  };
});

function openCreate() {
  form.provider_id = null;
  form.coach_id = null;
  form.test_date = new Date().toISOString().slice(0, 10);
  form.height = latest.value?.height || 170;
  form.weight = latest.value?.weight || 65;
  form.body_fat = null;
  form.muscle_mass = null;
  form.visceral_fat = null;
  form.basal_metabolism = null;
  form.waist = null;
  form.chest = null;
  form.hip = null;
  form.remark = '';
  coachOptions.value = [];
  dialogVisible.value = true;
}

async function loadCoaches(providerId) {
  form.coach_id = null;
  if (!providerId) return;
  const data = await request.get(`/public/venues/${providerId}`);
  coachOptions.value = data.coaches;
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    await request.post('/user/body-tests', { ...form });
    ElMessage.success('体测数据已记录');
    dialogVisible.value = false;
    await loadRecords();
  } finally {
    saving.value = false;
  }
}

async function loadRecords() {
  records.value = await request.get('/user/body-tests');
}

onMounted(async () => {
  const [venueData] = await Promise.all([
    request.get('/public/venues', { params: { pageSize: 100 } }),
    loadRecords()
  ]);
  venues.value = venueData.list;
});
</script>

<style scoped>
.body-overview {
  border-radius: 22px;
  background:
    radial-gradient(circle at 88% 15%, rgba(200, 236, 102, 0.24), transparent 23%),
    linear-gradient(115deg, #102f23 0%, #174b38 60%, #1b5a42 100%);
  color: #f1faf5;
  padding: 30px 34px;
  display: flex;
  justify-content: space-between;
  gap: 30px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(12, 45, 32, 0.18);
}

.body-hero-copy {
  position: relative;
  z-index: 2;
  max-width: 470px;
}

.body-eyebrow {
  font-size: 8px;
  letter-spacing: 2.4px;
  color: var(--fitness-lime);
  font-weight: 700;
}

.body-hero-copy h2 {
  font-size: 27px;
  line-height: 1.3;
  margin: 13px 0 10px;
  letter-spacing: -0.9px;
}

.body-hero-copy h2 em {
  font-style: normal;
  color: var(--fitness-lime);
}

.body-hero-copy > p {
  font-size: 10px;
  line-height: 1.8;
  color: rgba(241, 250, 245, 0.55);
  margin: 0 0 16px;
}

.bmi-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 99px;
  padding: 6px 13px;
  font-size: 9px;
}

.bmi-badge strong {
  color: var(--fitness-lime);
}

.bmi-badge small {
  color: rgba(241, 250, 245, 0.4);
}

.body-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 9px;
  width: 380px;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}

.body-metric {
  background: rgba(255, 255, 255, 0.075);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 13px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(8px);
}

.body-metric.main {
  grid-column: span 2;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px 17px;
}

.body-metric > span {
  font-size: 8px;
  color: rgba(241, 250, 245, 0.48);
}

.body-metric strong {
  font-size: 25px;
  line-height: 1.2;
  margin-top: 4px;
}

.body-metric.main strong {
  font-size: 35px;
}

.body-metric small {
  font-size: 9px;
  font-weight: 400;
  color: rgba(241, 250, 245, 0.5);
  margin-left: 2px;
}

.body-metric i {
  font-style: normal;
  font-size: 8px;
  background: rgba(232, 114, 95, 0.2);
  color: #ffb2a7;
  border-radius: 99px;
  padding: 3px 7px;
}

.body-metric i.down {
  background: rgba(200, 236, 102, 0.13);
  color: var(--fitness-lime);
}

.body-deco {
  position: absolute;
  width: 330px;
  height: 330px;
  border: 1px solid rgba(200, 236, 102, 0.1);
  border-radius: 50%;
  right: -120px;
  top: -200px;
}

.empty-body {
  text-align: center;
  padding: 50px 20px;
}

.empty-body > .el-icon {
  font-size: 44px;
  color: #9ccfbd;
}

.empty-body h3 {
  margin: 12px 0 5px;
}

.empty-body p {
  font-size: 11px;
  color: #8f9d96;
  margin: 0 0 18px;
}

.body-grid {
  margin-top: 18px;
}

.indicator-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.indicator-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #6c7e74;
}

.indicator-head strong {
  color: var(--fitness-ink);
  font-size: 12px;
}

.indicator-track {
  height: 6px;
  border-radius: 99px;
  background: #f0f4f2;
  margin: 7px 0 5px;
  overflow: hidden;
}

.indicator-track i {
  display: block;
  height: 100%;
  border-radius: 99px;
}

.indicator-item p {
  font-size: 8px;
  line-height: 1.6;
  color: #9aa7a0;
  margin: 0;
}

.history-panel {
  margin-top: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 14px;
}

.bmi-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f3f9f6;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 10px;
  color: #7a8b82;
}

.bmi-preview strong {
  font-size: 20px;
  color: var(--fitness-primary-dark);
}

.bmi-preview span:last-child {
  background: #dff3ea;
  color: #227b5d;
  border-radius: 99px;
  padding: 2px 7px;
  font-size: 8px;
}

@media (max-width: 1000px) {
  .body-overview {
    flex-direction: column;
  }
  .body-metrics {
    width: 100%;
  }
}

@media (max-width: 620px) {
  .body-overview {
    padding: 24px 20px;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
