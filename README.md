# 基于 Vue 的健身房综合服务平台交互设计与实现

一个前后端分离的健身房综合服务平台，包含 **会员端、服务商端、平台管理端** 三套角色工作台。项目使用 Vue 3 + Element Plus 构建前端，Node.js + Express + MySQL 构建后端，覆盖场馆筛选、预约下单、订单跟踪、健身打卡、体测记录、评价审核、门店经营与平台监管等完整业务。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Vue 3、Vite、Vue Router、Pinia、Axios、Element Plus、ECharts |
| 后端 | Node.js、Express、Sequelize ORM、JWT、bcryptjs、mysql2 |
| 数据库 | MySQL 5.7 / 8.0，Navicat for MySQL |
| 开发方式 | 前后端分离，RESTful API |

## 项目结构

```text
zuo/
├─ backend/                     Node.js + Express 后端
│  ├─ scripts/
│  │  └─ seed.js                可选：手动执行演示数据初始化
│  ├─ src/
│  │  ├─ config/orm.js          Sequelize 实例与自动建库
│  │  ├─ models/index.js        13 个 ORM 模型与关联关系
│  │  ├─ dal/                   数据访问层，按业务域封装模型查询
│  │  ├─ database/
│  │  │  ├─ init.js             自动建库、同步模型、判断是否初始化
│  │  │  └─ seed.js             演示数据（ORM 写入）
│  │  ├─ middleware/            登录鉴权、角色权限、错误处理
│  │  ├─ routes/
│  │  │  ├─ auth.routes.js      登录、注册、个人账号
│  │  │  ├─ public.routes.js    场馆、服务、分类、公开评价
│  │  │  ├─ user.routes.js      会员端接口
│  │  │  ├─ provider.routes.js  服务商端接口
│  │  │  └─ admin.routes.js     平台管理端接口
│  │  ├─ app.js
│  │  └─ server.js
│  ├─ .env.example              环境变量模板
│  └─ package.json
├─ frontend/                    Vue 3 + Vite 前端
│  ├─ src/
│  │  ├─ api/                   Axios 请求封装
│  │  ├─ components/            通用卡片、图表、状态标签等
│  │  ├─ config/menus.js        三端菜单配置
│  │  ├─ layouts/               统一后台布局
│  │  ├─ router/                角色路由与权限守卫
│  │  ├─ stores/auth.js         登录状态管理
│  │  ├─ styles/                全局设计系统
│  │  └─ views/
│  │     ├─ user/               会员端 9 个页面
│  │     ├─ provider/           服务商端 9 个页面
│  │     └─ admin/              平台管理端 8 个页面
│  └─ package.json
└─ docs/
   └─ API.md                    接口说明
```

## ORM + DAL 分层

后端数据访问采用 `路由 → DAL → Sequelize Model → MySQL` 的分层方式：

```text
routes/          只处理 HTTP 参数、业务规则和响应
dal/             统一数据访问，路由中不直接写 SQL
models/          Sequelize 模型映射、字段约束、索引和表关联
config/orm.js    Sequelize 连接池、时区、字符集和自动建库
database/init.js 启动时同步全部模型，首次运行自动写入演示数据
```

主要模型包括 `User`、`Provider`、`ServiceCategory`、`Service`、`Coach`、`Appointment`、`AppointmentLog`、`Notification`、`CheckinRule`、`CheckinRecord`、`BodyTest`、`Favorite`、`Review`。实体增删改查使用 ORM 完成，营业报表与平台统计等聚合查询统一封装在 DAL 的统计模块中。

## 功能模块

### 会员端

- 个人中心：资料维护、健身积分、账号安全。
- 健身打卡记录：自主打卡、场馆打卡、月历轨迹、连续打卡、积分规则。
- 场馆服务筛选：关键词、服务分类、评分/人气/最新排序。
- 场馆详情：服务项目、教练团队、评价统计、收藏、在线预约。
- 预约下单：日期、时段、教练、人数、联系人、备注与金额计算。
- 订单跟踪与通知：状态时间线、取消预约、到店打卡、消息中心。
- 体测数据记录：BMI、体脂率、肌肉量、内脏脂肪、基础代谢、趋势图。
- 收藏与评价：服务收藏、订单评价、审核状态、商家回复。

### 服务商端

- 经营概览：今日订单、待确认订单、本月营收、核销打卡、趋势图。
- 门店与教练信息管理：门店资料、封面预览、教练增改与在职状态。
- 服务管理：服务上架/下架、价格、时长、容量、分类与标签。
- 预约订单处理：确认、完成、取消，订单状态日志与会员通知。
- 打卡核验管理：核验到店打卡，通过后自动发放积分，支持驳回原因。
- 学员体测记录管理：学员档案、体测录入、编辑与训练建议。
- 用户评价管理：评分统计、评价筛选、商家回复。
- 营业数据统计：营收趋势、品类占比、项目排行、时段分布、客户复购。

### 平台后台管理端

- 服务商入驻管理：入驻审核、驳回原因、门店停用与恢复。
- 用户账号管理：会员/服务商筛选、禁用启用、重置密码、业务数据概览。
- 订单监管与审核：全平台订单查询、状态干预、取消与退款处理。
- 服务分类管理：分类新增、编辑、排序、启停与删除保护。
- 打卡规则配置：自主/场馆打卡积分、每日上限、最低时长。
- 用户评价审核：通过、驳回、审核说明与评分重算。
- 平台数据统计：用户、服务商、订单、营收、打卡活跃度与服务商排行。

## 快速启动

### 1. 准备数据库

不需要在 Navicat 或 SQL 文件中手动建库建表。确保 MySQL 服务已启动，并确认 `backend/.env` 中的账号有创建数据库和数据表的权限即可。后端启动时会：

1. 连接 MySQL 并自动创建 `fitness_platform` 数据库（如果不存在）。
2. 使用 Sequelize 同步 13 个模型，自动创建所有数据表、索引和外键。
3. 如果 `users` 表为空，自动写入演示账号和示例数据。

### 2. 启动后端

```bash
cd backend
```

项目已经提供数据库连接配置，打开 `backend/.env` 核对 Navicat 中使用的连接信息：

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=fitness_platform
AUTO_SEED=true
DB_SYNC_ALTER=false
JWT_SECRET=fitness_platform_secret_2026
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
```

安装依赖并启动：

```bash
npm install
npm run dev
```

首次启动会自动建库、建表并写入演示数据。`npm run seed` 是可选命令，只在需要手动触发演示数据初始化时使用。

后端地址：`http://localhost:3000`  
健康检查：`http://localhost:3000/api/health`

### 3. 启动前端

另开一个终端：

```bash
cd frontend
npm install
npm run dev
```

浏览器打开：`http://localhost:5173`

Vite 已配置 `/api` 代理到 `http://localhost:3000`，前端无需额外配置接口地址。

## 演示账号

| 角色 | 账号 | 密码 | 说明 |
| --- | --- | --- | --- |
| 会员 | `demo` | `123456` | 张晓宇，有预约、打卡、体测与收藏数据 |
| 会员 | `lily` | `123456` | 李小雨，有打卡与待审核评价数据 |
| 服务商 | `provider` | `123456` | 燃力健身 · 中心店 |
| 服务商 | `yoga` | `123456` | 悦动瑜伽 · 滨江店 |
| 服务商 | `boxing` | `123456` | 极速拳击 · 徐汇馆（待审核） |
| 管理员 | `admin` | `admin123` | 平台管理端 |

> 密码在后端使用 bcrypt 加密存储。部署到正式环境前请修改 `JWT_SECRET` 和演示账号密码。

## 数据库表

| 表名 | 说明 |
| --- | --- |
| `users` | 用户表，包含会员、服务商账号与管理员 |
| `providers` | 服务商/门店表，含入驻审核状态 |
| `service_categories` | 服务分类表 |
| `services` | 场馆服务/课程表 |
| `coaches` | 教练信息表 |
| `appointments` | 预约订单表 |
| `appointment_logs` | 订单状态跟踪日志 |
| `notifications` | 消息通知表 |
| `checkin_rules` | 打卡规则配置 |
| `checkin_records` | 健身打卡记录 |
| `body_tests` | 会员体测数据 |
| `favorites` | 服务收藏 |
| `reviews` | 用户评价与商家回复 |

详细接口说明见 [docs/API.md](docs/API.md)。

## 核心业务流

```text
用户浏览场馆 → 筛选分类/排序 → 查看服务与教练 → 提交预约
→ 服务商确认 → 用户到店 → 完成服务 → 提交评价 → 平台审核 → 展示评价

用户到店 → 提交场馆打卡 → 服务商核验 → 通过后发放积分
用户自主运动 → 自主打卡 → 按规则自动通过 → 即时获得积分

服务商提交入驻 → 平台审核 → 完善门店资料 → 上架服务/添加教练
```

## 生产构建

```bash
cd frontend
npm run build
```

构建结果在 `frontend/dist`，可部署到 Nginx。后端可使用 PM2：

```bash
cd backend
npm install -g pm2
pm2 start src/server.js --name fitness-platform-api
```

部署时记得：

- 修改 `backend/.env` 中的数据库账号与 `JWT_SECRET`。
- 把 `CLIENT_ORIGIN` 改为前端正式域名。
- 在 Nginx 中把 `/api` 反向代理到后端 3000 端口。
- 为前端路由配置 `try_files $uri $uri/ /index.html;`，避免刷新 404。

## 常见问题

**后端提示数据库连接失败**

检查 MySQL 服务是否启动，并核对 `backend/.env` 中的 `DB_USER`、`DB_PASSWORD`、`DB_NAME`。可先在 Navicat 中测试连接。

**数据库表没有自动创建**

确认 `backend/.env` 中的 MySQL 用户拥有 `CREATE DATABASE` 和 `CREATE TABLE` 权限。Sequelize 使用 `sequelize.sync()` 创建缺失的表，不会删除已有数据。如果只想重新导入演示数据，可以先清空业务表，再执行 `npm run seed`。

**修改模型后数据库字段没有变化**

默认 `DB_SYNC_ALTER=false`，避免误改已有表结构。开发阶段可临时设为 `true` 让 Sequelize 尝试同步字段变更；正式环境建议使用迁移文件管理表结构。

**npm 安装时报缓存目录无权限**

Windows 下可临时指定项目内缓存：

```bash
npm install --cache ../work/npm-cache
```

**场馆封面不显示**

演示数据使用 Unsplash 远程图片。网络无法访问时会显示渐变占位图，不影响预约、打卡等功能。正式项目可将图片地址替换为本地静态资源或对象存储地址。
