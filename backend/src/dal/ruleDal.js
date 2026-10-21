const { CheckinRule } = require('../models');

async function list() {
  return CheckinRule.findAll({ order: [['id', 'ASC']] });
}

async function listActive() {
  return CheckinRule.findAll({ where: { status: 1 }, order: [['checkin_type', 'DESC'], ['id', 'ASC']] });
}

async function latestByType(checkinType) {
  return CheckinRule.findOne({
    where: { checkin_type: checkinType, status: 1 },
    order: [['id', 'DESC']]
  });
}

async function findById(id) {
  return CheckinRule.findByPk(id);
}

async function create(data) {
  return CheckinRule.create(data);
}

async function update(id, data) {
  await CheckinRule.update(data, { where: { id } });
  return findById(id);
}

async function remove(id) {
  return CheckinRule.destroy({ where: { id } });
}

module.exports = { list, listActive, latestByType, findById, create, update, remove };
