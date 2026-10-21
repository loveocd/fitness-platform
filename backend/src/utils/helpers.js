const crypto = require('crypto');

function success(res, data = null, message = '操作成功') {
  return res.json({ code: 0, message, data });
}

function fail(res, status, message, details = null) {
  return res.status(status).json({ code: status, message, details });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getPagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function likeKeyword(keyword) {
  return `%${String(keyword || '').trim()}%`;
}

function createAppointmentNo() {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0')
  ].join('');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FT${stamp}${random}`;
}

function calcBmi(height, weight) {
  const h = Number(height) / 100;
  const w = Number(weight);
  if (!h || !w) return null;
  return Number((w / (h * h)).toFixed(1));
}

function startOfMonth(offset = 0) {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
  const d = new Date(date);
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

module.exports = {
  success,
  fail,
  asyncHandler,
  createHttpError,
  getPagination,
  likeKeyword,
  createAppointmentNo,
  calcBmi,
  startOfMonth,
  formatDate,
  formatDateTime
};
