const express = require('express');
const { sequelize } = require('../models');
const providerDal = require('../dal/providerDal');
const serviceDal = require('../dal/serviceDal');
const coachDal = require('../dal/coachDal');
const categoryDal = require('../dal/categoryDal');
const appointmentDal = require('../dal/appointmentDal');
const notificationDal = require('../dal/notificationDal');
const checkinDal = require('../dal/checkinDal');
const bodyTestDal = require('../dal/bodyTestDal');
const reviewDal = require('../dal/reviewDal');
const userDal = require('../dal/userDal');
const statsDal = require('../dal/statsDal');
const { auth, requireRole } = require('../middleware/auth');
const {
  success,
  fail,
  asyncHandler,
  getPagination,
  calcBmi
} = require('../utils/helpers');

const router = express.Router();
router.use(auth, requireRole('provider'));

async function getProvider(userId) {
  return providerDal.findByUserId(userId);
}

function providerGuard(provider) {
  if (!provider) return '服务商资料不存在，请联系平台管理员';
  if (provider.status === 'disabled') return '门店已被平台停用，暂时无法操作';
  if (provider.status === 'pending') return '门店正在等待平台审核，审核通过后即可使用';
  if (provider.status === 'rejected') return '门店入驻申请已被驳回，请修改资料后重新提交';
  return null;
}

router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    return success(res, provider.get({ plain: true }));
  })
);

router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    if (provider.status === 'disabled') return fail(res, 403, '门店已被停用，无法修改');
    if (!req.body.name) return fail(res, 400, '门店名称不能为空');

    const nextStatus = provider.status === 'rejected' ? 'pending' : provider.status;
    const updated = await providerDal.update(provider.id, {
      name: req.body.name,
      logo: req.body.logo || null,
      cover: req.body.cover || null,
      description: req.body.description || null,
      address: req.body.address || null,
      city: req.body.city || null,
      phone: req.body.phone || null,
      business_hours: req.body.business_hours || null,
      license_no: req.body.license_no || null,
      status: nextStatus,
      reject_reason: provider.status === 'rejected' ? null : provider.reject_reason
    });
    return success(
      res,
      updated.get({ plain: true }),
      provider.status === 'rejected' ? '资料已更新，已重新提交审核' : '门店资料已更新'
    );
  })
);

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const data = await statsDal.providerDashboard(provider.id);
    return success(res, { provider: provider.get({ plain: true }), ...data });
  })
);

router.get(
  '/coaches',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    return success(res, await coachDal.listByProvider(provider.id));
  })
);

router.post(
  '/coaches',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    const guard = providerGuard(provider);
    if (guard) return fail(res, 403, guard);
    if (!req.body.name) return fail(res, 400, '请填写教练姓名');
    const coach = await coachDal.create({
      provider_id: provider.id,
      name: req.body.name,
      avatar: req.body.avatar || null,
      title: req.body.title || null,
      specialties: req.body.specialties || null,
      experience_years: Number(req.body.experience_years) || 0,
      intro: req.body.intro || null,
      rating: Number(req.body.rating) || 5,
      status: 1
    });
    return success(res, coach, '教练已添加');
  })
);

router.put(
  '/coaches/:id',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const coach = await coachDal.findById(Number(req.params.id), provider.id);
    if (!coach) return fail(res, 404, '教练不存在');
    await coachDal.update(coach.id, provider.id, {
      name: req.body.name,
      avatar: req.body.avatar || null,
      title: req.body.title || null,
      specialties: req.body.specialties || null,
      experience_years: Number(req.body.experience_years) || 0,
      intro: req.body.intro || null,
      rating: Number(req.body.rating) || 5,
      status: Number(req.body.status) === 0 ? 0 : 1
    });
    return success(res, null, '教练信息已更新');
  })
);

router.delete(
  '/coaches/:id',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    await coachDal.setStatus(Number(req.params.id), provider.id, 0);
    return success(res, null, '教练已设为离职');
  })
);

router.get(
  '/services',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    return success(res, await serviceDal.findByProvider(provider.id));
  })
);

router.post(
  '/services',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    const guard = providerGuard(provider);
    if (guard) return fail(res, 403, guard);
    const { category_id, name, price } = req.body;
    if (!category_id || !name || price === undefined) {
      return fail(res, 400, '请填写服务分类、名称和价格');
    }
    const category = await categoryDal.findById(Number(category_id));
    if (!category || Number(category.status) !== 1) {
      return fail(res, 400, '服务分类不存在或已停用');
    }
    const service = await serviceDal.create({
      provider_id: provider.id,
      category_id: Number(category_id),
      name,
      cover: req.body.cover || null,
      description: req.body.description || null,
      price: Number(price),
      original_price: req.body.original_price ? Number(req.body.original_price) : null,
      duration: Number(req.body.duration) || 60,
      capacity: Number(req.body.capacity) || 20,
      tags: req.body.tags || null,
      status: 'on'
    });
    return success(res, service, '服务已上架');
  })
);

router.put(
  '/services/:id',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const service = await serviceDal.findById(Number(req.params.id));
    if (!service || service.provider_id !== provider.id) {
      return fail(res, 404, '服务不存在');
    }
    const updated = await serviceDal.updateByProvider(service.id, provider.id, {
      category_id: Number(req.body.category_id),
      name: req.body.name,
      cover: req.body.cover || null,
      description: req.body.description || null,
      price: Number(req.body.price),
      original_price: req.body.original_price ? Number(req.body.original_price) : null,
      duration: Number(req.body.duration) || 60,
      capacity: Number(req.body.capacity) || 20,
      tags: req.body.tags || null,
      status: req.body.status === 'off' ? 'off' : 'on'
    });
    return success(res, updated, '服务信息已更新');
  })
);

router.delete(
  '/services/:id',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    await serviceDal.setStatus(Number(req.params.id), provider.id, 'off');
    return success(res, null, '服务已下架');
  })
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const { page, pageSize, offset } = getPagination(req.query);
    const { rows, count } = await appointmentDal.listForProvider(provider.id, {
      status: req.query.status,
      keyword: req.query.keyword,
      limit: pageSize,
      offset
    });
    const counts = await appointmentDal.countsByStatus({ provider_id: provider.id });
    return success(res, { list: rows, total: count, page, pageSize, counts });
  })
);

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const appointment = await appointmentDal.detailForProvider(
      Number(req.params.id),
      provider.id
    );
    if (!appointment) return fail(res, 404, '订单不存在');
    return success(res, appointment);
  })
);

router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const { status, note } = req.body;
    if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
      return fail(res, 400, '目标状态不合法');
    }
    const appointment = await appointmentDal.findWithRelations(
      Number(req.params.id)
    );
    if (!appointment || appointment.provider_id !== provider.id) {
      return fail(res, 404, '订单不存在');
    }
    const transitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
      refunded: []
    };
    if (!transitions[appointment.status]?.includes(status)) {
      return fail(res, 400, '当前订单状态不支持该操作');
    }
    const statusText = { confirmed: '已确认', completed: '已完成', cancelled: '已取消' };
    const message =
      status === 'confirmed'
        ? `你的「${appointment.service.name}」预约已由门店确认，请按时到店。`
        : status === 'completed'
          ? `你的「${appointment.service.name}」服务已完成，欢迎提交评价。`
          : `你的「${appointment.service.name}」预约已被门店取消。`;

    await sequelize.transaction(async (transaction) => {
      await appointmentDal.update(
        appointment.id,
        {
          status,
          ...(status === 'cancelled' ? { cancel_reason: note || null } : {})
        },
        transaction
      );
      await appointmentDal.addLog(
        {
          appointment_id: appointment.id,
          from_status: appointment.status,
          to_status: status,
          operator_type: 'provider',
          operator_id: req.user.id,
          note: note || `服务商将订单更新为${statusText[status]}`
        },
        transaction
      );
      await notificationDal.createMany(
        [
          {
            user_id: appointment.user_id,
            title: `预约${statusText[status]}`,
            content: message,
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
  '/checkins',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const [list, counts, summary] = await Promise.all([
      checkinDal.listForProvider(provider.id, {
        status: req.query.status || 'pending',
        month: req.query.month
      }),
      checkinDal.countsForProvider(provider.id),
      checkinDal.summaryForProvider(provider.id)
    ]);
    return success(res, { list, counts, summary });
  })
);

router.patch(
  '/checkins/:id/verify',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const { status, reject_reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return fail(res, 400, '核验结果不合法');
    }
    if (status === 'rejected' && !reject_reason) {
      return fail(res, 400, '请填写驳回原因');
    }
    const record = await checkinDal.findById(Number(req.params.id), provider.id);
    if (!record) return fail(res, 404, '打卡记录不存在');
    if (record.status !== 'pending') return fail(res, 400, '该打卡已核验，请勿重复操作');

    await sequelize.transaction(async (transaction) => {
      await checkinDal.updateStatus(record.id, provider.id, {
        status,
        verified_by: req.user.id,
        verified_at: new Date(),
        reject_reason: status === 'rejected' ? reject_reason : null
      });
      if (status === 'approved') {
        await userDal.incrementPoints(record.user_id, record.points, transaction);
      }
      await notificationDal.createMany(
        [
          {
            user_id: record.user_id,
            title: status === 'approved' ? '场馆打卡核验通过' : '场馆打卡未通过',
            content:
              status === 'approved'
                ? `本次打卡已核验通过，获得 ${record.points} 积分。`
                : `本次打卡未通过核验，原因：${reject_reason}`,
            type: 'checkin',
            related_id: record.id
          }
        ],
        transaction
      );
    });
    return success(res, null, status === 'approved' ? '打卡核验通过' : '打卡已驳回');
  })
);

router.get(
  '/body-tests',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const [list, students] = await Promise.all([
      bodyTestDal.listForProvider(provider.id, req.query.keyword),
      bodyTestDal.studentsForProvider(provider.id)
    ]);
    return success(res, { list, students });
  })
);

router.get(
  '/students',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    return success(res, await bodyTestDal.studentsForProvider(provider.id));
  })
);

router.post(
  '/body-tests',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const {
      user_id,
      coach_id,
      test_date,
      height,
      weight,
      body_fat,
      muscle_mass,
      visceral_fat,
      basal_metabolism,
      waist,
      chest,
      hip,
      body_age,
      remark
    } = req.body;
    if (!user_id || !test_date || !height || !weight) {
      return fail(res, 400, '请填写学员、体测日期、身高和体重');
    }
    const user = await userDal.findProfile(Number(user_id));
    if (!user || user.role !== 'user') return fail(res, 400, '学员不存在');
    if (coach_id) {
      const coach = await coachDal.findById(Number(coach_id), provider.id);
      if (!coach) return fail(res, 400, '教练不属于当前门店');
    }
    const bmi = calcBmi(height, weight);
    await sequelize.transaction(async (transaction) => {
      await bodyTestDal.create(
        {
          user_id: Number(user_id),
          provider_id: provider.id,
          coach_id: coach_id || null,
          test_date,
          height: Number(height),
          weight: Number(weight),
          bmi,
          body_fat: body_fat || null,
          muscle_mass: muscle_mass || null,
          visceral_fat: visceral_fat || null,
          basal_metabolism: basal_metabolism || null,
          waist: waist || null,
          chest: chest || null,
          hip: hip || null,
          body_age: body_age || null,
          remark: remark || null
        },
        transaction
      );
      await notificationDal.createMany(
        [
          {
            user_id: Number(user_id),
            title: '新的体测记录',
            content: `${provider.name} 为你录入了 ${test_date} 的体测数据，可前往个人中心查看。`,
            type: 'system'
          }
        ],
        transaction
      );
    });
    return success(res, { bmi }, '体测记录已保存');
  })
);

router.put(
  '/body-tests/:id',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const record = await bodyTestDal.findById(Number(req.params.id), provider.id);
    if (!record) return fail(res, 404, '体测记录不存在');
    const bmi = calcBmi(req.body.height, req.body.weight);
    await bodyTestDal.update(record.id, provider.id, {
      test_date: req.body.test_date,
      height: Number(req.body.height),
      weight: Number(req.body.weight),
      bmi,
      body_fat: req.body.body_fat || null,
      muscle_mass: req.body.muscle_mass || null,
      visceral_fat: req.body.visceral_fat || null,
      basal_metabolism: req.body.basal_metabolism || null,
      waist: req.body.waist || null,
      chest: req.body.chest || null,
      hip: req.body.hip || null,
      body_age: req.body.body_age || null,
      remark: req.body.remark || null
    });
    return success(res, null, '体测记录已更新');
  })
);

router.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const [list, summary] = await Promise.all([
      reviewDal.listForProvider(provider.id, {
        status: req.query.status,
        rating: req.query.rating
      }),
      reviewDal.summaryForProvider(provider.id)
    ]);
    return success(res, { list, summary });
  })
);

router.post(
  '/reviews/:id/reply',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    if (!req.body.reply) return fail(res, 400, '请填写回复内容');
    const review = await reviewDal.findById(Number(req.params.id));
    if (!review || review.provider_id !== provider.id) {
      return fail(res, 404, '评价不存在');
    }
    await sequelize.transaction(async (transaction) => {
      await reviewDal.reply(review.id, provider.id, req.body.reply);
      await notificationDal.createMany(
        [
          {
            user_id: review.user_id,
            title: '商家回复了你的评价',
            content: req.body.reply,
            type: 'review',
            related_id: review.id
          }
        ],
        transaction
      );
    });
    return success(res, null, '回复已发布');
  })
);

router.get(
  '/stats/business',
  asyncHandler(async (req, res) => {
    const provider = await getProvider(req.user.id);
    if (!provider) return fail(res, 404, '服务商资料不存在');
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 180);
    return success(res, await statsDal.providerBusiness(provider.id, days));
  })
);

module.exports = router;
