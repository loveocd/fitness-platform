const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../models');
const userDal = require('../dal/userDal');
const providerDal = require('../dal/providerDal');
const notificationDal = require('../dal/notificationDal');
const { auth } = require('../middleware/auth');
const { success, fail, asyncHandler } = require('../utils/helpers');

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'fitness_platform_secret_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function loadUserProfile(userId) {
  const user = await userDal.findProfile(userId);
  if (!user) return null;
  return user.get({ plain: true });
}

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return fail(res, 400, '请输入账号和密码');

    const user = await userDal.findByUsername(String(username).trim());
    if (!user) return fail(res, 401, '账号或密码错误');
    const matched = await bcrypt.compare(String(password), user.password);
    if (!matched) return fail(res, 401, '账号或密码错误');
    if (Number(user.status) !== 1) return fail(res, 403, '该账号已被平台禁用');

    await userDal.updateLastLogin(user.id);
    return success(
      res,
      { token: createToken(user), user: await loadUserProfile(user.id) },
      '登录成功'
    );
  })
);

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const {
      username,
      password,
      nickname,
      phone,
      email,
      role = 'user',
      storeName,
      storeAddress,
      licenseNo
    } = req.body;

    if (!username || !password) return fail(res, 400, '账号和密码不能为空');
    if (String(username).trim().length < 3) return fail(res, 400, '账号至少 3 个字符');
    if (String(password).length < 6) return fail(res, 400, '密码至少 6 位');
    if (!['user', 'provider'].includes(role)) return fail(res, 400, '注册角色不合法');
    if (role === 'provider' && !storeName) return fail(res, 400, '请填写门店名称');
    if (await userDal.findByUsername(String(username).trim())) {
      return fail(res, 409, '该账号已被注册');
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const newUserId = await sequelize.transaction(async (transaction) => {
      const user = await userDal.create(
        {
          username: String(username).trim(),
          password: passwordHash,
          nickname: nickname || String(username).trim(),
          phone: phone || null,
          email: email || null,
          role
        },
        transaction
      );

      if (role === 'provider') {
        await providerDal.create(
          {
            user_id: user.id,
            name: storeName,
            description: '新入驻服务商，等待平台完善门店介绍。',
            address: storeAddress || '',
            city: '上海',
            phone: phone || '',
            license_no: licenseNo || '',
            status: 'pending'
          },
          transaction
        );
        const admins = await userDal.findAdmins(transaction);
        await notificationDal.createMany(
          admins.map((admin) => ({
            user_id: admin.id,
            title: '新的服务商入驻申请',
            content: `「${storeName}」提交了入驻申请，请及时审核。`,
            type: 'system',
            related_id: user.id
          })),
          transaction
        );
      }
      return user.id;
    });

    return success(
      res,
      { user: await loadUserProfile(newUserId) },
      role === 'provider' ? '注册成功，门店资料已提交平台审核' : '注册成功，请登录'
    );
  })
);

router.get(
  '/me',
  auth,
  asyncHandler(async (req, res) => {
    return success(res, await loadUserProfile(req.user.id));
  })
);

router.put(
  '/password',
  auth,
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return fail(res, 400, '请填写原密码和新密码');
    if (String(newPassword).length < 6) return fail(res, 400, '新密码至少 6 位');
    const current = await userDal.getPassword(req.user.id);
    if (!(await bcrypt.compare(String(oldPassword), current))) {
      return fail(res, 400, '原密码不正确');
    }
    const hash = await bcrypt.hash(String(newPassword), 10);
    await userDal.updatePassword(req.user.id, hash);
    return success(res, null, '密码修改成功');
  })
);

module.exports = router;
