const { Favorite, Service, Provider, ServiceCategory } = require('../models');

async function listForUser(userId) {
  const rows = await Favorite.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Service,
        as: 'service',
        required: true,
        where: { status: 'on' },
        include: [
          { model: Provider, as: 'provider', required: true, where: { status: 'approved' } },
          { model: ServiceCategory, as: 'category', required: true, attributes: ['id', 'name'] }
        ]
      }
    ],
    order: [['created_at', 'DESC']]
  });
  return rows.map((item) => {
    const plain = item.get({ plain: true });
    return {
      favorite_id: plain.id,
      favorited_at: plain.created_at,
      ...plain.service,
      provider_id: plain.service.provider_id,
      provider_name: plain.service.provider?.name,
      address: plain.service.provider?.address,
      category_name: plain.service.category?.name
    };
  });
}

async function add(userId, serviceId) {
  return Favorite.findOrCreate({
    where: { user_id: userId, service_id: serviceId },
    defaults: { user_id: userId, service_id: serviceId }
  });
}

async function remove(userId, serviceId) {
  return Favorite.destroy({ where: { user_id: userId, service_id: serviceId } });
}

async function count(userId) {
  return Favorite.count({ where: { user_id: userId } });
}

module.exports = { listForUser, add, remove, count };
