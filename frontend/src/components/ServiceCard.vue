<template>
  <article class="service-card">
    <div class="cover-wrap">
      <el-image :src="service.cover" fit="cover" class="cover">
        <template #error>
          <div class="cover-fallback"><el-icon><Tickets /></el-icon></div>
        </template>
      </el-image>
      <span v-if="service.category_name" class="category">{{ service.category_name }}</span>
      <button v-if="showFavorite" class="favorite" :class="{ active: favorite }" @click.stop="$emit('favorite')">
        <el-icon><StarFilled v-if="favorite" /><Star v-else /></el-icon>
      </button>
    </div>
    <div class="body">
      <div class="title-row">
        <h3 class="line-clamp-1">{{ service.name }}</h3>
        <span class="rating"><el-icon><StarFilled /></el-icon>{{ service.rating || '5.0' }}</span>
      </div>
      <p class="provider line-clamp-1">{{ service.provider_name }}</p>
      <div v-if="service.tags" class="tags">
        <span v-for="tag in String(service.tags).split(',').slice(0, 2)" :key="tag">{{ tag }}</span>
      </div>
      <div class="meta">
        <span><el-icon><Timer /></el-icon>{{ service.duration }} 分钟</span>
        <span>已售 {{ service.sales || 0 }}</span>
      </div>
      <div class="foot">
        <div class="price">
          {{ currency(service.price) }}
          <small v-if="service.original_price">/ {{ currency(service.original_price) }}</small>
        </div>
        <el-button type="primary" size="small" round @click="$emit('book')">立即预约</el-button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { currency } from '../utils/constants';

defineProps({
  service: { type: Object, required: true },
  showFavorite: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false }
});

defineEmits(['favorite', 'book']);
</script>

<style scoped>
.service-card {
  background: #fff;
  border: 1px solid rgba(19, 59, 45, 0.06);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--fitness-shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
}

.service-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 36px rgba(18, 50, 40, 0.11);
}

.cover-wrap {
  position: relative;
  height: 164px;
  overflow: hidden;
}

.cover {
  width: 100%;
  height: 100%;
  display: block;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 34px;
  background: linear-gradient(135deg, #d9f5e9, #aadfc9);
  color: #157a5d;
}

.category {
  position: absolute;
  left: 12px;
  top: 12px;
  padding: 4px 9px;
  border-radius: 99px;
  background: rgba(11, 35, 26, 0.68);
  color: #fff;
  font-size: 10px;
  backdrop-filter: blur(6px);
}

.favorite {
  position: absolute;
  right: 11px;
  top: 10px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #77877f;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.favorite.active {
  color: #f0a500;
}

.body {
  padding: 15px 16px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.title-row h3 {
  font-size: 15px;
  margin: 0;
}

.rating {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #d89512;
  font-weight: 700;
}

.provider {
  margin: 7px 0 8px;
  color: var(--fitness-muted);
  font-size: 11px;
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tags span {
  background: #f2f7f4;
  color: #688078;
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 10px;
}

.meta {
  display: flex;
  justify-content: space-between;
  color: #94a29b;
  font-size: 10px;
  margin: 12px 0 13px;
}

.meta span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.foot .price {
  font-size: 19px;
}

.foot .price small {
  font-size: 10px;
  text-decoration: line-through;
}
</style>
