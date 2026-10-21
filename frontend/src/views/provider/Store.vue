<template>
  <div class="page" v-loading="loading">
    <PageHeader title="门店信息" subtitle="完善门店展示与服务信息，提升会员的信任与预约转化">
      <el-button type="primary" :loading="saving" @click="save">
        <el-icon><Check /></el-icon>保存资料
      </el-button>
    </PageHeader>

    <el-alert
      v-if="provider && provider.status !== 'approved'"
      class="store-alert"
      :type="provider.status === 'pending' ? 'warning' : provider.status === 'rejected' ? 'error' : 'info'"
      :closable="false"
      show-icon
    >
      <template #title>
        <span v-if="provider.status === 'pending'">门店资料正在审核中，审核通过后即可正式对外营业。</span>
        <span v-else-if="provider.status === 'rejected'">
          审核未通过：{{ provider.reject_reason }}。修改并保存资料后将重新提交审核。
        </span>
        <span v-else>门店已停用，请联系平台管理员。</span>
      </template>
    </el-alert>

    <div class="store-layout">
      <section class="panel-card store-form-panel">
        <div class="panel-title">
          <div>
            <h2>基础资料</h2>
            <span>这些信息会展示在会员端场馆详情页</span>
          </div>
        </div>
        <el-form :model="form" label-position="top">
          <el-form-item label="门店名称">
            <el-input v-model="form.name" maxlength="100" placeholder="请输入门店名称" />
          </el-form-item>
          <div class="form-grid">
            <el-form-item label="所在城市">
              <el-input v-model="form.city" placeholder="例如：上海" />
            </el-form-item>
            <el-form-item label="联系电话">
              <el-input v-model="form.phone" placeholder="门店对外联系电话" />
            </el-form-item>
            <el-form-item label="营业时间">
              <el-input v-model="form.business_hours" placeholder="例如：09:00-22:00" />
            </el-form-item>
            <el-form-item label="营业执照编号">
              <el-input v-model="form.license_no" placeholder="统一社会信用代码" />
            </el-form-item>
          </div>
          <el-form-item label="详细地址">
            <el-input v-model="form.address" placeholder="省市区 + 街道门牌 + 楼层">
              <template #prefix><el-icon><Location /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item label="门店简介">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="5"
              maxlength="500"
              show-word-limit
              placeholder="介绍场馆环境、设备特色、服务理念等"
            />
          </el-form-item>

          <div class="section-divider"><span>门店视觉</span><i /></div>
          <el-form-item label="封面图片地址">
            <el-input v-model="form.cover" placeholder="填写图片 URL">
              <template #prefix><el-icon><Picture /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item label="Logo 图片地址">
            <el-input v-model="form.logo" placeholder="填写 Logo URL">
              <template #prefix><el-icon><PictureRounded /></el-icon></template>
            </el-input>
          </el-form-item>
        </el-form>
      </section>

      <aside class="store-preview">
        <div class="panel-card preview-panel">
          <div class="panel-title">
            <div>
              <h2>会员端预览</h2>
              <span>实时查看展示效果</span>
            </div>
            <span class="preview-tag">PREVIEW</span>
          </div>
          <div class="preview-card">
            <div class="preview-cover">
              <el-image :src="form.cover" fit="cover" class="preview-image">
                <template #error><div class="preview-fallback"><el-icon><OfficeBuilding /></el-icon></div></template>
              </el-image>
              <div class="preview-shade" />
              <span class="preview-rating"><el-icon><StarFilled /></el-icon>{{ provider?.rating || '5.0' }}</span>
            </div>
            <div class="preview-body">
              <h3>{{ form.name || '门店名称' }}</h3>
              <p class="preview-address"><el-icon><Location /></el-icon>{{ form.address || '门店地址' }}</p>
              <p class="preview-desc line-clamp-3">{{ form.description || '门店简介将展示在这里。' }}</p>
              <div class="preview-foot">
                <span>{{ form.business_hours || '营业时间' }}</span>
                <strong>查看详情</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-card store-state">
          <div class="state-head">
            <span class="state-icon"><el-icon><Shop /></el-icon></span>
            <div>
              <h3>门店状态</h3>
              <p>平台审核状态</p>
            </div>
            <StatusTag :status="provider?.status" kind="provider" />
          </div>
          <div class="state-row">
            <span>入驻时间</span>
            <strong>{{ formatDate(provider?.created_at) }}</strong>
          </div>
          <div class="state-row">
            <span>本月订单</span>
            <strong>{{ provider?.monthly_orders || 0 }} 单</strong>
          </div>
          <div class="state-row">
            <span>门店评分</span>
            <strong>{{ provider?.rating || '5.0' }} 分</strong>
          </div>
          <div class="state-tip">
            <el-icon><InfoFilled /></el-icon>
            资料修改会立即生效，平台有权对违规内容进行下线处理。
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../api/request';
import { useAuthStore } from '../../stores/auth';
import PageHeader from '../../components/PageHeader.vue';
import StatusTag from '../../components/StatusTag.vue';
import { formatDate } from '../../utils/constants';

const auth = useAuthStore();
const loading = ref(true);
const saving = ref(false);
const provider = ref(null);
const form = reactive({
  name: '',
  logo: '',
  cover: '',
  description: '',
  address: '',
  city: '',
  phone: '',
  business_hours: '',
  license_no: ''
});

async function load() {
  loading.value = true;
  try {
    const data = await request.get('/provider/profile');
    provider.value = data;
    Object.keys(form).forEach((key) => {
      form[key] = data[key] || '';
    });
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!form.name.trim()) return ElMessage.warning('请输入门店名称');
  saving.value = true;
  try {
    await request.put('/provider/profile', { ...form });
    ElMessage.success(provider.value?.status === 'rejected' ? '资料已更新，已重新提交审核' : '门店资料已保存');
    await load();
    auth.updateLocalUser({ provider: provider.value });
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.store-alert {
  border-radius: 11px;
  margin-bottom: 16px;
}

.store-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(330px, 0.65fr);
  gap: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 15px;
}

.section-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 16px;
  font-size: 10px;
  font-weight: 700;
  color: #61746a;
}

.section-divider i {
  flex: 1;
  height: 1px;
  background: #edf1ef;
}

.store-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-panel {
  padding: 18px;
}

.preview-tag {
  font-size: 7px !important;
  letter-spacing: 1.5px;
  color: var(--fitness-primary) !important;
  background: #eaf7f2;
  border-radius: 99px;
  padding: 3px 7px;
}

.preview-card {
  border: 1px solid #e9efec;
  border-radius: 16px;
  overflow: hidden;
}

.preview-cover {
  height: 155px;
  position: relative;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.preview-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 40px;
  background: linear-gradient(140deg, #174633, #0f2d21);
  color: var(--fitness-lime);
}

.preview-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(6, 24, 17, 0.5), transparent 55%);
}

.preview-rating {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  gap: 3px;
  color: #ffe19c;
  font-size: 10px;
  font-weight: 700;
}

.preview-body {
  padding: 13px 14px;
}

.preview-body h3 {
  margin: 0;
  font-size: 15px;
}

.preview-address {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #7c8d84;
  font-size: 9px;
  margin: 6px 0;
}

.preview-desc {
  color: #9aa7a0;
  font-size: 9px;
  line-height: 1.6;
  min-height: 43px;
  margin: 0 0 10px;
}

.preview-foot {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #f0f4f2;
  padding-top: 9px;
  font-size: 8px;
  color: #9aa7a0;
}

.preview-foot strong {
  color: var(--fitness-primary);
}

.store-state {
  padding: 18px;
}

.state-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 13px;
}

.state-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #eaf7f2;
  color: var(--fitness-primary);
  display: grid;
  place-items: center;
  font-size: 17px;
}

.state-head div {
  flex: 1;
}

.state-head h3 {
  margin: 0;
  font-size: 12px;
}

.state-head p {
  margin: 2px 0 0;
  font-size: 8px;
  color: #9aa7a0;
}

.state-row {
  display: flex;
  justify-content: space-between;
  padding: 9px 0;
  border-top: 1px solid #f2f5f3;
  font-size: 9px;
}

.state-row span {
  color: #8e9c95;
}

.state-tip {
  display: flex;
  gap: 5px;
  background: #f7faf8;
  border-radius: 8px;
  padding: 9px;
  font-size: 8px;
  line-height: 1.6;
  color: #8f9d96;
  margin-top: 10px;
}

@media (max-width: 1000px) {
  .store-layout {
    grid-template-columns: 1fr;
  }
  .store-preview {
    flex-direction: row;
  }
  .store-preview > * {
    flex: 1;
  }
}

@media (max-width: 700px) {
  .store-preview {
    flex-direction: column;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
