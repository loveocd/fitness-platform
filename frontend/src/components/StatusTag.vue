<template>
  <el-tag :type="item.type" effect="light" size="small">{{ item.label }}</el-tag>
</template>

<script setup>
import { computed } from 'vue';
import {
  orderStatusMap,
  checkinStatusMap,
  reviewStatusMap,
  providerStatusMap
} from '../utils/constants';

const props = defineProps({
  status: { type: String, default: '' },
  kind: { type: String, default: 'order' }
});

const maps = {
  order: orderStatusMap,
  checkin: checkinStatusMap,
  review: reviewStatusMap,
  provider: providerStatusMap
};

const item = computed(
  () => maps[props.kind]?.[props.status] || { label: props.status || '未知', type: 'info' }
);
</script>
