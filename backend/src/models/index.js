const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/orm');

const common = {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, comment: '用户ID' },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true, comment: '登录账号' },
    password: { type: DataTypes.STRING(100), allowNull: false, comment: '加密密码' },
    nickname: { type: DataTypes.STRING(50), comment: '昵称' },
    real_name: { type: DataTypes.STRING(50), comment: '真实姓名' },
    phone: { type: DataTypes.STRING(20), unique: true, comment: '手机号' },
    email: { type: DataTypes.STRING(100), comment: '邮箱' },
    avatar: { type: DataTypes.STRING(255), comment: '头像地址' },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
      comment: '性别'
    },
    birthday: { type: DataTypes.DATEONLY, comment: '生日' },
    role: {
      type: DataTypes.ENUM('user', 'provider', 'admin'),
      allowNull: false,
      defaultValue: 'user',
      comment: '角色'
    },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: '健身积分' },
    status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1, comment: '1正常 0禁用' },
    last_login_at: { type: DataTypes.DATE, comment: '最后登录时间' }
  },
  {
    ...common,
    tableName: 'users',
    comment: '用户表',
    indexes: [{ name: 'idx_users_role_status', fields: ['role', 'status'] }]
  }
);

const Provider = sequelize.define(
  'Provider',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, comment: '门店ID' },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, comment: '服务商账号ID' },
    name: { type: DataTypes.STRING(100), allowNull: false, comment: '门店名称' },
    logo: { type: DataTypes.STRING(255), comment: '门店Logo' },
    cover: { type: DataTypes.STRING(255), comment: '门店封面' },
    description: { type: DataTypes.TEXT, comment: '门店简介' },
    address: { type: DataTypes.STRING(255), comment: '详细地址' },
    city: { type: DataTypes.STRING(50), comment: '城市' },
    phone: { type: DataTypes.STRING(20), comment: '联系电话' },
    business_hours: { type: DataTypes.STRING(100), defaultValue: '09:00-22:00', comment: '营业时间' },
    license_no: { type: DataTypes.STRING(100), comment: '营业执照编号' },
    license_image: { type: DataTypes.STRING(255), comment: '营业执照图片' },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'disabled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '入驻状态'
    },
    reject_reason: { type: DataTypes.STRING(255), comment: '驳回原因' },
    rating: { type: DataTypes.DECIMAL(2, 1), allowNull: false, defaultValue: 5.0, comment: '综合评分' },
    monthly_orders: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: '本月订单数' }
  },
  {
    ...common,
    tableName: 'providers',
    comment: '服务商/门店表',
    indexes: [{ name: 'idx_providers_status', fields: ['status'] }]
  }
);

const ServiceCategory = sequelize.define(
  'ServiceCategory',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, comment: '分类ID' },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true, comment: '分类名称' },
    icon: { type: DataTypes.STRING(50), comment: '图标标识' },
    description: { type: DataTypes.STRING(255), comment: '分类描述' },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: '排序值' },
    status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1, comment: '1启用 0停用' }
  },
  { ...common, updatedAt: false, tableName: 'service_categories', comment: '服务分类表' }
);

const Service = sequelize.define(
  'Service',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, comment: '服务ID' },
    provider_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, comment: '所属门店' },
    category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, comment: '服务分类' },
    name: { type: DataTypes.STRING(100), allowNull: false, comment: '服务名称' },
    cover: { type: DataTypes.STRING(255), comment: '服务封面' },
    description: { type: DataTypes.TEXT, comment: '服务详情' },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, comment: '销售价格' },
    original_price: { type: DataTypes.DECIMAL(10, 2), comment: '原价' },
    duration: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60, comment: '单次时长（分钟）' },
    capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 20, comment: '可预约人数' },
    sales: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: '累计销量' },
    rating: { type: DataTypes.DECIMAL(2, 1), allowNull: false, defaultValue: 5.0, comment: '服务评分' },
    tags: { type: DataTypes.STRING(255), comment: '标签，逗号分隔' },
    status: { type: DataTypes.ENUM('on', 'off'), allowNull: false, defaultValue: 'on', comment: '上下架状态' }
  },
  {
    ...common,
    tableName: 'services',
    comment: '场馆服务/课程表',
    indexes: [
      { name: 'idx_services_provider', fields: ['provider_id'] },
      { name: 'idx_services_category', fields: ['category_id'] },
      { name: 'idx_services_status', fields: ['status'] }
    ]
  }
);

const Coach = sequelize.define(
  'Coach',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, comment: '教练ID' },
    provider_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, comment: '所属门店' },
    name: { type: DataTypes.STRING(50), allowNull: false, comment: '教练姓名' },
    avatar: { type: DataTypes.STRING(255), comment: '头像' },
    title: { type: DataTypes.STRING(50), comment: '职称' },
    specialties: { type: DataTypes.STRING(255), comment: '擅长领域' },
    experience_years: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: '从业年限' },
    intro: { type: DataTypes.TEXT, comment: '教练简介' },
    rating: { type: DataTypes.DECIMAL(2, 1), allowNull: false, defaultValue: 5.0, comment: '评分' },
    status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1, comment: '1在职 0离职' }
  },
  {
    ...common,
    tableName: 'coaches',
    comment: '教练表',
    indexes: [{ name: 'idx_coaches_provider', fields: ['provider_id'] }]
  }
);

const Appointment = sequelize.define(
  'Appointment',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, comment: '预约ID' },
    appointment_no: { type: DataTypes.STRING(32), allowNull: false, unique: true, comment: '预约单号' },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, comment: '预约用户' },
    provider_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, comment: '门店' },
    service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, comment: '服务' },
    coach_id: { type: DataTypes.INTEGER.UNSIGNED, comment: '指定教练' },
    appointment_date: { type: DataTypes.DATEONLY, allowNull: false, comment: '预约日期' },
    time_slot: { type: DataTypes.STRING(30), allowNull: false, comment: '预约时段' },
    people_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, comment: '人数' },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0, comment: '订单金额' },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '订单状态'
    },
    contact_name: { type: DataTypes.STRING(50), comment: '联系人' },
    contact_phone: { type: DataTypes.STRING(20), comment: '联系电话' },
    remark: { type: DataTypes.STRING(255), comment: '用户备注' },
    cancel_reason: { type: DataTypes.STRING(255), comment: '取消原因' }
  },
  {
    ...common,
    tableName: 'appointments',
    comment: '预约订单表',
    indexes: [
      { name: 'idx_appointments_user', fields: ['user_id', 'status'] },
      { name: 'idx_appointments_provider', fields: ['provider_id', 'status'] },
      { name: 'idx_appointments_date', fields: ['appointment_date'] }
    ]
  }
);

const AppointmentLog = sequelize.define(
  'AppointmentLog',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    appointment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    from_status: { type: DataTypes.STRING(20), comment: '原状态' },
    to_status: { type: DataTypes.STRING(20), allowNull: false, comment: '新状态' },
    operator_type: {
      type: DataTypes.ENUM('user', 'provider', 'admin', 'system'),
      allowNull: false,
      defaultValue: 'system'
    },
    operator_id: { type: DataTypes.INTEGER.UNSIGNED },
    note: { type: DataTypes.STRING(255), comment: '操作说明' }
  },
  {
    ...common,
    updatedAt: false,
    tableName: 'appointment_logs',
    comment: '订单状态跟踪日志',
    indexes: [{ name: 'idx_logs_appointment', fields: ['appointment_id'] }]
  }
);

const Notification = sequelize.define(
  'Notification',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false },
    content: { type: DataTypes.STRING(500), allowNull: false },
    type: {
      type: DataTypes.ENUM('system', 'order', 'checkin', 'review'),
      allowNull: false,
      defaultValue: 'system'
    },
    related_id: { type: DataTypes.INTEGER.UNSIGNED, comment: '关联业务ID' },
    is_read: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 }
  },
  {
    ...common,
    updatedAt: false,
    tableName: 'notifications',
    comment: '消息通知表',
    indexes: [{ name: 'idx_notifications_user', fields: ['user_id', 'is_read'] }]
  }
);

const CheckinRule = sequelize.define(
  'CheckinRule',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false, comment: '规则名称' },
    checkin_type: { type: DataTypes.ENUM('venue', 'self'), allowNull: false, comment: '打卡类型' },
    points_per_checkin: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10, comment: '单次积分' },
    daily_limit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, comment: '每日次数上限' },
    min_duration: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30, comment: '最低运动时长' },
    description: { type: DataTypes.STRING(255) },
    status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1, comment: '1启用 0停用' }
  },
  { ...common, tableName: 'checkin_rules', comment: '打卡规则配置表' }
);

const CheckinRecord = sequelize.define(
  'CheckinRecord',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    provider_id: { type: DataTypes.INTEGER.UNSIGNED, comment: '打卡门店' },
    appointment_id: { type: DataTypes.INTEGER.UNSIGNED, comment: '关联预约' },
    checkin_type: { type: DataTypes.ENUM('venue', 'self'), allowNull: false, defaultValue: 'self' },
    checkin_date: { type: DataTypes.DATEONLY, allowNull: false },
    checkin_time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    calories: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    content: { type: DataTypes.STRING(255) },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'approved'
    },
    verified_by: { type: DataTypes.INTEGER.UNSIGNED },
    verified_at: { type: DataTypes.DATE },
    reject_reason: { type: DataTypes.STRING(255) }
  },
  {
    ...common,
    updatedAt: false,
    tableName: 'checkin_records',
    comment: '健身打卡记录表',
    indexes: [
      { name: 'idx_checkins_user_date', fields: ['user_id', 'checkin_date'] },
      { name: 'idx_checkins_provider_status', fields: ['provider_id', 'status'] }
    ]
  }
);

const BodyTest = sequelize.define(
  'BodyTest',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    provider_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    coach_id: { type: DataTypes.INTEGER.UNSIGNED },
    test_date: { type: DataTypes.DATEONLY, allowNull: false },
    height: { type: DataTypes.DECIMAL(5, 1), allowNull: false, comment: '身高cm' },
    weight: { type: DataTypes.DECIMAL(5, 1), allowNull: false, comment: '体重kg' },
    bmi: { type: DataTypes.DECIMAL(4, 1) },
    body_fat: { type: DataTypes.DECIMAL(4, 1), comment: '体脂率%' },
    muscle_mass: { type: DataTypes.DECIMAL(5, 1), comment: '肌肉量kg' },
    visceral_fat: { type: DataTypes.DECIMAL(4, 1), comment: '内脏脂肪等级' },
    basal_metabolism: { type: DataTypes.INTEGER, comment: '基础代谢kcal' },
    waist: { type: DataTypes.DECIMAL(5, 1), comment: '腰围cm' },
    chest: { type: DataTypes.DECIMAL(5, 1), comment: '胸围cm' },
    hip: { type: DataTypes.DECIMAL(5, 1), comment: '臀围cm' },
    body_age: { type: DataTypes.INTEGER, comment: '体年龄' },
    remark: { type: DataTypes.STRING(500), comment: '教练建议' }
  },
  {
    ...common,
    updatedAt: false,
    tableName: 'body_tests',
    comment: '体测数据表',
    indexes: [
      { name: 'idx_body_tests_user', fields: ['user_id', 'test_date'] },
      { name: 'idx_body_tests_provider', fields: ['provider_id'] }
    ]
  }
);

const Favorite = sequelize.define(
  'Favorite',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }
  },
  {
    ...common,
    updatedAt: false,
    tableName: 'favorites',
    comment: '服务收藏表',
    indexes: [
      { name: 'uk_favorites_user_service', unique: true, fields: ['user_id', 'service_id'] },
      { name: 'idx_favorites_service', fields: ['service_id'] }
    ]
  }
);

const Review = sequelize.define(
  'Review',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    appointment_id: { type: DataTypes.INTEGER.UNSIGNED },
    service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    provider_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    rating: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 5, comment: '1-5星' },
    content: { type: DataTypes.STRING(500), allowNull: false },
    images: { type: DataTypes.STRING(1000), comment: '评价图片，逗号分隔' },
    reply: { type: DataTypes.STRING(500), comment: '商家回复' },
    replied_at: { type: DataTypes.DATE },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    audit_remark: { type: DataTypes.STRING(255) }
  },
  {
    ...common,
    updatedAt: false,
    tableName: 'reviews',
    comment: '用户评价表',
    indexes: [
      { name: 'idx_reviews_user', fields: ['user_id'] },
      { name: 'idx_reviews_service', fields: ['service_id'] },
      { name: 'idx_reviews_provider', fields: ['provider_id'] },
      { name: 'idx_reviews_status', fields: ['status'] }
    ]
  }
);

User.hasOne(Provider, { foreignKey: 'user_id', as: 'provider', onDelete: 'CASCADE' });
Provider.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });
Provider.hasMany(Service, { foreignKey: 'provider_id', as: 'services', onDelete: 'CASCADE' });
Service.belongsTo(Provider, { foreignKey: 'provider_id', as: 'provider' });
ServiceCategory.hasMany(Service, { foreignKey: 'category_id', as: 'services' });
Service.belongsTo(ServiceCategory, { foreignKey: 'category_id', as: 'category' });
Provider.hasMany(Coach, { foreignKey: 'provider_id', as: 'coaches', onDelete: 'CASCADE' });
Coach.belongsTo(Provider, { foreignKey: 'provider_id', as: 'provider' });
User.hasMany(Appointment, { foreignKey: 'user_id', as: 'appointments', onDelete: 'CASCADE' });
Appointment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Provider.hasMany(Appointment, { foreignKey: 'provider_id', as: 'appointments', onDelete: 'CASCADE' });
Appointment.belongsTo(Provider, { foreignKey: 'provider_id', as: 'provider' });
Service.hasMany(Appointment, { foreignKey: 'service_id', as: 'appointments' });
Appointment.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
Coach.hasMany(Appointment, { foreignKey: 'coach_id', as: 'appointments', onDelete: 'SET NULL' });
Appointment.belongsTo(Coach, { foreignKey: 'coach_id', as: 'coach' });
Appointment.hasMany(AppointmentLog, { foreignKey: 'appointment_id', as: 'logs', onDelete: 'CASCADE' });
AppointmentLog.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(CheckinRecord, { foreignKey: 'user_id', as: 'checkins', onDelete: 'CASCADE' });
CheckinRecord.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Provider.hasMany(CheckinRecord, { foreignKey: 'provider_id', as: 'checkins', onDelete: 'SET NULL' });
CheckinRecord.belongsTo(Provider, { foreignKey: 'provider_id', as: 'provider' });
Appointment.hasOne(CheckinRecord, { foreignKey: 'appointment_id', as: 'checkin', onDelete: 'SET NULL' });
CheckinRecord.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
User.hasMany(BodyTest, { foreignKey: 'user_id', as: 'bodyTests', onDelete: 'CASCADE' });
BodyTest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Provider.hasMany(BodyTest, { foreignKey: 'provider_id', as: 'bodyTests', onDelete: 'CASCADE' });
BodyTest.belongsTo(Provider, { foreignKey: 'provider_id', as: 'provider' });
Coach.hasMany(BodyTest, { foreignKey: 'coach_id', as: 'bodyTests', onDelete: 'SET NULL' });
BodyTest.belongsTo(Coach, { foreignKey: 'coach_id', as: 'coach' });
User.hasMany(Favorite, { foreignKey: 'user_id', as: 'favorites', onDelete: 'CASCADE' });
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Service.hasMany(Favorite, { foreignKey: 'service_id', as: 'favorites', onDelete: 'CASCADE' });
Favorite.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Appointment.hasOne(Review, { foreignKey: 'appointment_id', as: 'review', onDelete: 'SET NULL' });
Review.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
Service.hasMany(Review, { foreignKey: 'service_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
Provider.hasMany(Review, { foreignKey: 'provider_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(Provider, { foreignKey: 'provider_id', as: 'provider' });

module.exports = {
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
};
