# 智能排班管理系统 — 项目详情文档

> 应用 ID：`app_17bs8u4ptpj` ｜ 技术栈：React 19 + TypeScript（前端）/ NestJS 10 + Drizzle ORM + PostgreSQL（后端）/ ExcelJS（导出）
> 定位：面向排班管理员 / HR 的排班编排工具，提供员工花名册、班次配置、AI 一键排班、合规监控、历史班表导入与标准考勤表导出。

---

## 一、功能概览与使用说明

### 1.1 四大功能模块

| 模块 | 路由 | 职责 |
| --- | --- | --- |
| 排班工作台 | `/` | 月历聚合视图（每日早/中/晚人数）、AI 一键生成、合规警告监控、历史班表导入、Excel 导出 |
| 员工管理 | `/employees` | 员工花名册增改、姓名/工号/UID 搜索、班次偏好维护 |
| 班次配置 | `/shift-configs` | 白班/中班/晚班的时间段与每日人数上下限维护 |
| 我的排休/排休申请管理 | `/leave-requests` | 员工提交并查看本人申请；管理员审批全部申请 |

### 1.2 推荐操作流程

1. **班次配置**：先在「班次配置」确认各班次时间与人数约束（默认：白班 08:30-17:00、中班 13:30-22:00、晚班 16:30-次日01:00）。
2. **员工维护**：在「员工管理」录入员工（姓名、工号、UID、所属平台、岗位、班次偏好）。
3. **排休登记**：员工排休需求在「排休申请管理」创建并审批；已批准的排休会在排班生成时锁定为休班。
4. **跨月接续（可选）**：新月份排班前，可在排班工作台导入上月班表 Excel（锁定为历史数据），用于月初班次衔接校验与单周工作天数的跨月累计。
5. **AI 排班**：在排班工作台选择目标月份，点击「AI 排班」一键生成；也可点击单元格手动调整班次。
6. **合规检查**：页面实时展示合规警告面板（班次衔接、晚班上限、周工作天数等），逐条处理。
7. **导出**：点击「导出考勤」下载标准排班表 Excel（按平台分组、含统计区）。

### 1.3 排班工作台要点

- 月历聚合视图：一行一周 7 天，每个日期格展示当日早/中/晚班次人数与休班/在岗汇总；存在合规警告的日期红框标记，点击警告面板可定位到对应日期。
- 上月导入班表以锁定前缀展示（不参与 AI 生成覆盖，删除需显式操作）。
- 右侧/底部提供每日各班次人数统计、晚班计数与合规警告列表。

---

## 二、代码结构

```
├── client/                          # React 前端
│   └── src/
│       ├── app.tsx                  # 路由表（4 个业务页 + 404）
│       ├── components/Layout.tsx    # 侧边栏导航布局
│       ├── api/                     # 按领域拆分的 API 层
│       │   ├── employees/           # 员工接口
│       │   ├── shift-configs/       # 班次配置接口
│       │   ├── leave-requests/      # 排休申请接口
│       │   └── schedules/           # 排班接口（7 个）
│       └── pages/
│           ├── Schedule/            # 排班工作台（核心）
│           │   ├── SchedulePage.tsx             # 主页面（月份切换/生成/导入导出编排）
│           │   ├── ScheduleCalendar.tsx         # 月历聚合视图（一行一周，每格当日各班次人数）
│           │   ├── ScheduleDailyStats.tsx       # 每日人数统计
│           │   ├── ScheduleNightCounts.tsx      # 晚班计数
│           │   ├── ScheduleWarningsPanel.tsx    # 合规警告面板
│           │   ├── ImportScheduleDialog.tsx     # 历史班表导入弹窗
│           │   ├── parse-schedule-xlsx.ts       # 导入 Excel 解析
│           │   ├── schedule-utils.ts            # 班次颜色/常量工具
│           │   └── useScheduleOverview.ts       # 月度概览数据 hook
│           ├── Employees/           # 员工管理 + EmployeeFormDialog
│           ├── ShiftConfigs/        # 班次配置（卡片 + 编辑对话框）
│           ├── LeaveRequests/       # 排休申请 + CreateLeaveDialog
│           └── NotFound/            # 404
│
├── server/                          # NestJS 后端
│   ├── app.module.ts                # 模块注册
│   ├── database/schema.ts           # Drizzle Schema（自动生成，勿手改）
│   └── modules/
│       ├── schedule/                # 排班核心模块
│       │   ├── schedule.controller.ts    # 7 个端点
│       │   ├── schedule.service.ts       # 生成/导入/删除/导出/单格更新
│       │   ├── schedule-compliance.ts    # 合规校验规则与常量
│       │   ├── schedule-solver.ts        # AI 排班求解器
│       │   └── schedule-export.ts        # 标准考勤表 Excel 构建
│       ├── employee/                # 员工 CRUD
│       ├── shift-config/            # 班次配置维护
│       ├── leave-request/           # 排休申请与审批
│       └── view/                    # 页面渲染（平台内置，勿改）
│
└── shared/api.interface.ts          # 前后端共享类型契约（所有 DTO）
```

### 关键实现文件速查

| 关注点 | 文件 |
| --- | --- |
| 路由定义 | `client/src/app.tsx` |
| 全部 API 契约 | `shared/api.interface.ts` |
| AI 排班算法 | `server/modules/schedule/schedule-solver.ts` |
| 合规规则 | `server/modules/schedule/schedule-compliance.ts` |
| Excel 导出样式 | `server/modules/schedule/schedule-export.ts` |
| 导入 Excel 解析 | `client/src/pages/Schedule/parse-schedule-xlsx.ts` |

---

## 三、API 接口清单

### 3.1 员工 `/api/employees`

| 方法 | 路径 | 登录 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/employees?keyword=` | 否 | 员工列表（姓名/工号/UID 模糊搜索） |
| POST | `/api/employees` | 是 | 新建员工 |
| PUT | `/api/employees/:id` | 是 | 更新员工 |

### 3.2 班次配置 `/api/shift-configs`

| 方法 | 路径 | 登录 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/shift-configs` | 否 | 班次列表（固定顺序 day→middle→night→rest） |
| PUT | `/api/shift-configs/:code` | 是 | 更新班次（rest 不可编辑；minCount ≤ maxCount） |

### 3.3 排休申请 `/api/leave-requests`

| 方法 | 路径 | 登录 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/leave-requests?status=` | 是 | 申请列表：员工仅看本人，管理员看全部 |
| POST | `/api/leave-requests` | 是 | 新建申请：员工强制本人，管理员可代提（startDate ≤ endDate） |
| POST | `/api/leave-requests/:id/approve` | 是 | 批准，仅管理员（仅 pending 可操作） |
| POST | `/api/leave-requests/:id/reject` | 是 | 驳回，仅管理员 |

### 3.4 排班 `/api/schedules`

| 方法 | 路径 | 登录 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/schedules/overview?month=` | 否 | 月度概览：单元格 + 跨月前缀 + 每日统计 + 晚班计数 + 警告 |
| POST | `/api/schedules/generate` | 是 | AI 一键生成（当月存在导入数据时拒绝） |
| POST | `/api/schedules/cells` | 是 | 单格更新（导入单元格锁定不可改，返回最新警告） |
| POST | `/api/schedules/import` | 是 | 导入历史月班表（按工号匹配，source=imported 锁定） |
| DELETE | `/api/schedules/imported?month=` | 是 | 删除指定月份的导入班表 |
| GET | `/api/schedules/export?month=` | 否 | 导出标准考勤排班表 Excel |

---

## 四、数据库说明

共 4 张业务表（Drizzle Schema 见 `server/database/schema.ts`，DDL 变更须走 `miaoda db` 通道，代码内只做 DML）。

### 4.1 employee 员工表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | 主键 |
| name | varchar(100) | 姓名 |
| employee_no | varchar(50) UNIQUE | 工号（导入班表的匹配键） |
| uid | varchar(100) | 平台 UID |
| platform | varchar(100) | 所属平台/部门（导出分组依据） |
| preference | varchar(20) | 班次偏好：`none` / `prefer_day` / `prefer_night` |
| role | varchar(100) | 岗位 |

### 4.2 shift_config 班次配置表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | 主键 |
| code | varchar(20) UNIQUE | 班次代码：`day` / `middle` / `night` / `rest` |
| name | varchar(50) | 班次名称 |
| start_time / end_time | varchar(5) | 起止时间（HH:mm） |
| cross_day | boolean | 是否跨天（晚班为 true，标题说明追加 +1） |
| min_count / max_count | integer | 每日人数下限/上限（null 表示不限） |

当前预置：白班 08:30-17:00（3~6 人）、中班 13:30-22:00（1~3 人）、晚班 16:30-01:00（3~4 人）、休班（无时间段）。

### 4.3 schedule_entry 排班记录表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | 主键 |
| schedule_date | date | 排班日期 |
| employee_id | uuid FK→employee | 员工 |
| shift_code | varchar(20) | `day` / `middle` / `night`（**rest 不落库，缺失即休班**） |
| source | varchar(20) | `generated`(AI生成) / `manual`(手动) / `imported`(导入锁定) |

约束：`(schedule_date, employee_id)` 唯一索引（upsert 覆盖写）；`employee_id` 普通索引。

### 4.4 leave_request 排休申请表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | 主键 |
| employee_id | uuid FK→employee | 申请人 |
| start_date / end_date | date | 排休起止日期 |
| status | varchar(20) | `pending` / `approved` / `rejected` |

> 各表均含系统字段 `_created_at / _created_by / _updated_at / _updated_by`，由平台自动维护，业务代码不读不写。

---

## 五、核心业务逻辑

### 5.1 班次代码体系

- `day`(白/早) / `middle`(中) / `night`(晚) / `rest`(休)；休班不写入数据库，查询矩阵中缺失即视为休班。
- 排班数据按 `source` 三分：AI 生成、手动调整、导入锁定。导入数据不可被手动修改和 AI 生成覆盖，删除须显式调用删除导入接口。

### 5.2 合规校验规则（`schedule-compliance.ts`）

| 规则 | 内容 |
| --- | --- |
| 周工作天数 | 单人单周最多 6 天，跨月时累计上月同自然周已工作天数 |
| 晚班月度上限 | 单人每月晚班 ≤ 10 天 |
| 班次衔接 | 中班后只能接晚班或休班；晚班后必须休班；白班/休班后任意 |
| 每日人数 | 各班次当日人数须落在 `min_count ~ max_count` 区间 |

### 5.3 跨月接续（PREV_PREFIX_START_DAY = 16）

生成/校验某月排班时，自动读取上月 16 日起的班表作为前缀上下文：提供月初班次衔接校验与周工作天数跨月累计依据；UI 上以锁定行展示。

### 5.4 AI 排班流程（POST /schedules/generate）

1. 校验月份格式，加载员工与班次配置；
2. 加载已批准排休申请，锁定为休班；
3. 当月存在 `imported` 数据则拒绝生成；
4. 加载上月下半旬前缀，调用 `solveSchedule` 求解；
5. 事务内清空当月旧数据并写入新结果（仅工作班次，source=generated）。

### 5.5 Excel 导出格式（GET /api/schedules/export）

单 sheet「考勤表」，按平台分组上下排列，组间空行分隔。每组结构：

1. **标题行**（跨全列合并，21 号加粗）：`2026年8月 {平台名} 白班 08:30-17:00// 中班 13:30-22:00// 晚班 16:30-01:00+1`
2. **表头行**：平台 / 姓名 / 1~N 日（日期列亮黄底红字）
3. **数据行**：每行一名员工，平台列整体合并；班次用「早/中/晚/休」字符，早班浅粉 `#fdddef`、中班浅绿 `#d5f6f2`、晚班浅蓝 `#bacefd`
4. **统计区**（5 行，标签列合并）：早 / 中 / 晚 / 休 / 上班人数；「休」行纯黄底纯红字
5. 样式：全表 `#1f2329` 细边框、日期列约 50px、行高 27px

### 5.6 历史班表导入（POST /api/schedules/import）

前端解析 Excel（`parse-schedule-xlsx.ts`）后按工号匹配员工，仅导入工作班次，source 记为 `imported`。未知工号整批拒绝并提示。

---

## 六、共享类型契约（shared/api.interface.ts）

前后端全部 DTO 集中定义于此，修改接口须先改此文件再改实现。核心类型：

- `Employee` / `SaveEmployeeRequest` / `EmployeePreference`（`none` | `prefer_day` | `prefer_night`）
- `ShiftCode`（`day` | `middle` | `night` | `rest`）/ `ShiftConfig` / `UpdateShiftConfigRequest`
- `LeaveRequest` / `LeaveRequestStatus`（`pending` | `approved` | `rejected`）
- `ScheduleCell` / `ScheduleOverviewResponse`（cells、prefixCells、dailyStats、nightCounts、warnings）
- `ScheduleWarning` / `ScheduleWarningType`（`transition` | `night_rest` | `night_limit` | `week_limit` | `daily_limit`）
- `GenerateScheduleRequest` / `UpdateScheduleCellRequest` / `ImportHistoryRow` 等

---

## 七、设计与运行约定

- **UI 规范**：详见 `AGENTS.md` —— Grid 网格风格、冷灰蓝基底 + 四色班次语义色 + 红色合规警告、圆角 ≤ 2px、无阴影、明亮办公风。
- **运行环境**：前后端 devServer 常驻自动热重载；`/api` 代理已配置；登录态由平台内置（写接口使用 `@NeedLogin`）。
- **数据库变更**：DDL 一律通过 `miaoda db` 执行后由系统自动重新生成 `schema.ts`，禁止手改 Schema 文件。
