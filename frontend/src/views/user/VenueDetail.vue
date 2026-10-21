<template>
  <div class="page venue-detail" v-loading="loading">
    <div class="back-row">
      <el-button text @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>返回场馆列表
      </el-button>
    </div>

    <template v-if="provider">
      <section class="venue-hero">
        <el-image :src="provider.cover" fit="cover" class="hero-image">
          <template #error>
            <div class="hero-fallback"><el-icon><OfficeBuilding /></el-icon></div>
          </template>
        </el-image>
        <div class="hero-overlay" />
        <div class="hero-info">
          <div class="venue-badge"><i />平台认证场馆</div>
          <h1>{{ provider.name }}</h1>
          <div class="hero-meta">
            <span><el-icon><StarFilled /></el-icon>{{ provider.rating }} 分</span>
            <span><el-icon><Location /></el-icon>{{ provider.address }}</span>
            <span><el-icon><Clock /></el-icon>{{ provider.business_hours }}</span>
          </div>
          <div class="hero-tags">
            <span>专业教练</span>
            <span>在线预约</span>
            <span>到店打卡</span>
          </div>
        </div>
        <div class="hero-side-card">
          <div class="side-rating">
            <strong>{{ provider.rating }}</strong>
            <div>
              <el-rate :model-value="Number(provider.rating)" disabled />
              <span>{{ ratingSummary.total || 0 }} 条真实评价</span>
            </div>
          </div>
          <div class="side-line" />
          <p>{{ provider.description }}</p>
          <el-button type="primary" class="book-main-btn" @click="openBooking(services[0])">
            立即预约<el-icon><Right /></el-icon>
          </el-button>
          <a :href="`tel:${provider.phone}`" class="phone-link">
            <el-icon><Phone /></el-icon>{{ provider.phone }}
          </a>
        </div>
      </section>

      <section class="tabs-panel">
        <div class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.count !== undefined">{{ tab.count }}</span>
          </button>
        </div>

        <div v-if="activeTab === 'services'" class="tab-content">
          <div class="content-heading">
            <div>
              <h2>场馆服务</h2>
              <p>选择适合你的课程与服务，支持在线预约</p>
            </div>
            <span>{{ services.length }} 项在售</span>
          </div>
          <div class="grid-3">
            <ServiceCard
              v-for="service in servicesWithProvider"
              :key="service.id"
              :service="service"
              show-favorite
              :favorite="favoriteIds.has(service.id)"
              @favorite="toggleFavorite(service.id)"
              @book="openBooking(service)"
            />
          </div>
        </div>

        <div v-else-if="activeTab === 'coaches'" class="tab-content">
          <div class="content-heading">
            <div>
              <h2>教练团队</h2>
              <p>专业认证教练，为你的每一次训练保驾护航</p>
            </div>
            <span>{{ coaches.length }} 位教练</span>
          </div>
          <div class="coach-grid">
            <article v-for="coach in coaches" :key="coach.id" class="coach-card">
              <div class="coach-avatar-wrap">
                <img v-if="coach.avatar" :src="coach.avatar" :alt="coach.name" class="coach-avatar" />
                <div v-else class="coach-avatar fallback">{{ coach.name.slice(0, 1) }}</div>
                <span class="coach-badge">认证教练</span>
              </div>
              <div class="coach-copy">
                <div class="coach-name-row">
                  <h3>{{ coach.name }}</h3>
                  <span><el-icon><StarFilled /></el-icon>{{ coach.rating }}</span>
                </div>
                <p class="coach-title">{{ coach.title }} · {{ coach.experience_years }} 年经验</p>
                <div class="coach-specialties">
                  <span v-for="item in String(coach.specialties || '').split('、').slice(0, 3)" :key="item">{{ item }}</span>
                </div>
                <p class="coach-intro line-clamp-2">{{ coach.intro }}</p>
                <el-button plain type="primary" size="small" round @click="openBooking(services[0], coach)">
                  选择 TA 预约
                </el-button>
              </div>
            </article>
          </div>
        </div>

        <div v-else class="tab-content">
          <div class="review-layout">
            <div class="rating-summary-card">
              <span class="summary-label">综合评分</span>
              <strong>{{ ratingSummary.average || provider.rating }}</strong>
              <el-rate :model-value="Number(ratingSummary.average || provider.rating)" disabled />
              <p>来自 {{ ratingSummary.total || 0 }} 位用户的真实体验</p>
              <div class="rating-bars">
                <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="rating-bar">
                  <span>{{ star }} 星</span>
                  <div class="bar-track">
                    <i :style="{ width: `${ratingPercent(star)}%` }" />
                  </div>
                  <b>{{ ratingSummary[starKey(star)] || 0 }}</b>
                </div>
              </div>
            </div>
            <div class="review-list">
              <div v-for="review in reviews" :key="review.id" class="review-item">
                <div class="review-head">
                  <img v-if="review.avatar" :src="review.avatar" class="avatar" alt="" />
                  <span v-else class="avatar">{{ (review.nickname || 'U').slice(0, 1) }}</span>
                  <div class="review-user">
                    <strong>{{ review.nickname }}</strong>
                    <span>{{ formatDate(review.created_at) }} · {{ review.service_name }}</span>
                  </div>
                  <el-rate :model-value="review.rating" disabled />
                </div>
                <p class="review-content">{{ review.content }}</p>
                <div v-if="review.reply" class="merchant-reply">
                  <strong>商家回复</strong>
                  <p>{{ review.reply }}</p>
                </div>
              </div>
              <el-empty v-if="!reviews.length" description="暂时还没有评价" :image-size="80" />
            </div>
          </div>
        </div>
      </section>
    </template>

    <el-dialog v-model="bookingVisible" width="560px" title="预约服务" destroy-on-close>
      <div v-if="selectedService" class="booking-service">
        <el-image :src="selectedService.cover" fit="cover" class="booking-cover">
          <template #error><div class="booking-cover-fallback"><el-icon><Tickets /></el-icon></div></template>
        </el-image>
        <div>
          <h3>{{ selectedService.name }}</h3>
          <p>{{ selectedService.category_name }} · {{ selectedService.duration }} 分钟</p>
          <span class="booking-price">{{ currency(selectedService.price) }}</span>
        </div>
      </div>
      <el-form ref="bookingRef" :model="bookingForm" :rules="bookingRules" label-position="top">
        <div class="form-grid">
          <el-form-item label="预约日期" prop="appointment_date">
            <el-date-picker
              v-model="bookingForm.appointment_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              :disabled-date="disabledDate"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="预约时段" prop="time_slot">
            <el-select v-model="bookingForm.time_slot" placeholder="选择时段" style="width: 100%">
              <el-option v-for="slot in timeSlots" :key="slot" :label="slot" :value="slot" />
            </el-select>
          </el-form-item>
          <el-form-item label="指定教练">
            <el-select v-model="bookingForm.coach_id" placeholder="可选，不指定则门店安排" clearable style="width: 100%">
              <el-option
                v-for="coach in coaches"
                :key="coach.id"
                :label="`${coach.name} · ${coach.title}`"
                :value="coach.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="预约人数">
            <el-input-number v-model="bookingForm.people_count" :min="1" :max="10" style="width: 100%" />
          </el-form-item>
          <el-form-item label="联系人" prop="contact_name">
            <el-input v-model="bookingForm.contact_name" placeholder="请输入联系人姓名" />
          </el-form-item>
          <el-form-item label="联系电话" prop="contact_phone">
            <el-input v-model="bookingForm.contact_phone" placeholder="请输入手机号" />
          </el-form-item>
        </div>
        <el-form-item label="备注">
          <el-input v-model="bookingForm.remark" type="textarea" :rows="2" placeholder="例如：训练目标、身体情况等（选填）" />
        </el-form-item>
      </el-form>
      <div class="booking-foot">
        <div>
          合计 <strong>{{ currency(bookingAmount) }}</strong>
          <span>到店后按门店规则支付</span>
        </div>
        <el-button type="primary" :loading="submitting" @click="submitBooking">提交预约</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../api/request';
import { useAuthStore } from '../../stores/auth';
import ServiceCard from '../../components/ServiceCard.vue';
import { currency, formatDate, timeSlots } from '../../utils/constants';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const loading = ref(true);
const provider = ref(null);
const services = ref([]);
const coaches = ref([]);
const reviews = ref([]);
const ratingSummary = ref({});
const favoriteIds = ref(new Set());
const activeTab = ref('services');
const bookingVisible = ref(false);
const selectedService = ref(null);
const bookingRef = ref();
const submitting = ref(false);

const bookingForm = reactive({
  appointment_date: '',
  time_slot: '',
  coach_id: null,
  people_count: 1,
  contact_name: auth.user?.real_name || auth.user?.nickname || '',
  contact_phone: auth.user?.phone || '',
  remark: ''
});

const bookingRules = {
  appointment_date: [{ required: true, message: '请选择预约日期', trigger: 'change' }],
  time_slot: [{ required: true, message: '请选择预约时段', trigger: 'change' }],
  contact_name: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contact_phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
};

const tabs = computed(() => [
  { key: 'services', label: '服务项目', count: services.value.length },
  { key: 'coaches', label: '教练团队', count: coaches.value.length },
  { key: 'reviews', label: '用户评价', count: ratingSummary.value.total || 0 }
]);

const servicesWithProvider = computed(() =>
  services.value.map((item) => ({ ...item, provider_name: provider.value?.name }))
);
const bookingAmount = computed(
  () => Number(selectedService.value?.price || 0) * Number(bookingForm.people_count || 1)
);

function starKey(star) {
  return ['one', 'two', 'three', 'four', 'five'][star - 1];
}
function ratingPercent(star) {
  const total = Number(ratingSummary.value.total || 0);
  return total ? Math.round((Number(ratingSummary.value[starKey(star)] || 0) / total) * 100) : 0;
}
function disabledDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function openBooking(service, coach = null) {
  if (!service) return ElMessage.warning('该场馆暂未上架可预约服务');
  selectedService.value = service;
  bookingForm.coach_id = coach?.id || null;
  bookingForm.appointment_date = '';
  bookingForm.time_slot = '';
  bookingForm.people_count = 1;
  bookingForm.remark = '';
  bookingForm.contact_name = auth.user?.real_name || auth.user?.nickname || '';
  bookingForm.contact_phone = auth.user?.phone || '';
  bookingVisible.value = true;
}

async function toggleFavorite(serviceId) {
  try {
    if (favoriteIds.value.has(serviceId)) {
      await request.delete(`/user/favorites/${serviceId}`);
      favoriteIds.value.delete(serviceId);
      favoriteIds.value = new Set(favoriteIds.value);
      ElMessage.success('已取消收藏');
    } else {
      await request.post(`/user/favorites/${serviceId}`);
      favoriteIds.value.add(serviceId);
      favoriteIds.value = new Set(favoriteIds.value);
      ElMessage.success('已加入收藏');
    }
  } catch {
    // 统一提示
  }
}

async function submitBooking() {
  const valid = await bookingRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await request.post('/user/appointments', {
      service_id: selectedService.value.id,
      ...bookingForm
    });
    bookingVisible.value = false;
    await ElMessageBox.alert('预约已提交，门店确认后会通过消息通知你。', '预约成功', {
      confirmButtonText: '查看我的预约'
    });
    router.push('/user/appointments');
  } catch {
    // 统一提示
  } finally {
    submitting.value = false;
  }
}

async function loadDetail() {
  loading.value = true;
  try {
    const [detail, favorites] = await Promise.all([
      request.get(`/public/venues/${route.params.id}`),
      request.get('/user/favorites')
    ]);
    provider.value = detail.provider;
    services.value = detail.services;
    coaches.value = detail.coaches;
    reviews.value = detail.reviews;
    ratingSummary.value = detail.ratingSummary;
    favoriteIds.value = new Set(favorites.map((item) => item.id));
  } finally {
    loading.value = false;
  }
}

onMounted(loadDetail);
</script>

<style scoped>
.back-row {
  margin-bottom: 10px;
}

.back-row :deep(.el-button) {
  color: #708078;
  font-size: 11px;
}

.venue-hero {
  height: 365px;
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: flex-end;
  box-shadow: 0 24px 55px rgba(10, 38, 26, 0.18);
}

.hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #123328;
  color: var(--fitness-lime);
  font-size: 60px;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(4, 22, 15, 0.92) 0%, rgba(4, 22, 15, 0.64) 48%, rgba(4, 22, 15, 0.2) 100%),
    linear-gradient(0deg, rgba(3, 18, 12, 0.7), transparent 55%);
}

.hero-info {
  position: relative;
  z-index: 2;
  padding: 38px 40px;
  max-width: 65%;
  color: #fff;
}

.venue-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(200, 236, 102, 0.3);
  background: rgba(200, 236, 102, 0.08);
  color: var(--fitness-lime);
  border-radius: 99px;
  padding: 4px 10px;
  font-size: 9px;
}

.venue-badge i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--fitness-lime);
}

.hero-info h1 {
  font-size: clamp(28px, 3.4vw, 42px);
  margin: 14px 0 14px;
  letter-spacing: -1.4px;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.hero-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.62);
}

.hero-meta span:first-child {
  color: #ffe09a;
  font-weight: 700;
}

.hero-tags {
  display: flex;
  gap: 7px;
  margin-top: 15px;
}

.hero-tags span {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(5px);
}

.hero-side-card {
  position: absolute;
  right: 26px;
  bottom: 26px;
  width: 260px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
  border-radius: 17px;
  padding: 17px;
  z-index: 2;
  color: var(--fitness-ink);
}

.side-rating {
  display: flex;
  align-items: center;
  gap: 10px;
}

.side-rating strong {
  font-size: 30px;
  color: var(--fitness-primary-dark);
}

.side-rating > div {
  display: flex;
  flex-direction: column;
}

.side-rating :deep(.el-rate) {
  height: 16px;
}

.side-rating :deep(.el-rate__icon) {
  font-size: 12px;
  margin-right: 1px;
}

.side-rating span {
  font-size: 8px;
  color: #98a59e;
}

.side-line {
  height: 1px;
  background: #edf1ef;
  margin: 10px 0;
}

.hero-side-card p {
  font-size: 9px;
  line-height: 1.65;
  color: #7d8c85;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0 0 12px;
}

.book-main-btn {
  width: 100%;
  border-radius: 9px;
}

.phone-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #7e8e86;
  font-size: 10px;
  margin-top: 9px;
}

.tabs-panel {
  margin-top: 20px;
  background: transparent;
}

.tab-nav {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #e3eae6;
  margin-bottom: 20px;
}

.tab-nav button {
  border: 0;
  background: transparent;
  padding: 12px 18px;
  font-size: 12px;
  color: #819088;
  cursor: pointer;
  position: relative;
  font-weight: 600;
}

.tab-nav button.active {
  color: var(--fitness-primary-dark);
}

.tab-nav button.active::after {
  content: '';
  position: absolute;
  height: 2px;
  background: var(--fitness-primary);
  left: 18px;
  right: 18px;
  bottom: -1px;
  border-radius: 2px;
}

.tab-nav button span {
  margin-left: 5px;
  font-size: 9px;
  background: #e9f5f0;
  color: var(--fitness-primary);
  border-radius: 99px;
  padding: 1px 6px;
}

.content-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 15px;
}

.content-heading h2 {
  margin: 0 0 5px;
  font-size: 19px;
}

.content-heading p {
  margin: 0;
  font-size: 10px;
  color: #95a29b;
}

.content-heading > span {
  font-size: 10px;
  color: #95a29b;
}

.coach-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.coach-card {
  background: #fff;
  border-radius: 18px;
  border: 1px solid rgba(19, 59, 45, 0.06);
  padding: 17px;
  display: flex;
  gap: 16px;
  box-shadow: var(--fitness-shadow);
}

.coach-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.coach-avatar {
  width: 100px;
  height: 126px;
  border-radius: 14px;
  object-fit: cover;
}

.coach-avatar.fallback {
  display: grid;
  place-items: center;
  font-size: 34px;
  background: linear-gradient(145deg, #e9f8f2, #bce5d5);
  color: #157a5d;
  font-weight: 800;
}

.coach-badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  background: rgba(9, 32, 23, 0.68);
  color: #e8f5ee;
  font-size: 8px;
  padding: 3px 6px;
  border-radius: 99px;
  backdrop-filter: blur(4px);
}

.coach-copy {
  flex: 1;
  min-width: 0;
}

.coach-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.coach-name-row h3 {
  margin: 0;
  font-size: 16px;
}

.coach-name-row span {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #d68e13;
  font-size: 10px;
  font-weight: 700;
}

.coach-title {
  margin: 5px 0 8px;
  font-size: 10px;
  color: #7f8f87;
}

.coach-specialties {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 8px;
}

.coach-specialties span {
  background: #f1f8f4;
  color: #5c7d6f;
  border-radius: 5px;
  padding: 3px 6px;
  font-size: 8px;
}

.coach-intro {
  font-size: 9px;
  line-height: 1.65;
  color: #93a098;
  margin: 0 0 10px;
}

.review-layout {
  display: grid;
  grid-template-columns: 270px 1fr;
  gap: 18px;
}

.rating-summary-card {
  background: #fff;
  border-radius: 18px;
  padding: 22px;
  height: fit-content;
  border: 1px solid rgba(19, 59, 45, 0.06);
  box-shadow: var(--fitness-shadow);
}

.summary-label {
  font-size: 10px;
  color: #8b9a92;
}

.rating-summary-card > strong {
  display: block;
  font-size: 44px;
  line-height: 1.1;
  margin: 6px 0 2px;
  color: var(--fitness-primary-dark);
}

.rating-summary-card > p {
  font-size: 9px;
  color: #98a59e;
  margin: 5px 0 16px;
}

.rating-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rating-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 8px;
  color: #89978f;
}

.rating-bar > span {
  width: 25px;
}

.bar-track {
  flex: 1;
  height: 4px;
  background: #f0f3f1;
  border-radius: 99px;
  overflow: hidden;
}

.bar-track i {
  display: block;
  height: 100%;
  background: #eab545;
  border-radius: 99px;
}

.rating-bar b {
  width: 15px;
  text-align: right;
  font-weight: 500;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-item {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  border: 1px solid rgba(19, 59, 45, 0.06);
}

.review-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.review-user {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.review-user strong {
  font-size: 11px;
}

.review-user span {
  font-size: 8px;
  color: #9ba8a1;
}

.review-head :deep(.el-rate__icon) {
  font-size: 12px;
}

.review-content {
  font-size: 11px;
  line-height: 1.8;
  color: #596d63;
  margin: 12px 0 0;
}

.merchant-reply {
  background: #f6f9f7;
  border-radius: 9px;
  padding: 9px 12px;
  margin-top: 10px;
}

.merchant-reply strong {
  font-size: 8px;
  color: var(--fitness-primary);
}

.merchant-reply p {
  margin: 4px 0 0;
  font-size: 9px;
  line-height: 1.6;
  color: #788880;
}

.booking-service {
  display: flex;
  gap: 13px;
  padding: 12px;
  border-radius: 13px;
  background: #f6f9f7;
  margin-bottom: 18px;
}

.booking-cover {
  width: 86px;
  height: 68px;
  border-radius: 9px;
  flex-shrink: 0;
}

.booking-cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #d9efe5;
  color: #1b8d69;
  font-size: 24px;
}

.booking-service h3 {
  margin: 2px 0 5px;
  font-size: 14px;
}

.booking-service p {
  margin: 0 0 7px;
  font-size: 9px;
  color: #8c9a93;
}

.booking-price {
  color: var(--fitness-primary-dark);
  font-weight: 800;
  font-size: 17px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 14px;
}

.booking-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #edf1ef;
  padding-top: 15px;
}

.booking-foot > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 10px;
  color: #8e9c95;
}

.booking-foot strong {
  font-size: 22px;
  color: var(--fitness-primary-dark);
}

.booking-foot span {
  font-size: 8px;
  color: #a6b1ac;
}

@media (max-width: 1000px) {
  .hero-side-card {
    display: none;
  }
  .hero-info {
    max-width: 100%;
  }
  .coach-grid {
    grid-template-columns: 1fr;
  }
  .review-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .venue-hero {
    height: 330px;
  }
  .hero-info {
    padding: 24px 20px;
  }
  .hero-meta span:nth-child(3) {
    display: none;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .coach-card {
    flex-direction: column;
  }
  .coach-avatar {
    width: 100%;
    height: 160px;
  }
}
</style>
