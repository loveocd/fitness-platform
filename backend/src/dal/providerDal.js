const { Op, fn, col, literal } = require('sequelize');
const { Provider, User, Service, Coach, Appointment, Review } = require('../models');

async function findByUserId(userId) {
  return Provider.findOne({
    where: { user_id: userId },
    include: [{ model: User, as: 'owner', attributes: ['id', 'nickname', 'phone', 'email'] }]
  });
}

async function findById(id) {
  return Provider.findByPk(id, {
    include: [{ model: User, as: 'owner', attributes: ['id', 'nickname', 'phone', 'email'] }]
  });
}

async function create(data, transaction) {
  return Provider.create(data, { transaction });
}

async function update(id, data) {
  await Provider.update(data, { where: { id } });
  return findById(id);
}

async function listPublic({ keyword, categoryId, city, sort, limit, offset }) {
  const where = { status: 'approved' };
  if (keyword) {
    const like = `%${keyword}%`;
    where[Op.or] = [
      { name: { [Op.like]: like } },
      { description: { [Op.like]: like } },
      { address: { [Op.like]: like } }
    ];
  }
  if (city) where.city = city;

  const include = [];
  if (categoryId) {
    const matches = await Service.findAll({
      where: { category_id: Number(categoryId), status: 'on' },
      attributes: ['provider_id'],
      group: ['provider_id'],
      raw: true
    });
    where.id = { [Op.in]: matches.map((item) => item.provider_id) };
  }

  const orderMap = {
    rating: [['rating', 'DESC'], ['monthly_orders', 'DESC']],
    orders: [['monthly_orders', 'DESC'], ['rating', 'DESC']],
    newest: [['created_at', 'DESC']]
  };

  const { count, rows } = await Provider.findAndCountAll({
    where,
    include,
    distinct: true,
    order: orderMap[sort] || orderMap.rating,
    limit,
    offset
  });

  const ids = rows.map((item) => item.id);
  if (!ids.length) return { rows: [], count };

  const [serviceRows, reviewRows] = await Promise.all([
    Service.findAll({
      where: { provider_id: { [Op.in]: ids }, status: 'on' },
      attributes: [
        'provider_id',
        [fn('MIN', col('price')), 'min_price'],
        [fn('COUNT', col('id')), 'service_count']
      ],
      group: ['provider_id'],
      raw: true
    }),
    Review.findAll({
      where: { provider_id: { [Op.in]: ids }, status: 'approved' },
      attributes: ['provider_id', [fn('COUNT', col('id')), 'review_count']],
      group: ['provider_id'],
      raw: true
    })
  ]);

  const serviceMap = new Map(serviceRows.map((item) => [item.provider_id, item]));
  const reviewMap = new Map(reviewRows.map((item) => [item.provider_id, item]));
  const list = rows.map((item) => {
    const plain = item.get({ plain: true });
    const service = serviceMap.get(item.id);
    const review = reviewMap.get(item.id);
    return {
      ...plain,
      min_price: service?.min_price ?? null,
      service_count: Number(service?.service_count || 0),
      review_count: Number(review?.review_count || 0)
    };
  });
  return { rows: list, count };
}

async function listAdmin({ status, keyword, limit, offset }) {
  const where = {};
  if (status && status !== 'all') where.status = status;
  if (keyword) {
    const like = `%${keyword}%`;
    where[Op.or] = [
      { name: { [Op.like]: like } },
      { address: { [Op.like]: like } },
      { '$owner.nickname$': { [Op.like]: like } },
      { '$owner.phone$': { [Op.like]: like } }
    ];
  }

  const { count, rows } = await Provider.findAndCountAll({
    where,
    include: [{ model: User, as: 'owner', attributes: ['id', 'nickname', 'phone', 'email'] }],
    order: [
      [
        literal("FIELD(`Provider`.`status`, 'pending', 'approved', 'rejected', 'disabled')"),
        'ASC'
      ],
      ['created_at', 'DESC']
    ],
    limit,
    offset,
    subQuery: false
  });

  const ids = rows.map((item) => item.id);
  const [serviceCounts, coachCounts, orderCounts, statusCounts] = await Promise.all([
    Service.findAll({
      where: { provider_id: { [Op.in]: ids.length ? ids : [0] } },
      attributes: ['provider_id', [fn('COUNT', col('id')), 'total']],
      group: ['provider_id'],
      raw: true
    }),
    Coach.findAll({
      where: { provider_id: { [Op.in]: ids.length ? ids : [0] } },
      attributes: ['provider_id', [fn('COUNT', col('id')), 'total']],
      group: ['provider_id'],
      raw: true
    }),
    Appointment.findAll({
      where: { provider_id: { [Op.in]: ids.length ? ids : [0] } },
      attributes: ['provider_id', [fn('COUNT', col('id')), 'total']],
      group: ['provider_id'],
      raw: true
    }),
    Provider.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'total']],
      group: ['status'],
      raw: true
    })
  ]);
  const toMap = (list) => new Map(list.map((item) => [item.provider_id, Number(item.total)]));
  const serviceMap = toMap(serviceCounts);
  const coachMap = toMap(coachCounts);
  const orderMap = toMap(orderCounts);

  return {
    rows: rows.map((item) => {
      const plain = item.get({ plain: true });
      const owner = plain.owner || {};
      return {
        ...plain,
        owner_name: owner.nickname,
        owner_phone: owner.phone,
        owner_email: owner.email,
        service_count: serviceMap.get(item.id) || 0,
        coach_count: coachMap.get(item.id) || 0,
        order_count: orderMap.get(item.id) || 0
      };
    }),
    count,
    statusCounts
  };
}

async function setAudit(id, status, rejectReason) {
  return Provider.update(
    { status, reject_reason: status === 'rejected' ? rejectReason : null },
    { where: { id } }
  );
}

async function setStatus(id, status) {
  return Provider.update({ status }, { where: { id } });
}

async function countByStatus() {
  return Provider.findAll({
    attributes: ['status', [fn('COUNT', col('id')), 'total']],
    group: ['status'],
    raw: true
  });
}

async function listApproved() {
  return Provider.findAll({ where: { status: 'approved' }, order: [['id', 'ASC']] });
}

module.exports = {
  findByUserId,
  findById,
  create,
  update,
  listPublic,
  listAdmin,
  setAudit,
  setStatus,
  countByStatus,
  listApproved
};
