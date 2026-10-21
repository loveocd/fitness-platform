const express = require('express');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');
const userDal = require('../dal/userDal');
const providerDal = require('../dal/providerDal');
const categoryDal = require('../dal/categoryDal');
const appointmentDal = require('../dal/appointmentDal');
const notificationDal = require('../dal/notificationDal');
const reviewDal = require('../dal/reviewDal');
const ruleDal = require('../dal/ruleDal');
const statsDal = require('../dal/statsDal');
const { auth, requireRole } = require('../middleware/auth');
const {
  success,
  fail,
  asyncHandler,
  getPagination
} = require('../utils/helpers');

const router = express.Router();
router.use(auth, requireRole('admin'));

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    return success(res, await statsDal.adminDashboard());
  })
);

router.get(
  '/providers',
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = getPagination(req.query);
    const data = await providerDal.listAdmin({
      status: req.query.status,
      keyword: req.query.keyword,
      limit: pageSize,
      offset
    });
    return success(res, {
      list: data.rows,
      total: data.count,
      page,
      pageSize,
      counts: data.statusCounts
    });
  })
);

router.patch(
  '/providers/:id/audit',
  asyncHandler(async (req, res) => {
    const { status, reject_reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return fail(res, 400, '审核结果不合法');
    }
    if (status === 'rejected' && !reject_reason) {
      return fail(res, 400, '请填写驳回原因');
    }
    const provider = await providerDal.findById(Number(req.params.id));
    if (!provider) return fail(res, 404, '服务商不存在');

    await sequelize.transaction(async (transaction) => {
      await providerDal.setAudit(provider.id, status, reject_reason);
      await notificationDal.createMany(
        [
          {
            user_id: provider.user_id,
            title: status === 'approved' ? '门店入驻审核通过' : '门店入驻申请被驳回',
            content:
              status === 'approved'
                ? `「${provider.name}」已通过平台审核，现在可以完善门店信息并上架服务。`
                : `「${provider.name}」入驻申请未通过，原因：${reject_reason}`,
            type: 'system',
            related_id: provider.id
          }
        ],
        transaction
      );
    });
    return success(res, null, status === 'approved' ? '已通过入驻审核' : '已驳回入驻申请');
  })
);

router.patch(
  '/providers/:id/status',
  asyncHandler(async (req, res) => {
    const { status, reason } = req.body;
    if (!['approved', 'disabled'].includes(status)) {
      return fail(res, 400, '门店状态不合法');
    }
    const provider = await providerDal.findById(Number(req.params.id));
    if (!provider) return fail(res, 404, '服务商不存在');
    await sequelize.transaction(async (transaction) => {
      await providerDal.setStatus(provider.id, status);
      await notificationDal.createMany(
        [
          {
            user_id: provider.user_id,
            title: status === 'disabled' ? '门店已被平台停用' : '门店已恢复营业',
            content:
              status === 'disabled'
                ? `你的门店已被平台停用，原因：${reason || '违规经营'}`
                : '你的门店已恢复正常使用。',
            type: 'system',
            related_id: provider.id
          }
        ],
        transaction
      );
    });
    return success(res, null, status === 'disabled' ? '门店已停用' : '门店已恢复');
  })
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = getPagination(req.query);
    const data = await userDal.listForAdmin({
      role: req.query.role || 'user',
      keyword: req.query.keyword,
      status: req.query.status,
      limit: pageSize,
      offset
    });
    return success(res, { list: data.rows, total: data.count, page, pageSize });
  })
);

router.patch(
  '/users/:id/status',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const status = Number(req.body.status) === 1 ? 1 : 0;
    const user = await userDal.findProfile(id);
    if (!user) return fail(res, 404, '用户不存在');
    if (user.role === 'admin') return fail(res, 403, '不能禁用管理员账号');
    await userDal.setStatus(id, status);
    return success(res, null, status === 1 ? '账号已启用' : '账号已禁用');
  })
);

router.patch(
  '/users/:id/reset-password',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const password = req.body.password || '123456';
    if (String(password).length < 6) return fail(res, 400, '密码至少 6 位');
    const user = await userDal.findProfile(id);
    if (!user) return fail(res, 404, '用户不存在');
    if (user.role === 'admin') return fail(res, 403, '不能重置管理员密码');
    const hash = await bcrypt.hash(String(password), 10);
    await userDal.updatePassword(id, hash);
    return success(res, { password }, '密码已重置');
  })
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = getPagination(req.query);
    const data = await appointmentDal.listForAdmin({
      status: req.query.status,
      keyword: req.query.keyword,
      providerId: req.query.providerId,
      limit: pageSize,
      offset
    });
    const counts = await appointmentDal.countsByStatus();
    return success(res, {
      list: data.rows,
      total: data.count,
      page,
      pageSize,
      counts
    });
  })
);

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const appointment = await appointmentDal.detailForAdmin(Number(req.params.id));
    if (!appointment) return fail(res, 404, '订单不存在');
    return success(res, appointment);
  })
);

router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    if (!['confirmed', 'completed', 'cancelled', 'refunded'].includes(status)) {
      return fail(res, 400, '订单状态不合法');
    }
    const appointment = await appointmentDal.findWithRelations(
      Number(req.params.id)
    );
    if (!appointment) return fail(res, 404, '订单不存在');
    const statusText = {
      confirmed: '已确认',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款'
    };

    await sequelize.transaction(async (transaction) => {
      await appointmentDal.update(
        appointment.id,
        {
          status,
          ...(['cancelled', 'refunded'].includes(status)
            ? { cancel_reason: note || '平台监管处理' }
            : {})
        },
        transaction
      );
      await appointmentDal.addLog(
        {
          appointment_id: appointment.id,
          from_status: appointment.status,
          to_status: status,
          operator_type: 'admin',
          operator_id: req.user.id,
          note: note || `平台将订单更新为${statusText[status]}`
        },
        transaction
      );
      await notificationDal.createMany(
        [
          {
            user_id: appointment.user_id,
            title: '订单状态更新',
            content: `你的「${appointment.service.name}」订单已被平台更新为${statusText[status]}。`,
            type: 'order',
            related_id: appointment.id
          },
          {
            user_id: appointment.provider.user_id,
            title: '平台订单处理通知',
            content: `订单 ${appointment.appointment_no} 已被平台更新为${statusText[status]}。`,
            type: 'order',
            related_id: appointment.id
          }
        ],
        transaction
      );
    });
    return success(res, null, `订单已${statusText[status]}`);
  })
);

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    return success(res, await categoryDal.listAdmin());
  })
);

router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const { name, icon, description, sort_order = 0, status = 1 } = req.body;
    if (!name) return fail(res, 400, '请填写分类名称');
    if (await categoryDal.findByName(name)) return fail(res, 409, '分类名称已存在');
    await categoryDal.create({
      name,
      icon: icon || null,
      description: description || null,
      sort_order: Number(sort_order) || 0,
      status: Number(status) ? 1 : 0
    });
    return success(res, null, '分类已创建');
  })
);

router.put(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { name, icon, description, sort_order, status } = req.body;
    if (!name) return fail(res, 400, '请填写分类名称');
    if (await categoryDal.findByName(name, id)) return fail(res, 409, '分类名称已存在');
    await categoryDal.update(id, {
      name,
      icon: icon || null,
      description: description || null,
      sort_order: Number(sort_order) || 0,
      status: Number(status) ? 1 : 0
    });
    return success(res, null, '分类已更新');
  })
);

router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if ((await categoryDal.countServices(id)) > 0) {
      return fail(res, 400, '该分类下已有服务，不能直接删除，可先停用分类');
    }
    await categoryDal.remove(id);
    return success(res, null, '分类已删除');
  })
);

router.get(
  '/checkin-rules',
  asyncHandler(async (req, res) => {
    return success(res, await ruleDal.list());
  })
);

router.post(
  '/checkin-rules',
  asyncHandler(async (req, res) => {
    const {
      name,
      checkin_type,
      points_per_checkin,
      daily_limit,
      min_duration,
      description,
      status = 1
    } = req.body;
    if (!name || !['venue', 'self'].includes(checkin_type)) {
      return fail(res, 400, '请填写规则名称和打卡类型');
    }
    await ruleDal.create({
      name,
      checkin_type,
      points_per_checkin: Number(points_per_checkin) || 10,
      daily_limit: Number(daily_limit) || 1,
      min_duration: Number(min_duration) || 30,
      description: description || null,
      status: Number(status) ? 1 : 0
    });
    return success(res, null, '打卡规则已创建');
  })
);

router.put(
  '/checkin-rules/:id',
  asyncHandler(async (req, res) => {
    const {
      name,
      checkin_type,
      points_per_checkin,
      daily_limit,
      min_duration,
      description,
      status
    } = req.body;
    await ruleDal.update(Number(req.params.id), {
      name,
      checkin_type,
      points_per_checkin: Number(points_per_checkin) || 10,
      daily_limit: Number(daily_limit) || 1,
      min_duration: Number(min_duration) || 30,
      description: description || null,
      status: Number(status) ? 1 : 0
    });
    return success(res, null, '打卡规则已更新');
  })
);

router.delete(
  '/checkin-rules/:id',
  asyncHandler(async (req, res) => {
    await ruleDal.remove(Number(req.params.id));
    return success(res, null, '打卡规则已删除');
  })
);

router.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = getPagination(req.query);
    const [data, counts] = await Promise.all([
      reviewDal.listForAdmin({
        status: req.query.status,
        keyword: req.query.keyword,
        rating: req.query.rating,
        limit: pageSize,
        offset
      }),
      reviewDal.countsForAdmin()
    ]);
    return success(res, {
      list: data.rows,
      total: data.count,
      page,
      pageSize,
      counts
    });
  })
);

router.patch(
  '/reviews/:id/audit',
  asyncHandler(async (req, res) => {
    const { status, audit_remark } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return fail(res, 400, '审核结果不合法');
    }
    const review = await reviewDal.findById(Number(req.params.id));
    if (!review) return fail(res, 404, '评价不存在');
    await sequelize.transaction(async (transaction) => {
      await reviewDal.audit(review.id, status, audit_remark);
      await reviewDal.recalculateRatings(review.provider_id, review.service_id);
      await notificationDal.createMany(
        [
          {
            user_id: review.user_id,
            title: status === 'approved' ? '评价审核通过' : '评价未通过审核',
            content:
              status === 'approved'
                ? '你的评价已通过审核并展示在服务详情中。'
                : `你的评价未通过审核，原因：${audit_remark || '内容不符合平台规范'}`,
            type: 'review',
            related_id: review.id
          }
        ],
        transaction
      );
    });
    return success(res, null, status === 'approved' ? '评价已通过' : '评价已驳回');
  })
);

router.get(
  '/stats/platform',
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 180);
    return success(res, await statsDal.platformStats(days));
  })
);

module.exports = router;
