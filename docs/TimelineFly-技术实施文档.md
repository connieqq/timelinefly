# TimelineFly 技术实施文档（MVP）

## 1. 文档信息
- 项目：TimelineFly
- 版本：v1.3（同步“时间轴色块填充 + 短时段文案优化”需求）
- 日期：2026-03-07
- 目标：以最小可行成本交付“登录 + 时间轴 + 日程编辑 + 复盘分布”

## 2. 技术选型建议
### 2.1 前端
- 框架：Next.js（App Router）+ TypeScript
- UI：Tailwind CSS + Headless UI（或 shadcn/ui）
- 图表：Recharts（饼图/条形图）
- 状态管理：React Query + 局部状态（useState）

### 2.2 后端
- 方案 A（推荐 MVP）：Next.js Route Handlers（BFF）+ Supabase Postgres
- 方案 B：Node.js（NestJS/Express）+ PostgreSQL（自建）

### 2.3 鉴权
- 简化版邮箱验证码登录：
  - 开发环境：mock 验证码（固定值）
  - 生产环境：对接邮件服务（Resend/SendGrid）

## 3. 总体架构
- 客户端：渲染时间轴、表单录入、统计图展示。
- API 层：鉴权、日程 CRUD、类型颜色配置、按日统计聚合。
- 数据层：用户表、日程表、类型样式表、登录验证码表（可选）。
- 埋点层：记录创建/编辑/复盘查看等行为事件。

## 4. 数据模型设计
### 4.1 users
- id（UUID, PK）
- email（UNIQUE, NOT NULL）
- timezone（VARCHAR, default `Asia/Shanghai`）
- created_at（TIMESTAMP）
- updated_at（TIMESTAMP）

### 4.2 schedule_entries
- id（UUID, PK）
- user_id（UUID, FK -> users.id）
- date（DATE, NOT NULL）  
- title（VARCHAR(80), NOT NULL）
- start_time（TIME, NOT NULL）
- end_time（TIME, NOT NULL）
- category（ENUM: work/study/life/entertainment/exercise/other）
- intention（VARCHAR(300), NOT NULL）
- reality（VARCHAR(500), NULL）
- created_at（TIMESTAMP）
- updated_at（TIMESTAMP）

索引建议：
- `idx_schedule_user_date` on `(user_id, date)`
- `idx_schedule_user_date_start` on `(user_id, date, start_time)`

### 4.3 schedule_category_styles
- user_id（UUID, FK -> users.id）
- category（ENUM: work/study/life/entertainment/exercise/other）
- color_hex（VARCHAR(7), NOT NULL）  
  建议格式：`#RRGGBB`
- created_at（TIMESTAMP）
- updated_at（TIMESTAMP）

约束建议：
- 复合主键或唯一键：`(user_id, category)`
- `color_hex` 格式约束：`^#[0-9A-Fa-f]{6}$`

### 4.4 login_codes（可选）
- id（UUID, PK）
- email（VARCHAR, NOT NULL）
- code_hash（VARCHAR, NOT NULL）
- expired_at（TIMESTAMP, NOT NULL）
- consumed_at（TIMESTAMP, NULL）

## 5. API 设计（REST）
### 5.1 鉴权
1. `POST /api/auth/request-code`
- 入参：`email`
- 出参：`ok`

2. `POST /api/auth/verify-code`
- 入参：`email`, `code`
- 出参：`access_token`（或设置 httpOnly cookie）

3. `POST /api/auth/logout`
- 出参：`ok`

### 5.2 日程
1. `GET /api/schedules?date=YYYY-MM-DD`
- 返回当天所有日程（含 `category_color_hex`，由类型样式配置解析）

2. `POST /api/schedules`
- 创建日程（`title` 必填）

3. `PATCH /api/schedules/:id`
- 更新日程（`title` 必填）

4. `DELETE /api/schedules/:id`
- 删除日程

### 5.3 类型样式配置
1. `GET /api/schedule-categories/styles`
- 返回当前用户各类型颜色配置（未配置项回退默认色板）

2. `PATCH /api/schedule-categories/styles/:category`
- 入参：`color_hex`
- 出参：`category`, `color_hex`

### 5.4 复盘统计
1. `GET /api/stats/daily?date=YYYY-MM-DD`
- 返回字段：
  - `total_minutes`
  - `planned_minutes`
  - `reality_filled_count`
  - `category_breakdown[]`（category, minutes, percentage, color_hex）

## 6. 前端页面与组件拆分
### 6.1 页面
- `/login`：邮箱登录流程
- `/timeline`：主页面（时间轴 + 日程面板 + 统计卡片/图表）

### 6.2 核心组件
- `Timeline24h`：24 小时刻度与日程块绘制
- `ScheduleCard`：单个日程展示
- `ScheduleFormModal`：新建/编辑表单
- `CategoryColorPicker`：类型颜色选择器（新建/编辑时可修改）
- `TimelineDisplayToggles`：时间轴字段展示开关（INTENTION/REALITY）
- `CategoryDistributionChart`：类型分布图
- `DateNavigator`：日期切换器

## 7. 关键实现细节
### 7.1 时间轴渲染
- 垂直轴高度按分钟映射（例如 1 分钟 = 1 px，24h = 1440 px）。
- 日程块顶部偏移 = `start_minutes`，高度 = `duration_minutes`。
- 日程块必展示字段：`title`。
- 可选展示字段：`intention`、`reality`（由前端展示开关控制）。
- 日程块视觉规范：使用“填充色 + 描边”组合，填充色基于类型颜色做透明度处理，保证对比度与可读性。
- 短时段策略：当 `duration_minutes` 较短时，标题始终单行展示，INTENTION/REALITY 在不遮挡前提下单行展示；可通过高度阈值控制是否渲染。
- 日程块颜色取值优先级：
  1. 用户类型颜色配置（`schedule_category_styles`）
  2. 系统默认色板（兜底）

### 7.2 时长计算
- 时长 = `end_time - start_time`（分钟）。
- 聚合按 `category` 分组求和。
- 百分比 = `category_minutes / all_minutes`，保留 1 位小数。
- `category_breakdown` 输出时附带 `color_hex`，确保图表与时间轴颜色一致。

### 7.3 表单校验
- 前后端双校验，规则保持一致。
- `title` 必填，长度 `1-80`。
- 不允许 `end_time <= start_time`。
- category 必须在枚举值内。
- `color_hex` 必须满足 `^#[0-9A-Fa-f]{6}$`。

### 7.4 时间轴展示开关策略
- 在主页面提供 `showIntention` 与 `showReality` 两个开关。
- 开关仅影响时间轴展示，不影响存储数据。
- MVP 阶段可采用前端本地状态管理（不落库）。
- 当日程块高度不足时，优先展示标题；必要时可隐藏时间行以释放空间，INTENTION/REALITY 仅在高度达到阈值时渲染，均为单行不换行展示。

### 7.5 类型颜色更新策略
- 在“新建/编辑日程”中变更类型颜色时，调用类型样式 API 持久化。
- 颜色更新后触发：
  - 当天时间轴重新渲染
  - 复盘图表重新渲染
- 同一用户下，同类型颜色全局一致。

### 7.6 鉴权与安全
- 推荐使用 httpOnly cookie 存储会话，避免 localStorage 泄露风险。
- API 基于用户会话校验 `user_id`，防止越权访问他人日程。
- 对 auth 接口增加频率限制（防刷验证码）。

## 8. 非功能要求
- 首屏可交互时间（TTI）< 3 秒（正常网络）。
- API P95 响应时间 < 500ms。
- 移动端（宽度 >= 375）可用，时间轴支持触摸滚动。
- 错误可观测：前后端接入基础日志与告警。

## 9. 测试策略
### 9.1 单元测试
- 时长计算、分类聚合、百分比计算函数。
- 表单校验函数。
- 标题校验函数（空值、超长）。
- 颜色格式校验函数（合法/非法 Hex）。
- 类型颜色回退逻辑（用户配置缺失 -> 默认色板）。
- 时间轴“短时段不遮挡展示”逻辑（阈值边界）。

### 9.2 集成测试
- 登录流程：请求验证码 -> 验证码校验 -> 登录态写入。
- 日程 CRUD 全链路。
- 日程创建与更新接口对 `title` 的必填校验。
- 统计接口返回与日程数据一致性校验。
- 类型颜色配置接口：查询与更新。
- 统计接口中的 `category_breakdown.color_hex` 与配置一致性校验。

### 9.3 E2E（关键路径）
1. 登录并进入今日页。
2. 创建含标题的日程并在时间轴显示标题。
3. 切换 INTENTION/REALITY 展示开关，时间轴内容即时变化。
4. 短时段日程标题单行不换行展示；INTENTION/REALITY 在不遮挡前提下单行展示。
5. 在创建/编辑时修改类型颜色，时间轴颜色即时生效。
6. 复盘图颜色与时间轴颜色一致。
7. 编辑 REALITY 并刷新统计图。
8. 删除日程后统计同步变化。

## 10. 迭代计划（工程视角）
1. Sprint 1：项目脚手架、数据模型、登录 mock、日程 CRUD。
2. Sprint 2：类型颜色配置 API、时间轴 UI、复盘统计 API、图表展示。
3. Sprint 3：测试补齐、性能优化、部署上线。

## 11. 部署与运维
- 环境：dev / staging / prod。
- CI：Lint + Test + Build。
- 部署：Vercel（前后端一体）或 Docker + 云主机。
- 监控：Sentry（前端错误）+ API 日志监控。

## 12. 开发交付清单
- 数据库迁移脚本（含索引、枚举、类型样式表）
- OpenAPI 文档（接口示例请求/响应）
- 前端页面与组件代码
- 基础测试用例（单测 + E2E 冒烟）
- README（本地启动、环境变量、部署步骤）
