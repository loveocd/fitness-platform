const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Provider,
  ServiceCategory,
  Service,
  Coach,
  Appointment,
  AppointmentLog,
  Notification,
  CheckinRule,
  CheckinRecord,
  BodyTest,
  Favorite,
  Review
} = require('../models');

function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function dateTimeOffset(days, hour = 10, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function seedDemoData() {
  const commonPassword = bcrypt.hashSync('123456', 10);
  const adminPassword = bcrypt.hashSync('admin123', 10);

  return sequelize.transaction(async (transaction) => {
    const createUser = (data) => User.create(data, { transaction });

    const admin = await createUser({
      username: 'admin',
      password: adminPassword,
      nickname: '平台管理员',
      real_name: '平台管理员',
      phone: '13800000000',
      email: 'admin@fitness.com',
      role: 'admin'
    });
    const user1 = await createUser({
      username: 'demo',
      password: commonPassword,
      nickname: '张晓宇',
      real_name: '张晓宇',
      phone: '13800000001',
      email: 'demo@fitness.com',
      gender: 'male',
      role: 'user',
      points: 260
    });
    const user2 = await createUser({
      username: 'lily',
      password: commonPassword,
      nickname: '李小雨',
      real_name: '李小雨',
      phone: '13800000002',
      email: 'lily@fitness.com',
      gender: 'female',
      role: 'user',
      points: 120
    });
    const providerUser1 = await createUser({
      username: 'provider',
      password: commonPassword,
      nickname: '王店长',
      real_name: '王浩',
      phone: '13800000003',
      email: 'provider@fitness.com',
      gender: 'male',
      role: 'provider'
    });
    const providerUser2 = await createUser({
      username: 'yoga',
      password: commonPassword,
      nickname: '陈店长',
      real_name: '陈静',
      phone: '13800000004',
      email: 'yoga@fitness.com',
      gender: 'female',
      role: 'provider'
    });
    const providerUser3 = await createUser({
      username: 'boxing',
      password: commonPassword,
      nickname: '赵店长',
      real_name: '赵强',
      phone: '13800000005',
      email: 'boxing@fitness.com',
      gender: 'male',
      role: 'provider'
    });

    const provider1 = await Provider.create(
      {
        user_id: providerUser1.id,
        name: '燃力健身 · 中心店',
        cover:
          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
        description:
          '位于城市中心的一站式智能健身空间，配备进口力量器械、有氧训练区、私教工作室与专业体测中心，为每位会员提供科学、可持续的训练方案。',
        address: '上海市静安区南京西路 889 号 5 层',
        city: '上海',
        phone: '021-6888-1001',
        business_hours: '06:30-22:30',
        license_no: '91310000MA1FL001X1',
        status: 'approved',
        rating: 4.9,
        monthly_orders: 128
      },
      { transaction }
    );
    const provider2 = await Provider.create(
      {
        user_id: providerUser2.id,
        name: '悦动瑜伽 · 滨江店',
        cover:
          'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80',
        description:
          '专注瑜伽与普拉提的静谧练习空间，拥有恒温教室、空中瑜伽区与一对一私教室。让身体在呼吸中舒展，在坚持中改变。',
        address: '上海市浦东新区滨江大道 168 号 3 层',
        city: '上海',
        phone: '021-6888-2002',
        business_hours: '08:00-21:30',
        license_no: '91310000MA1FL002X2',
        status: 'approved',
        rating: 4.8,
        monthly_orders: 96
      },
      { transaction }
    );
    const provider3 = await Provider.create(
      {
        user_id: providerUser3.id,
        name: '极速拳击 · 徐汇馆',
        cover:
          'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1200&q=80',
        description:
          '面向都市青年的拳击训练馆，提供零基础拳击、体能塑形与实战训练课程，专业擂台与沙袋区一应俱全。',
        address: '上海市徐汇区漕溪北路 66 号 B1',
        city: '上海',
        phone: '021-6888-3003',
        business_hours: '10:00-22:00',
        license_no: '91310000MA1FL003X3',
        status: 'pending',
        rating: 5.0
      },
      { transaction }
    );

    const categoryData = [
      ['健身私教', 'PersonalTrainer', '一对一定制训练与体态改善', 1],
      ['团操课程', 'Trophy', '燃脂、搏击、舞蹈等团体课程', 2],
      ['瑜伽普拉提', 'Sunny', '瑜伽、普拉提与身心平衡', 3],
      ['游泳健身', 'Ship', '泳池课程与水中训练', 4],
      ['拳击格斗', 'Box', '拳击、格斗与体能训练', 5],
      ['体测服务', 'DataAnalysis', 'InBody 体测与专业报告解读', 6]
    ];
    const categories = [];
    for (const [name, icon, description, sort_order] of categoryData) {
      categories.push(
        await ServiceCategory.create(
          { name, icon, description, sort_order },
          { transaction }
        )
      );
    }

    const serviceRows = [
      {
        provider_id: provider1.id,
        category_id: categories[0].id,
        name: '私教体验课 · 体态评估',
        cover:
          'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
        description:
          '60 分钟一对一私教体验，包含基础体态评估、运动能力测试和个性化训练建议。适合第一次接触力量训练的会员。',
        price: 199,
        original_price: 399,
        duration: 60,
        capacity: 6,
        sales: 328,
        rating: 4.9,
        tags: '一对一定制,体态评估,新手友好'
      },
      {
        provider_id: provider1.id,
        category_id: categories[1].id,
        name: '燃脂搏击团课',
        cover:
          'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
        description:
          '融合拳击步伐与高强度间歇训练的燃脂团课，在音乐节奏中释放压力、提升心肺，一节课轻松燃烧 500+ 千卡。',
        price: 89,
        original_price: 129,
        duration: 60,
        capacity: 20,
        sales: 516,
        rating: 4.8,
        tags: '高效燃脂,释放压力,小班团课'
      },
      {
        provider_id: provider1.id,
        category_id: categories[0].id,
        name: '月度健身畅练卡',
        cover:
          'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=800&q=80',
        description:
          '30 天不限次畅练，含器械区、有氧区与基础团课，赠送一次 InBody 体测和训练计划制定。',
        price: 299,
        original_price: 499,
        duration: 30,
        capacity: 100,
        sales: 892,
        rating: 4.7,
        tags: '不限次,赠体测,月卡'
      },
      {
        provider_id: provider1.id,
        category_id: categories[5].id,
        name: 'InBody 专业体测分析',
        cover:
          'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=800&q=80',
        description:
          '使用专业 InBody 设备检测体成分、肌肉分布与基础代谢，由资深教练一对一解读报告并给出改善建议。',
        price: 99,
        original_price: 159,
        duration: 40,
        capacity: 10,
        sales: 204,
        rating: 4.9,
        tags: '专业设备,报告解读,数据追踪'
      },
      {
        provider_id: provider2.id,
        category_id: categories[2].id,
        name: '流瑜伽基础课',
        cover:
          'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
        description:
          '以呼吸串联体式的流瑜伽基础课程，帮助改善身体柔韧性与肩颈紧张，适合零基础学员。',
        price: 128,
        original_price: 168,
        duration: 60,
        capacity: 15,
        sales: 438,
        rating: 4.9,
        tags: '零基础,肩颈放松,恒温教室'
      },
      {
        provider_id: provider2.id,
        category_id: categories[2].id,
        name: '普拉提器械小班',
        cover:
          'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
        description:
          '使用核心床进行小班普拉提训练，强化深层核心、改善体态与身体控制力，每班不超过 6 人。',
        price: 258,
        original_price: 328,
        duration: 50,
        capacity: 6,
        sales: 267,
        rating: 4.9,
        tags: '核心训练,小班教学,体态改善'
      },
      {
        provider_id: provider2.id,
        category_id: categories[2].id,
        name: '一对一瑜伽私教',
        cover:
          'https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=800&q=80',
        description:
          '根据身体情况定制专属练习方案，适合有康复需求、备孕或希望进阶练习的会员。',
        price: 299,
        original_price: 399,
        duration: 60,
        capacity: 3,
        sales: 156,
        rating: 5.0,
        tags: '专属方案,一对一,身心平衡'
      },
      {
        provider_id: provider2.id,
        category_id: categories[5].id,
        name: '体态评估与改善方案',
        cover:
          'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
        description:
          '从站姿、步态和关节活动度出发进行体态评估，输出可执行的改善训练方案。',
        price: 168,
        original_price: 228,
        duration: 45,
        capacity: 8,
        sales: 189,
        rating: 4.8,
        tags: '体态评估,改善方案,专业教练'
      },
      {
        provider_id: provider2.id,
        category_id: categories[1].id,
        name: '晨间燃脂团课',
        cover:
          'https://images.unsplash.com/photo-1518310383802-640c2de311b6?auto=format&fit=crop&w=800&q=80',
        description:
          '清晨 45 分钟低冲击燃脂训练，唤醒身体代谢，开启元气满满的一天。',
        price: 69,
        original_price: 99,
        duration: 45,
        capacity: 18,
        sales: 312,
        rating: 4.7,
        tags: '低冲击,晨间唤醒,轻松燃脂'
      }
    ];
    const services = await Service.bulkCreate(serviceRows, {
      transaction,
      returning: true
    });

    const coach1 = await Coach.create(
      {
        provider_id: provider1.id,
        name: '王教练',
        avatar: 'https://i.pravatar.cc/200?img=12',
        title: '高级私人教练',
        specialties: '增肌塑形、减脂、体态改善',
        experience_years: 8,
        intro: '国家职业资格认证教练，累计授课 5000+ 节，擅长为新手制定循序渐进的训练计划。',
        rating: 4.9
      },
      { transaction }
    );
    const coach2 = await Coach.create(
      {
        provider_id: provider1.id,
        name: '李教练',
        avatar: 'https://i.pravatar.cc/200?img=33',
        title: '搏击团课教练',
        specialties: '搏击、HIIT、体能训练',
        experience_years: 6,
        intro: '前专业拳击运动员，课堂节奏充满能量，注重动作安全与训练体验。',
        rating: 4.8
      },
      { transaction }
    );
    const coach3 = await Coach.create(
      {
        provider_id: provider2.id,
        name: '陈教练',
        avatar: 'https://i.pravatar.cc/200?img=47',
        title: '资深瑜伽导师',
        specialties: '流瑜伽、阴瑜伽、孕产瑜伽',
        experience_years: 10,
        intro: '全美瑜伽联盟 RYT500 认证导师，关注呼吸与身体的连接，课堂温和而有力量。',
        rating: 4.9
      },
      { transaction }
    );
    const coach4 = await Coach.create(
      {
        provider_id: provider2.id,
        name: '林教练',
        avatar: 'https://i.pravatar.cc/200?img=45',
        title: '普拉提导师',
        specialties: '器械普拉提、核心训练、体态改善',
        experience_years: 7,
        intro: '专注普拉提器械教学与体态调整，善于用精准口令帮助学员找到核心发力。',
        rating: 4.9
      },
      { transaction }
    );
    const coach5 = await Coach.create(
      {
        provider_id: provider1.id,
        name: '赵教练',
        avatar: 'https://i.pravatar.cc/200?img=15',
        title: '体测与康复教练',
        specialties: '体成分分析、运动康复、功能训练',
        experience_years: 9,
        intro: '运动康复专业背景，擅长通过体测数据制定个性化训练与恢复方案。',
        rating: 4.8
      },
      { transaction }
    );

    const appointmentRows = [
      {
        appointment_no: 'FT202610190001',
        user_id: user1.id,
        provider_id: provider1.id,
        service_id: services[0].id,
        coach_id: coach1.id,
        appointment_date: dateOffset(2),
        time_slot: '19:00-20:00',
        amount: 199,
        status: 'confirmed',
        contact_name: '张晓宇',
        contact_phone: '13800000001',
        remark: '想重点改善圆肩问题'
      },
      {
        appointment_no: 'FT202610190002',
        user_id: user1.id,
        provider_id: provider2.id,
        service_id: services[4].id,
        coach_id: coach3.id,
        appointment_date: dateOffset(4),
        time_slot: '10:00-11:00',
        amount: 128,
        status: 'pending',
        contact_name: '张晓宇',
        contact_phone: '13800000001',
        remark: '第一次练习瑜伽'
      },
      {
        appointment_no: 'FT202610190003',
        user_id: user1.id,
        provider_id: provider1.id,
        service_id: services[1].id,
        coach_id: coach2.id,
        appointment_date: dateOffset(-6),
        time_slot: '18:30-19:30',
        amount: 89,
        status: 'completed',
        contact_name: '张晓宇',
        contact_phone: '13800000001'
      },
      {
        appointment_no: 'FT202610190004',
        user_id: user1.id,
        provider_id: provider1.id,
        service_id: services[3].id,
        coach_id: coach5.id,
        appointment_date: dateOffset(-20),
        time_slot: '14:00-14:40',
        amount: 99,
        status: 'completed',
        contact_name: '张晓宇',
        contact_phone: '13800000001'
      },
      {
        appointment_no: 'FT202610190005',
        user_id: user1.id,
        provider_id: provider2.id,
        service_id: services[5].id,
        coach_id: coach4.id,
        appointment_date: dateOffset(-2),
        time_slot: '20:00-20:50',
        amount: 258,
        status: 'cancelled',
        contact_name: '张晓宇',
        contact_phone: '13800000001',
        cancel_reason: '临时加班，时间冲突'
      },
      {
        appointment_no: 'FT202610190006',
        user_id: user2.id,
        provider_id: provider2.id,
        service_id: services[8].id,
        coach_id: coach3.id,
        appointment_date: dateOffset(0),
        time_slot: '08:00-08:45',
        amount: 69,
        status: 'confirmed',
        contact_name: '李小雨',
        contact_phone: '13800000002'
      },
      {
        appointment_no: 'FT202610190007',
        user_id: user2.id,
        provider_id: provider1.id,
        service_id: services[2].id,
        appointment_date: dateOffset(-3),
        time_slot: '全天可用',
        amount: 299,
        status: 'completed',
        contact_name: '李小雨',
        contact_phone: '13800000002'
      },
      {
        appointment_no: 'FT202610190008',
        user_id: user2.id,
        provider_id: provider2.id,
        service_id: services[6].id,
        coach_id: coach3.id,
        appointment_date: dateOffset(1),
        time_slot: '15:00-16:00',
        amount: 299,
        status: 'pending',
        contact_name: '李小雨',
        contact_phone: '13800000002'
      }
    ];
    const appointments = await Appointment.bulkCreate(appointmentRows, {
      transaction,
      returning: true
    });

    const logRows = [
      [appointments[0].id, null, 'pending', 'user', user1.id, '用户提交预约'],
      [appointments[0].id, 'pending', 'confirmed', 'provider', providerUser1.id, '门店已确认预约'],
      [appointments[1].id, null, 'pending', 'user', user1.id, '用户提交预约'],
      [appointments[2].id, null, 'pending', 'user', user1.id, '用户提交预约'],
      [appointments[2].id, 'pending', 'confirmed', 'provider', providerUser1.id, '门店已确认预约'],
      [appointments[2].id, 'confirmed', 'completed', 'provider', providerUser1.id, '用户到店完成课程'],
      [appointments[3].id, 'pending', 'confirmed', 'provider', providerUser1.id, '门店已确认预约'],
      [appointments[3].id, 'confirmed', 'completed', 'provider', providerUser1.id, '体测完成，报告已交付'],
      [appointments[4].id, 'pending', 'cancelled', 'user', user1.id, '临时加班，时间冲突'],
      [appointments[5].id, 'pending', 'confirmed', 'provider', providerUser2.id, '门店已确认预约'],
      [appointments[6].id, 'pending', 'confirmed', 'provider', providerUser1.id, '月卡已激活'],
      [appointments[6].id, 'confirmed', 'completed', 'system', null, '月卡周期结束'],
      [appointments[7].id, 'pending', 'pending', 'user', user2.id, '用户提交预约']
    ];
    await AppointmentLog.bulkCreate(
      logRows.map(([appointment_id, from_status, to_status, operator_type, operator_id, note]) => ({
        appointment_id,
        from_status,
        to_status,
        operator_type,
        operator_id,
        note
      })),
      { transaction }
    );

    await Notification.bulkCreate(
      [
        {
          user_id: user1.id,
          title: '预约已确认',
          content: '你预约的「私教体验课 · 体态评估」已由燃力健身确认，请提前 10 分钟到店。',
          type: 'order',
          related_id: appointments[0].id
        },
        {
          user_id: user1.id,
          title: '打卡积分到账',
          content: '昨日运动打卡获得 20 积分，继续保持！',
          type: 'checkin'
        },
        {
          user_id: user1.id,
          title: '体测报告已更新',
          content: '赵教练为你录入了最新体测数据，快去看看身体变化。',
          type: 'system'
        },
        {
          user_id: user2.id,
          title: '预约提醒',
          content: '你预约的晨间燃脂团课将在今天 08:00 开始，记得准时到店。',
          type: 'order',
          related_id: appointments[5].id
        },
        {
          user_id: providerUser1.id,
          title: '新的待确认预约',
          content: '有 1 笔新的预约订单等待确认。',
          type: 'order',
          related_id: appointments[0].id
        },
        {
          user_id: providerUser1.id,
          title: '待核验打卡',
          content: '有 1 条场馆打卡记录等待核验。',
          type: 'checkin'
        }
      ],
      { transaction }
    );

    const selfRule = await CheckinRule.create(
      {
        name: '自主运动打卡规则',
        checkin_type: 'self',
        points_per_checkin: 10,
        daily_limit: 1,
        min_duration: 30,
        description: '每日可自主打卡 1 次，运动满 30 分钟获得 10 积分。',
        status: 1
      },
      { transaction }
    );
    const venueRule = await CheckinRule.create(
      {
        name: '场馆签到打卡规则',
        checkin_type: 'venue',
        points_per_checkin: 20,
        daily_limit: 1,
        min_duration: 30,
        description: '到店完成预约课程后打卡，经门店核验获得 20 积分。',
        status: 1
      },
      { transaction }
    );

    const checkins = [
      [user1.id, provider1.id, appointments[2].id, 'venue', dateOffset(-6), 60, 520, 20, '搏击团课完成，大汗淋漓！', 'approved'],
      [user1.id, null, null, 'self', dateOffset(-5), 45, 280, 10, '公园慢跑 5 公里', 'approved'],
      [user1.id, provider1.id, null, 'self', dateOffset(-4), 55, 360, 10, '力量训练：胸肩', 'approved'],
      [user1.id, null, null, 'self', dateOffset(-3), 35, 210, 10, '居家核心训练', 'approved'],
      [user1.id, provider2.id, null, 'self', dateOffset(-2), 60, 260, 10, '流瑜伽自我练习', 'approved'],
      [user1.id, provider1.id, null, 'self', dateOffset(-1), 48, 410, 10, '跑步机 + 拉伸', 'approved'],
      [user1.id, null, null, 'self', dateOffset(0), 40, 300, 10, '晨间空腹有氧', 'approved'],
      [user2.id, provider1.id, appointments[6].id, 'venue', dateOffset(-3), 90, 650, 0, '月卡首次到店训练', 'pending'],
      [user2.id, null, null, 'self', dateOffset(-5), 50, 320, 10, '夜跑 4 公里', 'approved'],
      [user2.id, null, null, 'self', dateOffset(-2), 30, 180, 10, '拉伸放松', 'approved']
    ];
    await CheckinRecord.bulkCreate(
      checkins.map(
        ([
          user_id,
          provider_id,
          appointment_id,
          checkin_type,
          checkin_date,
          duration_minutes,
          calories,
          points,
          content,
          status
        ]) => ({
          user_id,
          provider_id,
          appointment_id,
          checkin_type,
          checkin_date,
          checkin_time: new Date(`${checkin_date} 18:30:00`),
          duration_minutes,
          calories,
          points,
          content,
          status
        })
      ),
      { transaction }
    );

    await BodyTest.bulkCreate(
      [
        {
          user_id: user1.id,
          provider_id: provider1.id,
          coach_id: coach5.id,
          test_date: dateOffset(-90),
          height: 178,
          weight: 78.5,
          bmi: 24.8,
          body_fat: 22.1,
          muscle_mass: 56.2,
          visceral_fat: 8,
          basal_metabolism: 1680,
          waist: 88,
          chest: 102,
          hip: 98,
          body_age: 31,
          remark: '基础力量较好，建议增加有氧频率，控制腰围。'
        },
        {
          user_id: user1.id,
          provider_id: provider1.id,
          coach_id: coach5.id,
          test_date: dateOffset(-45),
          height: 178,
          weight: 75.2,
          bmi: 23.7,
          body_fat: 19.8,
          muscle_mass: 56.8,
          visceral_fat: 6.5,
          basal_metabolism: 1710,
          waist: 84,
          chest: 101,
          hip: 96,
          body_age: 29,
          remark: '体脂下降明显，肌肉量保持稳定，继续当前训练节奏。'
        },
        {
          user_id: user1.id,
          provider_id: provider1.id,
          coach_id: coach5.id,
          test_date: dateOffset(-7),
          height: 178,
          weight: 73.1,
          bmi: 23.1,
          body_fat: 17.9,
          muscle_mass: 57.1,
          visceral_fat: 5.5,
          basal_metabolism: 1735,
          waist: 81,
          chest: 100,
          hip: 95,
          body_age: 28,
          remark: '核心力量提升，下一步加强肩背稳定性与柔韧性。'
        },
        {
          user_id: user2.id,
          provider_id: provider2.id,
          coach_id: coach3.id,
          test_date: dateOffset(-60),
          height: 165,
          weight: 56.8,
          bmi: 20.9,
          body_fat: 25.6,
          muscle_mass: 37.5,
          visceral_fat: 5,
          basal_metabolism: 1280,
          waist: 68,
          chest: 86,
          hip: 93,
          body_age: 27,
          remark: '柔韧性优秀，建议增加下肢力量训练。'
        },
        {
          user_id: user2.id,
          provider_id: provider2.id,
          coach_id: coach3.id,
          test_date: dateOffset(-10),
          height: 165,
          weight: 55.2,
          bmi: 20.3,
          body_fat: 24.1,
          muscle_mass: 38.2,
          visceral_fat: 4.5,
          basal_metabolism: 1305,
          waist: 66,
          chest: 85,
          hip: 92,
          body_age: 26,
          remark: '核心稳定性提升，继续保持每周 3 次训练。'
        }
      ],
      { transaction }
    );

    await Favorite.bulkCreate(
      [
        { user_id: user1.id, service_id: services[1].id },
        { user_id: user1.id, service_id: services[4].id },
        { user_id: user1.id, service_id: services[5].id },
        { user_id: user2.id, service_id: services[0].id }
      ],
      { transaction }
    );

    await Review.bulkCreate(
      [
        {
          user_id: user1.id,
          appointment_id: appointments[2].id,
          service_id: services[1].id,
          provider_id: provider1.id,
          rating: 5,
          content: '李教练的团课太有感染力了！动作讲解很细，整节课节奏安排得特别好，出汗量拉满。',
          status: 'approved',
          reply: '谢谢你的认可！李教练每周二、四晚都有课，期待下次见面。',
          replied_at: dateTimeOffset(-1, 16, 20)
        },
        {
          user_id: user1.id,
          appointment_id: appointments[3].id,
          service_id: services[3].id,
          provider_id: provider1.id,
          rating: 4,
          content: '体测设备很专业，报告解读也很详细，教练给了很实用的饮食建议。',
          status: 'approved',
          reply: '感谢反馈，我们会持续优化服务体验。',
          replied_at: dateTimeOffset(-1, 16, 20)
        },
        {
          user_id: user2.id,
          appointment_id: appointments[6].id,
          service_id: services[2].id,
          provider_id: provider1.id,
          rating: 5,
          content: '月卡性价比很高，器械齐全，早上去人不多，体验很好。',
          status: 'pending'
        }
      ],
      { transaction }
    );
  });
}

module.exports = seedDemoData;
