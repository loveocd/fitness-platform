const { Op } = require('sequelize');
const { Notification } = require('../models');

async function createMany(rows, transaction) {
  if (!rows.length) return [];
  return Notification.bulkCreate(rows, { transaction });
}

async function listForUser(userId, { page, pageSize, unreadOnly }) {
  const where = { user_id: userId };
  if (unreadOnly) where.is_read = 0;
  const { count, rows } = await Notification.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });
  const unread = await Notification.count({ where: { user_id: userId, is_read: 0 } });
  return { rows, count, unread };
}

async function markRead(id, userId) {
  return Notification.update({ is_read: 1 }, { where: { id, user_id: userId } });
}

async function markAllRead(userId) {
  return Notification.update({ is_read: 1 }, { where: { user_id: userId } });
}

async function countUnread(userId) {
  return Notification.count({ where: { user_id: userId, is_read: 0 } });
}

module.exports = { createMany, listForUser, markRead, markAllRead, countUnread };
