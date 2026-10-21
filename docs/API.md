# 接口说明

- 基础路径：`http://localhost:3000/api`
- 请求格式：`application/json`
- 登录后请求头：`Authorization: Bearer <token>`
- 成功响应：`{ "code": 0, "message": "操作成功", "data": ... }`
- 失败响应：HTTP 状态码 + `{ "code": 400, "message": "错误说明" }`

## 一、认证与账号

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/auth/login` | 公开 | 登录，返回 token 与用户信息 |
| POST | `/auth/register` | 公开 | 注册会员；`role=provider` 时同时创建待审核门店 |
| GET | `/auth/me` | 登录 | 获取当前用户资料 |
| PUT | `/auth/password` | 登录 | 修改登录密码 |

登录请求：

```json
{ "username": "demo", "password": "123456" }
```

服务商注册额外字段：`storeName`、`storeAddress`、`licenseNo`。

## 二、公开数据

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/public/categories` | 启用中的服务分类 |
| GET | `/public/venues` | 已通过审核的场馆列表 |
| GET | `/public/venues/:id` | 场馆详情、服务、教练、公开评价 |
| GET | `/public/services` | 在售服务列表 |
| GET | `/public/services/:id` | 服务详情与评价 |

场馆筛选参数：

| 参数 | 说明 |
| --- | --- |
| `page` / `pageSize` | 分页 |
| `keyword` | 场馆名称、简介、地址 |
| `categoryId` | 服务分类 |
| `city` | 城市 |
| `sort` | `rating` / `orders` / `newest` |

服务筛选参数：`keyword`、`categoryId`、`minPrice`、`maxPrice`、`providerId`、`sort`（`sales` / `rating` / `price_asc` / `price_desc` / `newest`）。

## 三、会员端

所有接口需要会员角色。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/user/profile` | 个人资料 |
| PUT | `/user/profile` | 更新昵称、姓名、手机号、头像等 |
| GET | `/user/dashboard` | 首页统计、最近预约、推荐服务、近 7 天运动 |
| GET | `/user/appointments` | 我的预约，可传 `status` |
| GET | `/user/appointments/:id` | 预约详情与状态日志 |
| POST | `/user/appointments` | 提交预约 |
| PATCH | `/user/appointments/:id/cancel` | 取消预约 |
| POST | `/user/appointments/:id/checkin` | 到店打卡，等待门店核验 |
| GET | `/user/notifications` | 消息列表，支持 `page`、`pageSize`、`unread=1` |
| PATCH | `/user/notifications/:id/read` | 单条已读 |
| PATCH | `/user/notifications/read-all` | 全部已读 |
| GET | `/user/checkins` | 打卡记录与统计，支持 `month=YYYY-MM` |
| POST | `/user/checkins` | 自主打卡 |
| GET | `/user/body-tests` | 体测历史 |
| POST | `/user/body-tests` | 录入体测 |
| GET | `/user/favorites` | 收藏服务 |
| POST | `/user/favorites/:serviceId` | 添加收藏 |
| DELETE | `/user/favorites/:serviceId` | 取消收藏 |
| GET | `/user/reviews` | 我的评价 |
| POST | `/user/reviews` | 提交订单评价 |

创建预约请求：

```json
{
  "service_id": 1,
  "coach_id": 1,
  "appointment_date": "2026-10-25",
  "time_slot": "19:00-20:00",
  "people_count": 1,
  "contact_name": "张晓宇",
  "contact_phone": "13800000001",
  "remark": "想重点改善圆肩"
}
```

自主打卡请求：

```json
{
  "duration_minutes": 45,
  "intensity": "medium",
  "content": "力量训练 + 拉伸"
}
```

## 四、服务商端

所有接口需要服务商角色，并且只能操作自己的门店数据。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/provider/profile` | 门店资料与审核状态 |
| PUT | `/provider/profile` | 更新门店资料；被驳回后保存会重新提交审核 |
| GET | `/provider/dashboard` | 经营概览、趋势、订单状态、服务排行 |
| GET | `/provider/coaches` | 教练列表 |
| POST | `/provider/coaches` | 新增教练 |
| PUT | `/provider/coaches/:id` | 编辑教练或在职状态 |
| DELETE | `/provider/coaches/:id` | 设为离职 |
| GET | `/provider/services` | 门店服务列表 |
| POST | `/provider/services` | 新增并上架服务 |
| PUT | `/provider/services/:id` | 编辑或上下架服务 |
| DELETE | `/provider/services/:id` | 下架服务 |
| GET | `/provider/orders` | 预约订单，支持 `status`、`keyword`、分页 |
| GET | `/provider/orders/:id` | 订单详情与日志 |
| PATCH | `/provider/orders/:id/status` | 确认、完成或取消订单 |
| GET | `/provider/checkins` | 打卡记录，支持 `status`、`month` |
| PATCH | `/provider/checkins/:id/verify` | 通过或驳回打卡 |
| GET | `/provider/body-tests` | 学员体测与到店学员列表 |
| GET | `/provider/students` | 到店学员汇总 |
| POST | `/provider/body-tests` | 为学员录入体测 |
| PUT | `/provider/body-tests/:id` | 编辑体测记录 |
| GET | `/provider/reviews` | 门店评价与评分统计 |
| POST | `/provider/reviews/:id/reply` | 回复会员评价 |
| GET | `/provider/stats/business` | 营业统计，支持 `days=7/30/90` |

订单状态变更：

```json
{ "status": "confirmed", "note": "门店已确认预约" }
```

支持的状态流转：

- `pending` → `confirmed` / `cancelled`
- `confirmed` → `completed` / `cancelled`

打卡核验：

```json
{ "status": "approved" }
```

驳回时：`{ "status": "rejected", "reject_reason": "未查询到当日到店记录" }`

## 五、平台管理端

所有接口需要管理员角色。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/dashboard` | 平台概览与待办 |
| GET | `/admin/providers` | 服务商列表，支持 `status`、`keyword` |
| PATCH | `/admin/providers/:id/audit` | 入驻审核，`approved` / `rejected` |
| PATCH | `/admin/providers/:id/status` | 停用或恢复门店 |
| GET | `/admin/users` | 账号列表，支持 `role`、`status`、`keyword` |
| PATCH | `/admin/users/:id/status` | 启用或禁用账号 |
| PATCH | `/admin/users/:id/reset-password` | 重置密码 |
| GET | `/admin/orders` | 全平台订单，支持 `status`、`keyword` |
| GET | `/admin/orders/:id` | 订单监管详情 |
| PATCH | `/admin/orders/:id/status` | 平台干预订单状态 |
| GET | `/admin/categories` | 分类列表与关联服务数 |
| POST | `/admin/categories` | 新增分类 |
| PUT | `/admin/categories/:id` | 编辑分类或启停 |
| DELETE | `/admin/categories/:id` | 删除无关联服务的分类 |
| GET | `/admin/checkin-rules` | 打卡规则列表 |
| POST | `/admin/checkin-rules` | 新增规则 |
| PUT | `/admin/checkin-rules/:id` | 编辑规则 |
| DELETE | `/admin/checkin-rules/:id` | 删除规则 |
| GET | `/admin/reviews` | 全平台评价，支持 `status`、`rating`、`keyword` |
| PATCH | `/admin/reviews/:id/audit` | 评价审核，通过后重算服务与门店评分 |
| GET | `/admin/stats/platform` | 平台统计，支持 `days=7/30/90` |

审核评价：

```json
{ "status": "approved", "audit_remark": "内容真实，审核通过" }
```

平台处理订单：

```json
{ "status": "refunded", "note": "经平台核实，同意退款" }
```

## 六、通用状态

订单状态：`pending` 待确认、`confirmed` 已确认、`completed` 已完成、`cancelled` 已取消、`refunded` 已退款。

打卡状态：`pending` 待核验、`approved` 已通过、`rejected` 已驳回。

评价状态：`pending` 待审核、`approved` 已通过、`rejected` 已驳回。

门店状态：`pending` 待审核、`approved` 营业中、`rejected` 已驳回、`disabled` 已停用。
