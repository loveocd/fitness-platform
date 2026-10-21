const { Op, fn, col, literal } = require('sequelize');
const { Review, User, Provider, Service, Appointment } = require('../models');

function format(item) {
  const plain = item.get ? item.get({ plain: true }) : item;
  return {
    ...plain,
    user_name: plain.user?.nickname,
    user_avatar: plain.user?.avatar,
    provider_name: plain.provider?.name,
    service_name: plain.service?.name,
    appointment_no: plain.appointment?.appointment_no
  };
}

async function listForUser(userId) {
  const rows = await Review.findAll({
    where: { user_id: userId },
    include: [
      { model: Service, as: 'service', required: true, attributes: ['id', 'name', 'cover'] },
      { model: Provider, as: 'provider', required: true, attributes: ['id', 'name'] }
    ],
    order: [['created_at', 'DESC']]
  });
  return rows.map(format);
}

async function create(data, transaction) {
  return Review.create(data, { transaction });
}

async function findById(id) {
  return Review.findByPk(id);
}

async function findByAppointmentId(appointmentId) {
  return Review.findOne({ where: { appointment_id: appointmentId } });
}

async function listForProvider(providerId, { status, rating }) {
  const where = { provider_id: providerId };
  if (status && status !== 'all') where.status = status;
  if (rating) where.rating = Number(rating);
  const rows = await Review.findAll({
    where,
    include: [
      { model: User, as: 'user', required: true, attributes: ['id', 'nickname', 'avatar'] },
      { model: Service, as: 'service', required: true, attributes: ['id', 'name'] },
      { model: Appointment, as: 'appointment', required: false, attributes: ['id', 'appointment_no'] }
    ],
    order: [['created_at', 'DESC']]
  });
  return rows.map(format);
}

async function summaryForProvider(providerId) {
  const rows = await Review.findAll({
    where: { provider_id: providerId, status: 'approved' },
    attributes: [
      [fn('COUNT', col('id')), 'total'],
      [fn('ROUND', fn('AVG', col('rating')), 1), 'average'],
      [literal('SUM(rating = 5)'), 'five'],
      [literal('SUM(rating = 4)'), 'four'],
      [literal('SUM(rating = 3)'), 'three'],
      [literal('SUM(rating = 2)'), 'two'],
      [literal('SUM(rating = 1)'), 'one'],
      [literal("SUM(reply IS NULL OR reply = '')"), 'unreplied']
    ],
    raw: true
  });
  return rows[0] || {};
}

async function ratingSummaryForProvider(providerId) {
  return summaryForProvider(providerId);
}

async function ratingSummaryForService(serviceId) {
  const rows = await Review.findAll({
    where: { service_id: serviceId, status: 'approved' },
    attributes: [
      [fn('COUNT', col('id')), 'total'],
      [fn('ROUND', fn('AVG', col('rating')), 1), 'average'],
      [literal('SUM(rating = 5)'), 'five'],
      [literal('SUM(rating = 4)'), 'four'],
      [literal('SUM(rating = 3)'), 'three'],
      [literal('SUM(rating = 2)'), 'two'],
      [literal('SUM(rating = 1)'), 'one']
    ],
    raw: true
  });
  return rows[0] || {};
}

async function reply(id, providerId, replyText) {
  return Review.update(
    { reply: replyText, replied_at: new Date() },
    { where: { id, provider_id: providerId } }
  );
}

async function listForAdmin({ status, keyword, rating, limit, offset }) {
  const where = {};
  if (status && status !== 'all') where.status = status;
  if (rating) where.rating = Number(rating);
  if (keyword) {
    const like = `%${keyword}%`;
    where[Op.or] = [
      { content: { [Op.like]: like } },
      { '$user.nickname$': { [Op.like]: like } },
      { '$provider.name$': { [Op.like]: like } },
      { '$service.name$': { [Op.like]: like } }
    ];
  }
  const { count, rows } = await Review.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', required: true, attributes: ['id', 'nickname', 'avatar'] },
      { model: Provider, as: 'provider', required: true, attributes: ['id', 'name'] },
      { model: Service, as: 'service', required: true, attributes: ['id', 'name'] },
      { model: Appointment, as: 'appointment', required: false, attributes: ['id', 'appointment_no'] }
    ],
    order: [
      [literal("FIELD(`Review`.`status`, 'pending', 'approved', 'rejected')"), 'ASC'],
      ['created_at', 'DESC']
    ],
    limit,
    offset,
    distinct: true,
    subQuery: false
  });
  return { rows: rows.map(format), count };
}

async function countsForAdmin() {
  return Review.findAll({
    attributes: ['status', [fn('COUNT', col('id')), 'total']],
    group: ['status'],
    raw: true
  });
}

async function audit(id, status, auditRemark) {
  return Review.update({ status, audit_remark: auditRemark || null }, { where: { id } });
}

async function recalculateRatings(providerId, serviceId) {
  const provider = await ratingSummaryForProvider(providerId);
  await Provider.update(
    { rating: Number(provider.average || 5) },
    { where: { id: providerId } }
  );
  if (serviceId) {
    const service = await ratingSummaryForService(serviceId);
    await Service.update(
      { rating: Number(service.average || 5) },
      { where: { id: serviceId } }
    );
  }
}

async function listForVenue(providerId, limit = 20) {
  const rows = await Review.findAll({
    where: { provider_id: providerId, status: 'approved' },
    include: [
      { model: User, as: 'user', required: true, attributes: ['nickname', 'avatar'] },
      { model: Service, as: 'service', required: true, attributes: ['name'] }
    ],
    order: [['created_at', 'DESC']],
    limit
  });
  return rows.map(format);
}

module.exports = {
  listForUser,
  create,
  findById,
  findByAppointmentId,
  listForProvider,
  summaryForProvider,
  ratingSummaryForProvider,
  ratingSummaryForService,
  reply,
  listForAdmin,
  countsForAdmin,
  audit,
  recalculateRatings,
  listForVenue,
  format
};
