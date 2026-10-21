<template>
  <div class="page">
    <PageHeader title="我的收藏" subtitle="收藏喜欢的课程与服务，随时回来继续训练">
      <el-button plain @click="load">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </PageHeader>

    <div class="favorite-summary">
      <div class="summary-icon"><el-icon><StarFilled /></el-icon></div>
      <div>
        <span>MY COLLECTION</span>
        <strong>{{ list.length }} 项心仪服务</strong>
        <p>把想尝试的训练先收藏起来，安排好时间再出发。</p>
      </div>
      <el-button type="primary" plain @click="router.push('/user/venues')">发现更多服务</el-button>
    </div>

    <div v-loading="loading" class="favorite-list">
      <div v-if="list.length" class="grid-4">
        <ServiceCard
          v-for="service in list"
          :key="service.id"
          :service="service"
          show-favorite
          :favorite="true"
          @favorite="removeFavorite(service)"
          @book="router.push(`/user/venues/${service.provider_id}`)"
        />
      </div>
      <div v-else-if="!loading" class="empty-panel panel-card">
        <el-icon style="font-size: 42px; color: #c0cbc5"><Star /></el-icon>
        <p>还没有收藏任何服务</p>
        <el-button type="primary" @click="router.push('/user/venues')">去逛逛场馆</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import ServiceCard from '../../components/ServiceCard.vue';

const router = useRouter();
const loading = ref(false);
const list = ref([]);

async function load() {
  loading.value = true;
  try {
    list.value = await request.get('/user/favorites');
  } finally {
    loading.value = false;
  }
}

async function removeFavorite(service) {
  await request.delete(`/user/favorites/${service.id}`);
  ElMessage.success('已取消收藏');
  load();
}

onMounted(load);
</script>

<style scoped>
.favorite-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(105deg, #fff, #f0f8f4);
  border: 1px solid #e3eee8;
  border-radius: 18px;
  padding: 20px 24px;
  margin-bottom: 20px;
}

.summary-icon {
  width: 50px;
  height: 50px;
  border-radius: 15px;
  background: #fff1d4;
  color: #df9a27;
  display: grid;
  place-items: center;
  font-size: 23px;
  flex-shrink: 0;
}

.favorite-summary > div:nth-child(2) {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.favorite-summary span {
  font-size: 7px;
  letter-spacing: 1.8px;
  color: #a1ada7;
}

.favorite-summary strong {
  font-size: 18px;
}

.favorite-summary p {
  font-size: 9px;
  color: #92a098;
  margin: 0;
}

.favorite-list {
  min-height: 220px;
}

@media (max-width: 600px) {
  .favorite-summary {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
