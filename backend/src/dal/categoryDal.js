const { Op, fn, col } = require('sequelize');
const { ServiceCategory, Service } = require('../models');

async function listPublic() {
  return ServiceCategory.findAll({
    where: { status: 1 },
    order: [['sort_order', 'ASC'], ['id', 'ASC']]
  });
}

async function listAdmin() {
  const categories = await ServiceCategory.findAll({
    order: [['sort_order', 'ASC'], ['id', 'ASC']]
  });
  const counts = await Service.findAll({
    attributes: ['category_id', [fn('COUNT', col('id')), 'total']],
    group: ['category_id'],
    raw: true
  });
  const map = new Map(counts.map((item) => [item.category_id, Number(item.total)]));
  return categories.map((item) => ({
    ...item.get({ plain: true }),
    service_count: map.get(item.id) || 0
  }));
}

async function findAll() {
  return ServiceCategory.findAll({
    order: [['sort_order', 'ASC'], ['id', 'ASC']]
  });
}

async function findById(id) {
  return ServiceCategory.findByPk(id);
}

async function findByName(name, excludeId = null) {
  const where = { name };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return ServiceCategory.findOne({ where });
}

async function create(data) {
  return ServiceCategory.create(data);
}

async function update(id, data) {
  await ServiceCategory.update(data, { where: { id } });
  return findById(id);
}

async function remove(id) {
  return ServiceCategory.destroy({ where: { id } });
}

async function countServices(categoryId) {
  return Service.count({ where: { category_id: categoryId } });
}

module.exports = {
  listPublic,
  listAdmin,
  findAll,
  findById,
  findByName,
  create,
  update,
  remove,
  countServices
};
