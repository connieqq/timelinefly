# TimelineFly

基于 PRD 与技术实施文档实现的 MVP 应用，包含：
- 简化邮箱验证码登录（开发环境固定验证码 `123456`）
- 24H 日时间轴可视化
- 日程创建 / 编辑 / 删除（含 INTENTION / REALITY）
- 日程类型颜色自定义（新建/编辑可修改）
- 当日类型分布复盘（颜色与时间轴一致）

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 路由

- `/login`：登录页
- `/timeline`：主页面（时间轴 + 统计 + 日程列表）

## 主要接口

- `POST /api/auth/request-code`
- `POST /api/auth/verify-code`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET/POST /api/schedules`
- `PATCH/DELETE /api/schedules/:id`
- `GET /api/schedule-categories/styles`
- `PATCH /api/schedule-categories/styles/:category`
- `GET /api/stats/daily?date=YYYY-MM-DD`

## 数据存储说明

本地文件存储在：

`data/app-data.json`

首次运行会自动创建。适用于 MVP 与本地演示环境。
