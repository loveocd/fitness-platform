export const orderStatusMap = {
  pending: { label: '待确认', type: 'warning' },
  confirmed: { label: '已确认', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  cancelled: { label: '已取消', type: 'info' },
  refunded: { label: '已退款', type: 'danger' }
};

export const checkinStatusMap = {
  pending: { label: '待核验', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' }
};

export const reviewStatusMap = {
  pending: { label: '待审核', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' }
};

export const providerStatusMap = {
  pending: { label: '待审核', type: 'warning' },
  approved: { label: '营业中', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' },
  disabled: { label: '已停用', type: 'info' }
};

export const timeSlots = [
  '07:00-08:00',
  '08:00-09:00',
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
  '18:00-19:00',
  '19:00-20:00',
  '20:00-21:00',
  '21:00-22:00'
];

export const fitnessIntensityOptions = [
  { label: '轻松恢复', value: 'low', factor: 5 },
  { label: '中等强度', value: 'medium', factor: 7 },
  { label: '高强度', value: 'high', factor: 9 }
];

export function currency(value) {
  const number = Number(value || 0);
  return `¥${number.toFixed(number % 1 === 0 ? 0 : 2)}`;
}

export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ];
  if (!withTime) return parts.join('-');
  return `${parts.join('-')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

export function monthText(month) {
  if (!month) return '';
  const [year, value] = month.split('-');
  return `${year} 年 ${Number(value)} 月`;
}
