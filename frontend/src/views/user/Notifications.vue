<template>
  <div class="page">
    <PageHeader title="消息通知" subtitle="预约进度、打卡核验与平台消息都会在这里提醒你">
      <el-button plain :disabled="!unread" @click="readAll">
        <el-icon><CircleCheck /></el-icon>全部已读
      </el-button>
    </PageHeader>

    <section class="panel-card notice-panel">
      <div class="notice-toolbar">
        <div class="notice-tabs">
          <button :class="{ active: filter === 'all' }" @click="filter = 'all'">
            全部消息<span>{{ total }}</span>
          </button>
          <button :class="{ active: filter === 'unread' }" @click="filter = 'unread'">
            未读<span>{{ unread }}</span>
          </button>
        </div>
        <span class="notice-tip"><i /> 未读消息会显示绿点</span>
      </div>

      <div v-loading="loading" class="notice-list">
        <article
          v-for="item in list"
          :key="item.id"
          class="notice-item"
          :class="{ unread: !item.is_read }"
          @click="openNotice(item)"
        >
          <div class="notice-icon" :class="item.type">
            <el-icon><component :is="iconFor(item.type)" /></el-icon>
          </div>
          <div class="notice-main">
            <div class="notice-head">
              <h3>{{ item.title }}</h3>
              <span>{{ formatDate(item.created_at, true) }}</span>
            </div>
            <p>{{ item.content }}</p>
            <span class="notice-type">{{ typeLabel(item.type) }}</span>
          </div>
          <i v-if="!item.is_read" class="unread-dot" />
          <el-icon class="notice-arrow"><ArrowRight /></el-icon>
        </article>
        <el-empty v-if="!list.length && !loading" description="暂时没有消息" :image-size="80" />
      </div>

      <div v-if="total > pageSize" class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          background
          @current-change="load"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import { formatDate } from '../../utils/constants';

const router = useRouter();
const loading = ref(false);
const list = ref([]);
const unread = ref(0);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const filter = ref('all');

const typeMap = {
  order: { label: '预约通知', icon: 'Calendar' },
  checkin: { label: '打卡消息', icon: 'Medal' },
  review: { label: '评价消息', icon: 'ChatDotRound' },
  system: { label: '系统消息', icon: 'Bell' }
};

function iconFor(type) {
  return typeMap[type]?.icon || 'Bell';
}
function typeLabel(type) {
  return typeMap[type]?.label || '平台消息';
}

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/user/notifications', {
      params: {
        page: page.value,
        pageSize,
        unread: filter.value === 'unread' ? 1 : undefined
      }
    });
    list.value = data.list;
    total.value = data.total;
    unread.value = data.unread;
  } finally {
    loading.value = false;
  }
}

async function openNotice(item) {
  if (!item.is_read) {
    await request.patch(`/user/notifications/${item.id}/read`);
    item.is_read = 1;
    unread.value = Math.max(unread.value - 1, 0);
  }
  const routes = {
    order: '/user/appointments',
    checkin: '/user/checkins',
    review: '/user/reviews'
  };
  if (routes[item.type]) router.push(routes[item.type]);
}

async function readAll() {
  await request.patch('/user/notifications/read-all');
  unread.value = 0;
  load();
}

watch(filter, () => {
  page.value = 1;
  load();
});

onMounted(load);
</script>

<style scoped>
.notice-panel {
  padding: 0;
  overflow: hidden;
}

.notice-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px 0;
  border-bottom: 1px solid #edf1ef;
}

.notice-tabs {
  display: flex;
  gap: 5px;
}

.notice-tabs button {
  border: 0;
  background: transparent;
  padding: 8px 12px 13px;
  font-size: 11px;
  color: #819088;
  cursor: pointer;
  position: relative;
}

.notice-tabs button.active {
  color: var(--fitness-primary-dark);
  font-weight: 700;
}

.notice-tabs button.active::after {
  content: '';
  position: absolute;
  height: 2px;
  border-radius: 2px;
  background: var(--fitness-primary);
  bottom: -1px;
  left: 12px;
  right: 12px;
}

.notice-tabs span {
  font-size: 8px;
  background: #f0f5f2;
  color: #84948b;
  border-radius: 99px;
  padding: 1px 5px;
  margin-left: 3px;
}

.notice-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 8px;
  color: #a0aca6;
}

.notice-tip i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fitness-primary);
}

.notice-list {
  min-height: 300px;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 17px 22px;
  border-bottom: 1px solid #f1f4f2;
  cursor: pointer;
  position: relative;
  transition: background 0.15s ease;
}

.notice-item:hover {
  background: #fafcfb;
}

.notice-item.unread {
  background: #fbfdfc;
}

.notice-icon {
  width: 39px;
  height: 39px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-size: 18px;
  flex-shrink: 0;
}

.notice-icon.order {
  background: #e9f7f2;
  color: #0f9f78;
}
.notice-icon.checkin {
  background: #fff4df;
  color: #d9982d;
}
.notice-icon.review {
  background: #eef1fd;
  color: #6778d5;
}
.notice-icon.system {
  background: #f2effb;
  color: #846bd1;
}

.notice-main {
  flex: 1;
  min-width: 0;
}

.notice-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.notice-head h3 {
  margin: 0;
  font-size: 12px;
}

.notice-head span {
  font-size: 8px;
  color: #a1ada7;
  white-space: nowrap;
}

.notice-main > p {
  font-size: 10px;
  line-height: 1.7;
  color: #7e8e86;
  margin: 5px 0 7px;
}

.notice-type {
  font-size: 7px;
  color: #8f9d96;
  background: #f4f7f5;
  border-radius: 4px;
  padding: 2px 6px;
}

.unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fitness-primary);
  position: absolute;
  left: 45px;
  top: 14px;
}

.notice-arrow {
  color: #c0cac5;
  margin-top: 11px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 18px;
}

@media (max-width: 600px) {
  .notice-tip {
    display: none;
  }
  .notice-head span {
    display: none;
  }
}
</style>
