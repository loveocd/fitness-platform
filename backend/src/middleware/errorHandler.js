const { fail } = require('../utils/helpers');

function notFound(req, res) {
  return fail(res, 404, `接口不存在：${req.method} ${req.originalUrl}`);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error(`[${new Date().toLocaleString()}]`, error);

  if (
    error.name === 'SequelizeUniqueConstraintError' ||
    error.parent?.code === 'ER_DUP_ENTRY' ||
    error.code === 'ER_DUP_ENTRY'
  ) {
    return fail(res, 409, '数据已存在，请勿重复提交');
  }
  if (error.name === 'SequelizeValidationError') {
    return fail(
      res,
      400,
      error.errors?.map((item) => item.message).join('；') || '数据格式不正确'
    );
  }
  if (
    error.parent?.code === 'ER_NO_REFERENCED_ROW_2' ||
    error.code === 'ER_NO_REFERENCED_ROW_2'
  ) {
    return fail(res, 400, '关联数据不存在或已被删除');
  }
  if (
    error.name === 'SequelizeConnectionRefusedError' ||
    error.name === 'SequelizeAccessDeniedError' ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ER_ACCESS_DENIED_ERROR'
  ) {
    return fail(res, 500, '数据库连接失败，请检查后端 .env 配置');
  }
  return fail(res, error.status || 500, error.message || '服务器内部错误');
}

module.exports = { notFound, errorHandler };
