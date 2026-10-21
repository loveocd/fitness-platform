const { Op, fn, col } = require('sequelize');
const { User, Provider, Appointment, CheckinRecord } = require('../models');

const baseAttributes = [
  'id',
  'username',
  'nickname',
  'real_name',
  'phone',
  'email',
  'avatar',
  'gender',
  'birthday',
  'role',
  'points',
  'status',
  'last_login_at',
  'created_at'
];

async function findByUsername(username) {
  return User.findOne({ where: { username } });
}

async function findAuthById(id) {
  return User.findByPk(id, {
    attributes: [...baseAttributes, 'password']
  });
}

async function findProfile(id) {
  return User.findByPk(id, {
    attributes: baseAttributes,
    include: [{ model: Provider, as: 'provider', required: false }]
  });
}

async function updateProfile(id, data) {
  await User.update(data, { where: { id } });
  return findProfile(id);
}

async function getPassword(id) {
  const user = await User.findByPk(id, { attributes: ['id', 'password'] });
  return user?.password;
}

async function updatePassword(id, password) {
  return User.update({ password }, { where: { id } });
}

async function updateLastLogin(id) {
  return User.update({ last_login_at: new Date() }, { where: { id } });
}

async function create(data, transaction) {
  return User.create(data, { transaction });
}

async function findAdmins(transaction) {
  return User.findAll({
    where: { role: 'admin', status: 1 },
    attributes: ['id'],
    transaction
  });
}

async function incrementPoints(id, points, transaction) {
  const user = await User.findByPk(id, { transaction });
  if (!user) return null;
  return user.increment('points', { by: Number(points || 0), transaction });
}

async function isPhoneTaken(phone, excludeId = null) {
  const where = { phone };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return Boolean(await User.findOne({ where, attributes: ['id'] }));
}

async function countByRole(role) {
  return User.count({ where: { role } });
}

async function listForAdmin({ role, keyword, status, limit, offset }) {
  const where = { role: { [Op.ne]: 'admin' } };
  if (role && role !== 'all') where.role = role;
  if (status !== undefined && status !== '' && status !== 'all') where.status = Number(status);
  if (keyword) {
    const like = `%${keyword}%`;
    where[Op.or] = [
      { username: { [Op.like]: like } },
      { nickname: { [Op.like]: like } },
      { phone: { [Op.like]: like } },
      { real_name: { [Op.like]: like } }
    ];
  }
  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: baseAttributes,
    include: [{ model: Provider, as: 'provider', required: false }],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
  const ids = rows.map((item) => item.id);
  if (!ids.length) return { rows: [], count };
  const [orderCounts, checkinCounts] = await Promise.all([
    Appointment.findAll({
      where: { user_id: { [Op.in]: ids } },
      attributes: ['user_id', [fn('COUNT', col('id')), 'total']],
      group: ['user_id'],
      raw: true
    }),
    CheckinRecord.findAll({
      where: { user_id: { [Op.in]: ids } },
      attributes: ['user_id', [fn('COUNT', col('id')), 'total']],
      group: ['user_id'],
      raw: true
    })
  ]);
  const orderMap = new Map(orderCounts.map((item) => [item.user_id, Number(item.total)]));
  const checkinMap = new Map(checkinCounts.map((item) => [item.user_id, Number(item.total)]));
  return {
    rows: rows.map((item) => {
      const plain = item.get({ plain: true });
      return {
        ...plain,
        provider_name: plain.provider?.name,
        provider_status: plain.provider?.status,
        order_count: orderMap.get(item.id) || 0,
        checkin_count: checkinMap.get(item.id) || 0
      };
    }),
    count
  };
}

async function setStatus(id, status) {
  return User.update({ status }, { where: { id } });
}

module.exports = {
  findByUsername,
  findAuthById,
  findProfile,
  updateProfile,
  getPassword,
  updatePassword,
  updateLastLogin,
  create,
  findAdmins,
  incrementPoints,
  isPhoneTaken,
  countByRole,
  listForAdmin,
  setStatus
};
