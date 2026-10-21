<template>
  <div class="page venues-page">
    <PageHeader title="场馆服务" subtitle="筛选附近优质场馆，找到适合你的训练方式与专业教练">
      <el-button plain @click="loadVenues">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </PageHeader>

    <section class="venue-banner">
      <div>
        <span class="banner-eyebrow">DISCOVER YOUR PLACE</span>
        <h2>找到你的训练主场</h2>
        <p>从力量训练到瑜伽普拉提，从私教课程到专业体测，一站发现身边的优质健身服务。</p>
      </div>
      <div class="banner-search">
        <el-input
          v-model="filters.keyword"
          size="large"
          placeholder="搜索场馆名称、地址或服务特色"
          clearable
          @keyup.enter="applyFilters"
          @clear="applyFilters"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
          <template #append>
            <el-button @click="applyFilters">搜索</el-button>
          </template>
        </el-input>
      </div>
      <div class="banner-shape" />
    </section>

    <section class="category-row">
      <button
        class="category-chip"
        :class="{ active: !filters.categoryId }"
        @click="selectCategory(null)"
      >
        <span class="chip-icon all"><el-icon><Grid /></el-icon></span>
        <span><strong>全部服务</strong><small>发现所有场馆</small></span>
      </button>
      <button
        v-for="category in categories"
        :key="category.id"
        class="category-chip"
        :class="{ active: filters.categoryId === category.id }"
        @click="selectCategory(category.id)"
      >
        <span class="chip-icon"><el-icon><component :is="category.icon || 'Tickets'" /></el-icon></span>
        <span><strong>{{ category.name }}</strong><small>{{ category.description }}</small></span>
      </button>
    </section>

    <div class="result-bar">
      <div class="result-copy">
        <strong>{{ total }}</strong> 家场馆
        <span v-if="filters.keyword">· 搜索“{{ filters.keyword }}”</span>
      </div>
      <div class="sort-tabs">
        <button
          v-for="item in sortOptions"
          :key="item.value"
          :class="{ active: filters.sort === item.value }"
          @click="changeSort(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div v-loading="loading" class="venue-list">
      <div v-if="venues.length" class="grid-3">
        <VenueCard v-for="venue in venues" :key="venue.id" :venue="venue" />
      </div>
      <div v-else-if="!loading" class="empty-panel panel-card">
        <el-icon style="font-size: 40px; color: #b9c6c0"><Search /></el-icon>
        <p>没有找到符合条件的场馆，换个筛选条件试试</p>
        <el-button type="primary" plain @click="resetFilters">清空筛选</el-button>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        background
        @current-change="loadVenues"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import request from '../../api/request';
import PageHeader from '../../components/PageHeader.vue';
import VenueCard from '../../components/VenueCard.vue';

const categories = ref([]);
const venues = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 9;
const filters = reactive({
  keyword: '',
  categoryId: null,
  sort: 'rating'
});

const sortOptions = [
  { label: '综合推荐', value: 'rating' },
  { label: '人气优先', value: 'orders' },
  { label: '最新入驻', value: 'newest' }
];

async function loadCategories() {
  categories.value = await request.get('/public/categories');
}

async function loadVenues() {
  loading.value = true;
  try {
    const data = await request.get('/public/venues', {
      params: {
        page: page.value,
        pageSize,
        keyword: filters.keyword || undefined,
        categoryId: filters.categoryId || undefined,
        sort: filters.sort
      }
    });
    venues.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  loadVenues();
}

function selectCategory(id) {
  filters.categoryId = id;
  applyFilters();
}

function changeSort(value) {
  filters.sort = value;
  applyFilters();
}

function resetFilters() {
  filters.keyword = '';
  filters.categoryId = null;
  filters.sort = 'rating';
  applyFilters();
}

onMounted(async () => {
  await loadCategories();
  await loadVenues();
});
</script>

<style scoped>
.venue-banner {
  border-radius: 22px;
  background:
    radial-gradient(circle at 88% 20%, rgba(200, 236, 102, 0.22), transparent 24%),
    linear-gradient(110deg, #102e22, #174a37);
  color: #f0f8f4;
  padding: 30px 34px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  position: relative;
  overflow: hidden;
  margin-bottom: 20px;
}

.banner-eyebrow {
  font-size: 8px;
  letter-spacing: 2.2px;
  color: var(--fitness-lime);
  font-weight: 700;
}

.venue-banner h2 {
  margin: 10px 0 8px;
  font-size: 27px;
  letter-spacing: -0.8px;
}

.venue-banner p {
  max-width: 470px;
  font-size: 11px;
  line-height: 1.8;
  color: rgba(240, 248, 244, 0.55);
  margin: 0;
}

.banner-search {
  width: min(420px, 45%);
  position: relative;
  z-index: 2;
}

.banner-search :deep(.el-input__wrapper) {
  height: 44px;
  border-radius: 12px 0 0 12px;
  box-shadow: none;
}

.banner-search :deep(.el-input-group__append) {
  background: var(--fitness-lime);
  border: 0;
  border-radius: 0 12px 12px 0;
  color: #19301f;
  font-weight: 700;
  box-shadow: none;
}

.banner-search :deep(.el-input-group__append .el-button) {
  color: #19301f;
}

.banner-shape {
  position: absolute;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  border: 1px solid rgba(200, 236, 102, 0.14);
  right: -100px;
  top: -150px;
}

.category-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 11px;
  margin-bottom: 20px;
}

.category-chip {
  border: 1px solid rgba(19, 59, 45, 0.06);
  background: #fff;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.category-chip:hover {
  border-color: #b9ded1;
  transform: translateY(-1px);
}

.category-chip.active {
  border-color: var(--fitness-primary);
  background: #f0faf6;
  box-shadow: 0 6px 18px rgba(15, 159, 120, 0.07);
}

.chip-icon {
  width: 33px;
  height: 33px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #eef8f3;
  color: var(--fitness-primary);
  font-size: 16px;
  flex-shrink: 0;
}

.chip-icon.all {
  background: #f6f1df;
  color: #b88b2c;
}

.category-chip > span:last-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.category-chip strong {
  font-size: 11px;
  color: #384d43;
}

.category-chip small {
  font-size: 8px;
  color: #a0aca6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.result-copy {
  font-size: 11px;
  color: #899890;
}

.result-copy strong {
  font-size: 18px;
  color: var(--fitness-ink);
  margin-right: 3px;
}

.sort-tabs {
  display: flex;
  background: #eaf0ed;
  border-radius: 9px;
  padding: 3px;
}

.sort-tabs button {
  border: 0;
  background: transparent;
  padding: 6px 12px;
  border-radius: 7px;
  font-size: 10px;
  color: #7c8c84;
  cursor: pointer;
}

.sort-tabs button.active {
  background: #fff;
  color: var(--fitness-ink);
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(16, 53, 39, 0.08);
}

.venue-list {
  min-height: 240px;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 26px;
}

@media (max-width: 1100px) {
  .category-row {
    grid-template-columns: repeat(3, 1fr);
  }
  .venue-banner {
    flex-direction: column;
    align-items: flex-start;
  }
  .banner-search {
    width: 100%;
  }
}

@media (max-width: 700px) {
  .category-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .result-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }
}

@media (max-width: 460px) {
  .category-row {
    grid-template-columns: 1fr;
  }
  .venue-banner {
    padding: 24px 20px;
  }
}
</style>
