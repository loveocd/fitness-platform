const { Op, fn, col } = require('sequelize');
const {
  Appointment,
  AppointmentLog,
  Service,
  Provider,
  Coach,
  User,
  Review
} = require('../models');

function formatUserAppointment(item) {
  const plain = item.get ? item.get({ plain: true }) : item;
  return {
    ...plain,
    service_name: plain.service?.name,
    cover: plain.service?.cover,
    duration: plain.service?.duration,
    service_description: plain.service?.description,
    category_id: plain.service?.category_id,
    description: plain.service?.description,
    provider_name: plain.provider?.name,
    provider_address: plain.provider?.address,
    provider_phone: plain.provider?.phone,
    business_hours: plain.provider?.business_hours,
    coach_name: plain.coach?.name,
    coach_avatar: plain.coach?.avatar,
    coach_title: plain.coach?.title,
    review_id: plain.review?.id || null
  };
}

function formatProviderAppointment(item) {
  const plain = item.get ? item.get({ plain: true }) : item;
  return {
    ...plain,
    user_name: plain.user?.nickname,
    user_phone: plain.user?.phone,
    user_avatar: plain.user?.avatar,
    service_name: plain.service?.name,
    duration: plain.service?.duration,
    service_description: plain.service?.description,
    coach_name: plain.coach?.name,
    provider_name: plain.provider?.name,
    provider_phone: plain.provider?.phone
  };
}

const userIncludes = [
  { model: Service, as: 'service', required: true },
  { model: Provider, as: 'provider', required: true },
  { model: Coach, as: 'coach', required: false },
  { model: Review, as: 'review', required: false, attributes: ['id'] }
];

async function listForUser(userId, status) {
  const where = { user_id: userId };
  if (status && status !== 'all') where.status = status;
  const rows = await Appointment.findAll({
    where,
    include: userIncludes,
    order: [
      ['appointment_date', 'DESC'],
      ['created_at', 'DESC']
    ]
  });
  return rows.map(formatUserAppointment);
}

async function detailForUser(id, userId) {
  const item = await Appointment.findOne({
    where: { id, user_id: userId },
    include: [
      ...userIncludes,
      { model: AppointmentLog, as: 'logs', required: false }
    ]
  });
  if (!item) return null;
  const plain = formatUserAppointment(item);
  plain.logs = (item.logs || [])
    .map((log) => log.get({ plain: true }))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return plain;
}

async function listForProvider(providerId, { status, keyword, limit, offset }) {
  const where = { provider_id: providerId };
  if (status && status !== 'all') where.status = status;
  if (keyword) {
    const like = `%${keyword}%`;
    where[Op.or] = [
      { appointment_no: { [Op.like]: like } },
      { '$user.nickname$': { [Op.like]: like } },
      { '$user.phone$': { [Op.like]: like } },
      { '$service.name$': { [Op.like]: like } }
    ];
  }
  const { count, rows } = await Appointment.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', required: true, attributes: ['id', 'nickname', 'phone', 'avatar'] },
      { model: Service, as: 'service', required: true, attributes: ['id', 'name', 'duration'] },
      { model: Coach, as: 'coach', required: false, attributes: ['id', 'name'] }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
    subQuery: false
  });
  return { rows: rows.map(formatProviderAppointment), count };
}

async function detailForProvider(id, providerId) {
  const item = await Appointment.findOne({
    where: { id, provider_id: providerId },
    include: [
      { model: User, as: 'user', required: true, attributes: ['id', 'nickname', 'phone', 'avatar'] },
      { model: Service, as: 'service', required: true },
      { model: Coach, as: 'coach', required: false },
      { model: AppointmentLog, as: 'logs', required: false }
    ]
  });
  if (!item) return null;
  const plain = formatProviderAppointment(item);
  plain.logs = (item.logs || [])
    .map((log) => log.get({ plain: true }))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return plain;
}

async function listForAdmin({ status, keyword, providerId, limit, offset }) {
  const where = {};
  if (status && status !== 'all') where.status = status;
  if (providerId) where.provider_id = Number(providerId);
  if (keyword) {
    const like = `%${keyword}%`;
    where[Op.or] = [
      { appointment_no: { [Op.like]: like } },
      { '$user.nickname$': { [Op.like]: like } },
      { '$provider.name$': { [Op.like]: like } },
      { '$service.name$': { [Op.like]: like } }
    ];
  }
  const { count, rows } = await Appointment.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', required: true, attributes: ['id', 'nickname', 'phone'] },
      { model: Provider, as: 'provider', required: true, attributes: ['id', 'name', 'phone'] },
      { model: Service, as: 'service', required: true, attributes: ['id', 'name'] },
      { model: Coach, as: 'coach', required: false, attributes: ['id', 'name'] }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
    subQuery: false
  });
  return { rows: rows.map(formatProviderAppointment), count };
}

async function detailForAdmin(id) {
  const item = await Appointment.findByPk(id, {
    include: [
      { model: User, as: 'user', required: true, attributes: ['id', 'nickname', 'phone'] },
      { model: Provider, as: 'provider', required: true, attributes: ['id', 'name', 'phone', 'user_id'] },
      { model: Service, as: 'service', required: true },
      { model: Coach, as: 'coach', required: false },
      { model: AppointmentLog, as: 'logs', required: false }
    ]
  });
  if (!item) return null;
  const plain = formatProviderAppointment(item);
  plain.logs = (item.logs || [])
    .map((log) => log.get({ plain: true }))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return plain;
}

async function findById(id) {
  return Appointment.findByPk(id);
}

async function findWithRelations(id, options = {}) {
  return Appointment.findByPk(id, {
    include: [
      { model: Service, as: 'service', required: true },
      { model: Provider, as: 'provider', required: true },
      { model: User, as: 'user', required: true, attributes: ['id', 'nickname', 'phone'] },
      { model: Coach, as: 'coach', required: false }
    ],
    ...options
  });
}

async function create(data, transaction) {
  return Appointment.create(data, { transaction });
}

async function update(id, data, transaction) {
  return Appointment.update(data, { where: { id }, transaction });
}

async function sumBooked(serviceId, appointmentDate, timeSlot, transaction) {
  return Appointment.sum('people_count', {
    where: {
      service_id: serviceId,
      appointment_date: appointmentDate,
      time_slot: timeSlot,
      status: { [Op.in]: ['pending', 'confirmed'] }
    },
    transaction
  });
}

async function addLog(data, transaction) {
  return AppointmentLog.create(data, { transaction });
}

async function listLogs(appointmentId) {
  return AppointmentLog.findAll({
    where: { appointment_id: appointmentId },
    order: [['created_at', 'ASC'], ['id', 'ASC']]
  });
}

async function countsByStatus(where = {}) {
  return Appointment.findAll({
    attributes: ['status', [fn('COUNT', col('id')), 'total']],
    where,
    group: ['status'],
    raw: true
  });
}

async function count(where) {
  return Appointment.count({ where });
}

async function countUpcoming(userId) {
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
  return Appointment.count({
    where: {
      user_id: userId,
      status: { [Op.in]: ['pending', 'confirmed'] },
      appointment_date: { [Op.gte]: today }
    }
  });
}

async function sumAmount(where) {
  const value = await Appointment.sum('amount', { where });
  return Number(value || 0);
}

module.exports = {
  listForUser,
  detailForUser,
  listForProvider,
  detailForProvider,
  listForAdmin,
  detailForAdmin,
  findById,
  findWithRelations,
  create,
  update,
  sumBooked,
  addLog,
  listLogs,
  countsByStatus,
  count,
  countUpcoming,
  sumAmount,
  formatUserAppointment,
  formatProviderAppointment
};
