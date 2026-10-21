const { Op, fn, col } = require('sequelize');
const { BodyTest, User, Provider, Coach, Appointment } = require('../models');

function format(item) {
  const plain = item.get ? item.get({ plain: true }) : item;
  return {
    ...plain,
    provider_name: plain.provider?.name,
    user_name: plain.user?.nickname,
    user_phone: plain.user?.phone,
    user_avatar: plain.user?.avatar,
    coach_name: plain.coach?.name
  };
}

async function listForUser(userId) {
  const rows = await BodyTest.findAll({
    where: { user_id: userId },
    include: [
      { model: Provider, as: 'provider', required: true, attributes: ['id', 'name'] },
      { model: Coach, as: 'coach', required: false, attributes: ['id', 'name'] }
    ],
    order: [['test_date', 'DESC'], ['id', 'DESC']]
  });
  return rows.map(format);
}

async function create(data, transaction) {
  return BodyTest.create(data, { transaction });
}

async function listForProvider(providerId, keyword) {
  const where = { provider_id: providerId };
  if (keyword) {
    const like = `%${keyword}%`;
    where['$user.nickname$'] = { [Op.like]: like };
  }
  const rows = await BodyTest.findAll({
    where,
    include: [
      { model: User, as: 'user', required: true, attributes: ['id', 'nickname', 'phone', 'avatar'] },
      { model: Coach, as: 'coach', required: false, attributes: ['id', 'name'] }
    ],
    order: [['test_date', 'DESC'], ['id', 'DESC']],
    limit: 200,
    subQuery: false
  });
  return rows.map(format);
}

async function studentsForProvider(providerId) {
  const appointments = await Appointment.findAll({
    where: { provider_id: providerId, status: { [Op.in]: ['confirmed', 'completed'] } },
    attributes: ['user_id'],
    include: [{ model: User, as: 'user', required: true, attributes: ['id', 'nickname', 'phone', 'avatar'] }],
    group: ['Appointment.user_id', 'user.id'],
    order: [['user_id', 'DESC']]
  });
  return appointments.map((item) => item.user.get({ plain: true }));
}

async function findById(id, providerId = null) {
  const where = { id };
  if (providerId) where.provider_id = providerId;
  return BodyTest.findOne({ where });
}

async function update(id, providerId, data) {
  await BodyTest.update(data, { where: { id, provider_id: providerId } });
  return findById(id, providerId);
}

async function latestForUser(userId) {
  return BodyTest.findOne({
    where: { user_id: userId },
    order: [['test_date', 'DESC'], ['id', 'DESC']]
  });
}

module.exports = { listForUser, create, listForProvider, studentsForProvider, findById, update, latestForUser };
