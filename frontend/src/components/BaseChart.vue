<template>
  <div ref="chartEl" class="chart" :style="{ height }" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '300px' }
});

const chartEl = ref(null);
let chart = null;
let observer = null;

function render() {
  if (!chartEl.value) return;
  if (!chart) chart = echarts.init(chartEl.value);
  chart.setOption(props.option, true);
}

function resize() {
  chart?.resize();
}

watch(
  () => props.option,
  () => nextTick(render),
  { deep: true }
);

onMounted(() => {
  render();
  observer = new ResizeObserver(resize);
  observer.observe(chartEl.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
  chart = null;
});
</script>

<style scoped>
.chart {
  width: 100%;
}
</style>
