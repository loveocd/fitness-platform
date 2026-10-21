<template>
  <div class="stat-card" :style="{ '--accent': accent }">
    <div class="stat-head">
      <span>{{ label }}</span>
      <div class="stat-icon">
        <el-icon><component :is="icon" /></el-icon>
      </div>
    </div>
    <div class="stat-value">
      <strong>{{ displayValue }}</strong>
      <small v-if="suffix">{{ suffix }}</small>
    </div>
    <div class="stat-foot">
      <span v-if="trend" class="trend" :class="{ down: trendDown }">
        <el-icon><TopRight v-if="!trendDown" /><BottomRight v-else /></el-icon>
        {{ trend }}
      </span>
      <span class="hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: 0 },
  suffix: { type: String, default: '' },
  icon: { type: [String, Object], default: 'TrendCharts' },
  accent: { type: String, default: '#0f9f78' },
  hint: { type: String, default: '' },
  trend: { type: String, default: '' },
  trendDown: { type: Boolean, default: false }
});

const displayValue = computed(() => {
  if (typeof props.value === 'number' && props.value > 9999) {
    return props.value.toLocaleString('zh-CN');
  }
  return props.value;
});
</script>

<style scoped>
.stat-card {
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 17px;
  padding: 18px 19px 16px;
  box-shadow: var(--fitness-shadow);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  right: -30px;
  top: -32px;
}

.stat-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--fitness-muted);
  font-size: 12px;
}

.stat-icon {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: color-mix(in srgb, var(--accent) 12%, white);
  color: var(--accent);
  display: grid;
  place-items: center;
  font-size: 17px;
}

.stat-value {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin: 10px 0 7px;
}

.stat-value strong {
  font-size: 28px;
  letter-spacing: -1px;
  line-height: 1;
  color: var(--fitness-ink);
}

.stat-value small {
  color: #8a9992;
  font-size: 11px;
}

.stat-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 17px;
}

.trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #0f9f78;
  font-size: 10px;
  font-weight: 700;
}

.trend.down {
  color: #e45656;
}

.hint {
  color: #9aa8a1;
  font-size: 10px;
}
</style>
