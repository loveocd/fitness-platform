const { Op, fn, col, literal } = require('sequelize');
const {
  CheckinRecord,
  CheckinRule,
  Provider,
  User,
  Appointment,
  Service
} = require('../models');

function formatCheckin(item) {
  const plain = item.get ? item.get({ plain: true }) : item;
  return {
    ...plain,
    provider_name: plain.provider?.name ?? plain.provider_name,
    user_name: plain.user?.nickname,
    user_phone: plain.user?.phone,
    user_avatar: plain.user?.avatar,
    appointment_no: plain.appointment?.appointment_no,
    service_name: plain.appointment?.service?.name
  };
}

function monthRange(month) {
  const [year, value] = String(month).split('-').map(Number);
  const start = `${year}-${String(value).padStart(2, '0')}-01`;
  const lastDay = new Date(year, value, 0).getDate();
  const end = `${year}-${String(value).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

async function listForUser(userId, month) {
  const { start, end } = monthRange(month);
  const rows = await CheckinRecord.findAll({
    where: { user_id: userId, checkin_date: { [Op.between]: [start, end] } },
    include: [
      { model: Provider, as: 'provider', required: false, attributes: ['id', 'name'] },
      {
        model: Appointment,
        as: 'appointment',
        required: false,
        attributes: ['id', 'appointment_no'],
        include: [{ model: Service, as: 'service', required: false, attributes: ['name'] }]
      }
    ],
    order: [
      ['checkin_date', 'DESC'],
      ['id', 'DESC']
    ]
  });
  return rows.map(formatCheckin);
}

async function statsForUser(userId, month) {
  const { start, end } = monthRange(month);
  const items = await CheckinRecord.findAll({
    where: {
      user_id: userId,
      status: 'approved',
      checkin_date: { [Op.between]: [start, end] }
    },
    attributes: [
      [fn('COUNT', col('id')), 'total_checkins'],
      [fn('COALESCE', fn('SUM', col('duration_minutes')), 0), 'total_minutes'],
      [fn('COALESCE', fn('SUM', col('calories')), 0), 'total_calories'],
      [fn('COALESCE', fn('SUM', col('points')), 0), 'total_points']
    ],
    raw: true
  });
  return items[0] || {};
}

async function countTodaySelf(userId) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  return CheckinRecord.count({
    where: {
      user_id: userId,
      checkin_type: 'self',
      checkin_date: today,
      status: { [Op.ne]: 'rejected' }
    }
  });
}

async function weekActivity(userId) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
    start.getDate()
  ).padStart(2, '0')}`;
  const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(
    end.getDate()
  ).padStart(2, '0')}`;
  return CheckinRecord.findAll({
    where: {
      user_id: userId,
      status: 'approved',
      checkin_date: { [Op.between]: [startKey, endKey] }
    },
    attributes: [
      'checkin_date',
      [fn('COUNT', col('id')), 'total'],
      [fn('SUM', col('calories')), 'calories']
    ],
    group: ['checkin_date'],
    order: [['checkin_date', 'ASC']],
    raw: true
  });
}

async function findByAppointment(appointmentId, excludeRejected = true) {
  const where = { appointment_id: appointmentId };
  if (excludeRejected) where.status = { [Op.ne]: 'rejected' };
  return CheckinRecord.findOne({ where });
}

async function create(data, transaction) {
  return CheckinRecord.create(data, { transaction });
}

async function listForProvider(providerId, { status, month }) {
  const where = { provider_id: providerId };
  if (status && status !== 'all') where.status = status;
  if (month) {
    const { start, end } = monthRange(month);
    where.checkin_date = { [Op.between]: [start, end] };
  }
  const rows = await CheckinRecord.findAll({
    where,
    include: [
      { model: User, as: 'user', required: true, attributes: ['id', 'nickname', 'phone', 'avatar'] },
      {
        model: Appointment,
        as: 'appointment',
        required: false,
        attributes: ['id', 'appointment_no'],
        include: [{ model: Service, as: 'service', required: false, attributes: ['name'] }]
      }
    ],
    order: [['checkin_time', 'DESC']],
    limit: 100
  });
  return rows.map(formatCheckin);
}

async function countsForProvider(providerId) {
  return CheckinRecord.findAll({
    where: { provider_id: providerId },
    attributes: ['status', [fn('COUNT', col('id')), 'total']],
    group: ['status'],
    raw: true
  });
}

async function summaryForProvider(providerId) {
  const rows = await CheckinRecord.findAll({
    where: { provider_id: providerId },
    attributes: [
      [fn('COUNT', col('id')), 'total_checkins'],
      [
        literal("COALESCE(SUM(CASE WHEN status = 'approved' THEN points ELSE 0 END), 0)"),
        'approved_points'
      ]
    ],
    raw: true
  });
  return rows[0] || {};
}

async function findById(id, providerId = null) {
  const where = { id };
  if (providerId) where.provider_id = providerId;
  return CheckinRecord.findOne({ where });
}

async function updateStatus(id, providerId, data) {
  return CheckinRecord.update(data, { where: { id, provider_id: providerId } });
}

async function count(where) {
  return CheckinRecord.count({ where });
}

async function sumCalories(where) {
  const value = await CheckinRecord.sum('calories', { where });
  return Number(value || 0);
}

module.exports = {
  listForUser,
  statsForUser,
  countTodaySelf,
  weekActivity,
  findByAppointment,
  create,
  listForProvider,
  countsForProvider,
  summaryForProvider,
  findById,
  updateStatus,
  count,
  sumCalories,
  monthRange,
  formatCheckin
};
