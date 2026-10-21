const { fn, col } = require('sequelize');
const { Coach, Appointment } = require('../models');

async function listByProvider(providerId) {
  const rows = await Coach.findAll({
    where: { provider_id: providerId },
    order: [['status', 'DESC'], ['id', 'ASC']]
  });
  const counts = await Appointment.findAll({
    where: { coach_id: { [require('sequelize').Op.in]: rows.length ? rows.map((item) => item.id) : [0] } },
    attributes: ['coach_id', [fn('COUNT', col('id')), 'total']],
    group: ['coach_id'],
    raw: true
  });
  const map = new Map(counts.map((item) => [item.coach_id, Number(item.total)]));
  return rows.map((item) => ({
    ...item.get({ plain: true }),
    order_count: map.get(item.id) || 0
  }));
}

async function listActive(providerId) {
  return Coach.findAll({
    where: { provider_id: providerId, status: 1 },
    order: [['id', 'ASC']]
  });
}

async function findById(id, providerId = null) {
  const where = { id };
  if (providerId) where.provider_id = providerId;
  return Coach.findOne({ where });
}

async function create(data) {
  return Coach.create(data);
}

async function update(id, providerId, data) {
  await Coach.update(data, { where: { id, provider_id: providerId } });
  return findById(id, providerId);
}

async function setStatus(id, providerId, status) {
  return Coach.update({ status }, { where: { id, provider_id: providerId } });
}

module.exports = { listByProvider, listActive, findById, create, update, setStatus };
