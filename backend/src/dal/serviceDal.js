const { Op, fn, col, literal } = require('sequelize');
const { Service, Provider, ServiceCategory, Appointment, Review } = require('../models');

function formatService(item) {
  const plain = item.get ? item.get({ plain: true }) : item;
  return {
    ...plain,
    provider_name: plain.provider?.name ?? plain.provider_name,
    provider_rating: plain.provider?.rating ?? plain.provider_rating,
    address: plain.provider?.address ?? plain.address,
    city: plain.provider?.city ?? plain.city,
    provider_phone: plain.provider?.phone ?? plain.provider_phone,
    business_hours: plain.provider?.business_hours ?? plain.business_hours,
    category_name: plain.category?.name ?? plain.category_name
  };
}

async function findById(id) {
  return Service.findByPk(id);
}

async function findWithProvider(id) {
  return Service.findByPk(id, {
    include: [
      { model: Provider, as: 'provider', required: true },
      { model: ServiceCategory, as: 'category', required: true }
    ]
  });
}

async function listPublic({ keyword, categoryId, minPrice, maxPrice, providerId, sort, limit, offset }) {
  const where = { status: 'on' };
  if (keyword) {
    const like = `%${keyword}%`;
    where[Op.or] = [
      { name: { [Op.like]: like } },
      { description: { [Op.like]: like } },
      { '$provider.name$': { [Op.like]: like } }
    ];
  }
  if (categoryId) where.category_id = Number(categoryId);
  if (minPrice !== undefined && minPrice !== '') where.price = { [Op.gte]: Number(minPrice) };
  if (maxPrice !== undefined && maxPrice !== '') {
    where.price = { ...(where.price || {}), [Op.lte]: Number(maxPrice) };
  }
  if (providerId) where.provider_id = Number(providerId);

  const orderMap = {
    sales: [['sales', 'DESC'], ['id', 'DESC']],
    rating: [['rating', 'DESC'], ['sales', 'DESC']],
    price_asc: [['price', 'ASC']],
    price_desc: [['price', 'DESC']],
    newest: [['created_at', 'DESC']]
  };

  const { count, rows } = await Service.findAndCountAll({
    where,
    include: [
      {
        model: Provider,
        as: 'provider',
        required: true,
        where: { status: 'approved' },
        attributes: ['id', 'name', 'address', 'city', 'phone', 'rating', 'business_hours']
      },
      { model: ServiceCategory, as: 'category', required: true, attributes: ['id', 'name'] }
    ],
    order: orderMap[sort] || orderMap.sales,
    limit,
    offset,
    distinct: true,
    subQuery: false
  });
  return { rows: rows.map(formatService), count };
}

async function findByProvider(providerId) {
  const rows = await Service.findAll({
    where: { provider_id: providerId },
    include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'name'] }],
    order: [['status', 'ASC'], ['id', 'DESC']]
  });
  const orderCounts = await Appointment.findAll({
    where: { service_id: { [Op.in]: rows.length ? rows.map((item) => item.id) : [0] } },
    attributes: ['service_id', [fn('COUNT', col('id')), 'total']],
    group: ['service_id'],
    raw: true
  });
  const map = new Map(orderCounts.map((item) => [item.service_id, Number(item.total)]));
  return rows.map((item) => ({
    ...formatService(item),
    order_count: map.get(item.id) || 0
  }));
}

async function listByProvider(providerId) {
  return findByProvider(providerId);
}

async function create(data) {
  return Service.create(data);
}

async function update(id, data) {
  await Service.update(data, { where: { id } });
  return findById(id);
}

async function updateByProvider(id, providerId, data) {
  await Service.update(data, { where: { id, provider_id: providerId } });
  return Service.findOne({ where: { id, provider_id: providerId } });
}

async function setStatus(id, providerId, status) {
  return Service.update({ status }, { where: { id, provider_id: providerId } });
}

async function incrementSales(id, transaction) {
  return Service.increment('sales', { by: 1, where: { id }, transaction });
}

async function findVenueServices(providerId) {
  const rows = await Service.findAll({
    where: { provider_id: providerId, status: 'on' },
    include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'name'] }],
    order: [['sales', 'DESC'], ['id', 'DESC']]
  });
  return rows.map(formatService);
}

async function getServiceReviews(serviceId, limit = 10) {
  const { User } = require('../models');
  const rows = await Review.findAll({
    where: { service_id: serviceId, status: 'approved' },
    include: [{ model: User, as: 'user', attributes: ['nickname', 'avatar'] }],
    order: [['created_at', 'DESC']],
    limit
  });
  return rows.map((item) => {
    const plain = item.get({ plain: true });
    return { ...plain, nickname: plain.user?.nickname, avatar: plain.user?.avatar };
  });
}

async function countByProvider(providerId) {
  return Service.count({ where: { provider_id: providerId } });
}

module.exports = {
  findById,
  findWithProvider,
  listPublic,
  findByProvider,
  listByProvider,
  create,
  update,
  updateByProvider,
  setStatus,
  incrementSales,
  findVenueServices,
  getServiceReviews,
  countByProvider,
  formatService
};
