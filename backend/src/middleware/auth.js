const jwt = require('jsonwebtoken');
const userDal = require('../dal/userDal');
const { fail } = require('../utils/helpers');

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return fail(res, 401, '请先登录');

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fitness_platform_secret_2026'
    );
    const user = await userDal.findAuthById(payload.id);
    if (!user) return fail(res, 401, '账号不存在或已被删除');
    if (Number(user.status) !== 1) return fail(res, 403, '账号已被禁用');

    req.user = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      real_name: user.real_name,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
      status: user.status,
      points: user.points
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return fail(res, 401, '登录已过期，请重新登录');
    }
    return fail(res, 401, '登录状态无效，请重新登录');
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, '没有访问该功能的权限');
    }
    next();
  };
}

module.exports = { auth, requireRole };
