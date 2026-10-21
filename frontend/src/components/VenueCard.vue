<template>
  <article class="venue-card" @click="router.push(`/user/venues/${venue.id}`)">
    <div class="cover-wrap">
      <el-image :src="venue.cover" fit="cover" class="cover">
        <template #error>
          <div class="cover-fallback"><el-icon><OfficeBuilding /></el-icon></div>
        </template>
      </el-image>
      <div class="cover-shade" />
      <div class="cover-info">
        <span class="open"><i />营业中</span>
        <span class="rating"><el-icon><StarFilled /></el-icon>{{ venue.rating }}</span>
      </div>
    </div>
    <div class="body">
      <div class="title-row">
        <h3 class="line-clamp-1">{{ venue.name }}</h3>
        <span class="orders">{{ venue.monthly_orders }} 单/月</span>
      </div>
      <p class="address line-clamp-1">
        <el-icon><Location /></el-icon>{{ venue.address }}
      </p>
      <p class="desc line-clamp-2">{{ venue.description }}</p>
      <div class="foot">
        <div>
          <span class="from">¥{{ Number(venue.min_price || 0).toFixed(0) }} 起</span>
          <span class="count">{{ venue.service_count }} 项服务</span>
        </div>
        <span class="detail-link">查看详情 <el-icon><Right /></el-icon></span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { useRouter } from 'vue-router';

defineProps({ venue: { type: Object, required: true } });
const router = useRouter();
</script>

<style scoped>
.venue-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(19, 59, 45, 0.06);
  box-shadow: var(--fitness-shadow);
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.venue-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 42px rgba(18, 50, 40, 0.13);
}

.cover-wrap {
  height: 190px;
  position: relative;
  overflow: hidden;
}

.cover {
  width: 100%;
  height: 100%;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 38px;
  background: linear-gradient(135deg, #1b4a3a, #0e2a20);
  color: #bde35a;
}

.cover-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 45%, rgba(6, 25, 18, 0.64));
}

.cover-info {
  position: absolute;
  inset: auto 14px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.open {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #eaf7ef;
  font-size: 10px;
  background: rgba(12, 35, 25, 0.5);
  border-radius: 99px;
  padding: 4px 8px;
  backdrop-filter: blur(5px);
}

.open i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--fitness-lime);
}

.rating {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #ffe8a3;
  font-size: 11px;
  font-weight: 700;
}

.body {
  padding: 16px 17px 17px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.title-row h3 {
  margin: 0;
  font-size: 16px;
}

.orders {
  font-size: 10px;
  color: #93a29b;
  white-space: nowrap;
}

.address {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #73857c;
  font-size: 11px;
  margin: 8px 0;
}

.desc {
  color: #96a49d;
  font-size: 11px;
  line-height: 1.65;
  min-height: 36px;
  margin: 0 0 14px;
}

.foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f0f4f2;
  padding-top: 12px;
}

.from {
  color: var(--fitness-primary-dark);
  font-weight: 800;
  font-size: 16px;
}

.count {
  color: #9aa8a1;
  font-size: 10px;
  margin-left: 7px;
}

.detail-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--fitness-primary);
  font-size: 11px;
  font-weight: 600;
}
</style>
