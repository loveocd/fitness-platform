const express = require('express');
const { sequelize } = require('../models');
const userDal = require('../dal/userDal');
const providerDal = require('../dal/providerDal');
const serviceDal = require('../dal/serviceDal');
const coachDal = require('../dal/coachDal');
const appointmentDal = require('../dal/appointmentDal');
const notificationDal = require('../dal/notificationDal');
const checkinDal = require('../dal/checkinDal');
const bodyTestDal = require('../dal/bodyTestDal');
const favoriteDal = require('../dal/favoriteDal');
const reviewDal = require('../dal/reviewDal');
const ruleDal = require('../dal/ruleDal');
const { auth, requireRole } = require('../middleware/auth');
const {
  success,
  fail,
  asyncHandler,
  getPagination,
  createAppointmentNo,
  calcBmi,
  formatDate
} = require('../utils/helpers');

const router = express.Router();
router.use(auth, requireRole('user'));

function today() {
  return formatDate(new Date());
}

function currentMonth() {
  return today().slice(0, 7);
}

router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const user = await userDal.findProfile(req.user.id);
    return success(res, user?.get({ plain: true }));
  })
);

router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const { nickname, real_name, phone, email, avatar, gender, birthday } = req.body;
    if (phone && (await userDal.isPhoneTaken(phone, req.user.id))) {
      return fail(res, 409, '该手机号已被其他账号使用');
    }
    const user = await userDal.updateProfile(req.user.id, {
      nickname: nickname || null,
      real_name: real_name || null,
      phone: phone || null,
      email: email || null,
      avatar: avatar || null,
      gender: ['male', 'female', 'unknown'].includes(gender) ? gender : 'unknown',
      birthday: birthday || null
    });
    return success(res, user.get({ plain: true }), '个人资料已更新');
  })
);

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const [upcoming, checkinStats, favorites, unread, allOrders, recommend, week] =
      await Promise.all([
        appointmentDal.countUpcoming(req.user.id),
        checkinDal.statsForUser(req.user.id, currentMonth()),
        favoriteDal.count(req.user.id),
        notificationDal.countUnread(req.user.id),
        appointmentDal.listForUser(req.user.id),
        serviceDal.listPublic({ sort: 'sales', limit: 4, offset: 0 }),
        checkinDal.weekActivity(req.user.id)
      ]);

    return success(res, {
      stats: {
        upcoming,
        checkins: Number(checkinStats.total_checkins || 0),
        calories: Number(checkinStats.total_calories || 0),
        minutes: Number(checkinStats.total_minutes || 0),
        favorites,
        points: Number(req.user.points || 0),
        unread
      },
      recentOrders: allOrders.slice(0, 4),
      recommend: recommend.rows,
      week
    });
  })
);

router.get(
  '/appointments',
  asyncHandler(async (req, res) => {
    return success(res, await appointmentDal.listForUser(req.user.id, req.query.status));
  })
);

router.get(
  '/appointments/:id',
  asyncHandler(async (req, res) => {
    const appointment = await appointmentDal.detailForUser(
      Number(req.params.id),
      req.user.id
    );
    if (!appointment) return fail(res, 404, '预约订单不存在');
    return success(res, appointment);
  })
);

router.post(
  '/appointments',
  asyncHandler(async (req, res) => {
    const {
      service_id,
      coach_id,
      appointment_date,
      time_slot,
      people_count = 1,
      contact_name,
      contact_phone,
      remark
    } = req.body;
    if (!service_id || !appointment_date || !time_slot || !contact_name || !contact_phone) {
      return fail(res, 400, '请完整填写预约信息');
    }

    const service = await serviceDal.findWithProvider(Number(service_id));
    if (!service || service.status !== 'on' || service.provider.status !== 'approved') {
      return fail(res, 404, '该服务不存在或已下架');
    }
    if (appointment_date < today()) return fail(res, 400, '预约日期不能早于今天');
    const people = Math.max(Number(people_count) || 1, 1);
    if (people > 10) return fail(res, 400, '单次预约人数不能超过 10 人');

    if (coach_id) {
      const coach = await coachDal.findById(
        Number(coach_id),
        service.provider_id
      );
      if (!coach || Number(coach.status) !== 1) {
        return fail(res, 400, '所选教练不属于该门店');
      }
    }

    const booked = await appointmentDal.sumBooked(
      service.id,
      appointment_date,
      time_slot
    );
    if (Number(booked || 0) + people > Number(service.capacity)) {
      return fail(res, 409, '该时段预约人数已满，请选择其他时段');
    }

    const appointmentNo = createAppointmentNo();
    const amount = Number(service.price) * people;
    const appointmentId = await sequelize.transaction(async (transaction) => {
      const appointment = await appointmentDal.create(
        {
          appointment_no: appointmentNo,
          user_id: req.user.id,
          provider_id: service.provider_id,
          service_id: service.id,
          coach_id: coach_id || null,
          appointment_date,
          time_slot,
          people_count: people,
          amount,
          status: 'pending',
          contact_name,
          contact_phone,
          remark: remark || null
        },
        transaction
      );
      await appointmentDal.addLog(
        {
          appointment_id: appointment.id,
          from_status: null,
          to_status: 'pending',
          operator_type: 'user',
          operator_id: req.user.id,
          note: '用户提交预约，等待商家确认'
        },
        transaction
      );
      await notificationDal.createMany(
        [
          {
            user_id: req.user.id,
            title: '预约提交成功',
            content: `你已提交「${service.name}」预约，门店确认后会通知你。`,
            type: 'order',
            related_id: appointment.id
          },
          {
            user_id: service.provider.user_id,
            title: '收到新的预约',
            content: `用户提交了「${service.name}」预约（${appointment_date} ${time_slot}），请及时处理。`,
            type: 'order',
            related_id: appointment.id
          }
        ],
        transaction
      );
      await serviceDal.incrementSales(service.id, transaction);
      return appointment.id;
    });

    return success(
      res,
      { id: appointmentId, appointment_no: appointmentNo, amount },
      '预约提交成功'
    );
  })
);

router.patch(
  '/appointments/:id/cancel',
  asyncHandler(async (req, res) => {
    const appointment = await appointmentDal.findWithRelations(
      Number(req.params.id)
    );
    if (!appointment || appointment.user_id !== req.user.id) {
      return fail(res, 404, '预约订单不存在');
    }
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return fail(res, 400, '当前订单状态不能取消');
    }
    const reason = req.body.reason || '用户主动取消';
    await sequelize.transaction(async (transaction) => {
      await appointmentDal.update(
        appointment.id,
        { status: 'cancelled', cancel_reason: reason },
        transaction
      );
      await appointmentDal.addLog(
        {
          appointment_id: appointment.id,
          from_status: appointment.status,
          to_status: 'cancelled',
          operator_type: 'user',
          operator_id: req.user.id,
          note: reason
        },
        transaction
      );
      await notificationDal.createMany(
        [
          {
            user_id: req.user.id,
            title: '预约已取消',
            content: `「${appointment.service.name}」预约已取消。`,
            type: 'order',
            related_id: appointment.id
          },
          {
            user_id: appointment.provider.user_id,
            title: '用户取消预约',
            content: `「${appointment.service.name}」预约已被用户取消，原因：${reason}`,
            type: 'order',
            related_id: appointment.id
          }
        ],
        transaction
      );
    });
    return success(res, null, '预约已取消');
  })
);

router.post(
  '/appointments/:id/checkin',
  asyncHandler(async (req, res) => {
    const appointment = await appointmentDal.findWithRelations(
      Number(req.params.id)
    );
    if (!appointment || appointment.user_id !== req.user.id) {
      return fail(res, 404, '预约订单不存在');
    }
    if (appointment.status !== 'confirmed') {
      return fail(res, 400, '只有已确认的预约才能到店打卡');
    }
    if (appointment.appointment_date !== today()) {
      return fail(res, 400, '请在预约当天到店打卡');
    }
    if (await checkinDal.findByAppointment(appointment.id)) {
      return fail(res, 409, '该预约已提交过打卡');
    }
    const rule = await ruleDal.latestByType('venue');
    const points = Number(rule?.points_per_checkin || 20);
    const duration = Number(req.body.duration_minutes) || 60;
    const calories = Number(req.body.calories) || Math.round(duration * 7);

    await sequelize.transaction(async (transaction) => {
      await checkinDal.create(
        {
          user_id: req.user.id,
          provider_id: appointment.provider_id,
          appointment_id: appointment.id,
          checkin_type: 'venue',
          checkin_date: today(),
          checkin_time: new Date(),
          duration_minutes: duration,
          calories,
          points,
          content: `完成「${appointment.service.name}」到店打卡`,
          status: 'pending'
        },
        transaction
      );
      await notificationDal.createMany(
        [
          {
            user_id: req.user.id,
            title: '到店打卡已提交',
            content: '门店核验通过后将获得积分，请稍候。',
            type: 'checkin',
            related_id: appointment.id
          },
          {
            user_id: appointment.provider.user_id,
            title: '有新的场馆打卡待核验',
            content: `用户提交了「${appointment.service.name}」到店打卡，请及时核验。`,
            type: 'checkin',
            related_id: appointment.id
          }
        ],
        transaction
      );
    });
    return success(res, null, '打卡已提交，等待门店核验');
  })
);

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const { page, pageSize } = getPagination(req.query);
    const data = await notificationDal.listForUser(req.user.id, {
      page,
      pageSize,
      unreadOnly: req.query.unread === '1'
    });
    return success(res, {
      list: data.rows,
      total: data.count,
      unread: data.unread,
      page,
      pageSize
    });
  })
);

router.patch(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    await notificationDal.markAllRead(req.user.id);
    return success(res, null, '全部消息已读');
  })
);

router.patch(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    await notificationDal.markRead(Number(req.params.id), req.user.id);
    return success(res, null, '已标记为已读');
  })
);

router.get(
  '/checkins',
  asyncHandler(async (req, res) => {
    const month = req.query.month || currentMonth();
    const [list, stats, rules, todaySelfCount] = await Promise.all([
      checkinDal.listForUser(req.user.id, month),
      checkinDal.statsForUser(req.user.id, month),
      ruleDal.listActive(),
      checkinDal.countTodaySelf(req.user.id)
    ]);
    return success(res, { list, stats, rules, todaySelfCount, month });
  })
);

router.post(
  '/checkins',
  asyncHandler(async (req, res) => {
    const { duration_minutes, content, intensity = 'medium' } = req.body;
    const duration = Number(duration_minutes);
    if (!duration || duration <= 0) return fail(res, 400, '请填写运动时长');
    if (duration > 600) return fail(res, 400, '单次运动时长不能超过 600 分钟');

    const rule = await ruleDal.latestByType('self');
    if (!rule) return fail(res, 400, '平台暂未开启自主打卡');
    if (duration < Number(rule.min_duration)) {
      return fail(res, 400, `自主打卡至少需要运动 ${rule.min_duration} 分钟`);
    }
    if ((await checkinDal.countTodaySelf(req.user.id)) >= Number(rule.daily_limit)) {
      return fail(res, 409, `今日自主打卡次数已达上限（${rule.daily_limit} 次）`);
    }

    const factor = { low: 5, medium: 7, high: 9 }[intensity] || 7;
    const calories = Math.round(duration * factor);
    const points = Number(rule.points_per_checkin);
    await sequelize.transaction(async (transaction) => {
      await checkinDal.create(
        {
          user_id: req.user.id,
          checkin_type: 'self',
          checkin_date: today(),
          checkin_time: new Date(),
          duration_minutes: duration,
          calories,
          points,
          content: content || '自主运动打卡',
          status: 'approved'
        },
        transaction
      );
      await userDal.incrementPoints(req.user.id, points, transaction);
      await notificationDal.createMany(
        [
          {
            user_id: req.user.id,
            title: '打卡成功',
            content: `本次运动 ${duration} 分钟，消耗约 ${calories} 千卡，获得 ${points} 积分。`,
            type: 'checkin'
          }
        ],
        transaction
      );
    });
    return success(res, { points, calories }, `打卡成功，获得 ${points} 积分`);
  })
);

router.get(
  '/body-tests',
  asyncHandler(async (req, res) => {
    return success(res, await bodyTestDal.listForUser(req.user.id));
  })
);

router.post(
  '/body-tests',
  asyncHandler(async (req, res) => {
    const {
      provider_id,
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
    if (!provider_id || !test_date || !height || !weight) {
      return fail(res, 400, '请填写门店、体测日期、身高和体重');
    }
    const provider = await providerDal.findById(Number(provider_id));
    if (!provider || provider.status !== 'approved') {
      return fail(res, 400, '所选场馆不存在');
    }
    if (coach_id) {
      const coach = await coachDal.findById(
        Number(coach_id),
        Number(provider_id)
      );
      if (!coach) return fail(res, 400, '所选教练不属于该场馆');
    }
    const bmi = calcBmi(height, weight);
    await bodyTestDal.create({
      user_id: req.user.id,
      provider_id: Number(provider_id),
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
    });
    return success(res, { bmi }, '体测数据已记录');
  })
);

router.get(
  '/favorites',
  asyncHandler(async (req, res) => {
    return success(res, await favoriteDal.listForUser(req.user.id));
  })
);

router.post(
  '/favorites/:serviceId',
  asyncHandler(async (req, res) => {
    const service = await serviceDal.findWithProvider(Number(req.params.serviceId));
    if (!service || service.status !== 'on' || service.provider.status !== 'approved') {
      return fail(res, 404, '服务不存在');
    }
    await favoriteDal.add(req.user.id, service.id);
    return success(res, null, '已加入收藏');
  })
);

router.delete(
  '/favorites/:serviceId',
  asyncHandler(async (req, res) => {
    await favoriteDal.remove(req.user.id, Number(req.params.serviceId));
    return success(res, null, '已取消收藏');
  })
);

router.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    return success(res, await reviewDal.listForUser(req.user.id));
  })
);

router.post(
  '/reviews',
  asyncHandler(async (req, res) => {
    const { appointment_id, rating, content, images } = req.body;
    if (!appointment_id || !rating || !content) {
      return fail(res, 400, '请选择订单并填写评分和评价内容');
    }
    const score = Number(rating);
    if (score < 1 || score > 5) return fail(res, 400, '评分必须在 1-5 星之间');
    if (String(content).length < 5) return fail(res, 400, '评价内容至少 5 个字');

    const appointment = await appointmentDal.findWithRelations(
      Number(appointment_id)
    );
    if (!appointment || appointment.user_id !== req.user.id) {
      return fail(res, 404, '预约订单不存在');
    }
    if (appointment.status !== 'completed') {
      return fail(res, 400, '只有已完成的订单才能评价');
    }
    if (await reviewDal.findByAppointmentId(appointment.id)) {
      return fail(res, 409, '该订单已经评价过了');
    }

    await sequelize.transaction(async (transaction) => {
      await reviewDal.create(
        {
          user_id: req.user.id,
          appointment_id: appointment.id,
          service_id: appointment.service_id,
          provider_id: appointment.provider_id,
          rating: score,
          content,
          images: images || null,
          status: 'pending'
        },
        transaction
      );
      await notificationDal.createMany(
        [
          {
            user_id: appointment.provider.user_id,
            title: '收到新的用户评价',
            content: `用户对「${appointment.service.name}」提交了 ${score} 星评价，等待平台审核。`,
            type: 'review',
            related_id: appointment.id
          }
        ],
        transaction
      );
    });
    return success(res, null, '评价已提交，审核通过后展示');
  })
);

module.exports = router;
