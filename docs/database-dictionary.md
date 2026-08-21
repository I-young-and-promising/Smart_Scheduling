# 数据库字典

> **数据源**：`server/database/schema.ts`
> **生成时间**：2026-08-19
> **表数量**：9 张业务表

---

## 目录

1. [employee](#employee--员工花名册)
2. [shift_config](#shift_config--班次配置)
3. [schedule_entry](#schedule_entry--排班记录)
4. [schedule_publish](#schedule_publish--排班发布状态)
5. [schedule_change_log](#schedule_change_log--排班变更日志)
6. [schedule_import_history](#schedule_import_history--排班导入历史)
7. [holiday](#holiday--节假日定义)
8. [leave_request](#leave_request--排休申请)
9. [schedule_setting](#schedule_setting--系统设置)
10. [自定义类型](#自定义类型)
11. [表别名](#表别名)
12. [表关系简图](#表关系简图)

---

## `employee` — 员工花名册

员工主数据，所有排班与排休都围绕该表展开。

| 字段（代码） | 数据库列 | 类型 | 可空 | 默认值 | 约束 | 说明 |
|-------------|---------|------|------|--------|------|------|
| `id` | `id` | uuid | NO | `gen_random_uuid()` | PK | 员工唯一 ID |
| `name` | `name` | varchar(100) | NO | - | - | 姓名 |
| `employeeNo` | `employee_no` | varchar(50) | NO | - | UQ | 工号，全局唯一 |
| `uid` | `uid` | varchar(100) | NO | - | - | 飞书/平台 UID |
| `platform` | `platform` | varchar(100) | NO | - | - | 平台来源 |
| `preference` | `preference` | varchar(20) | NO | `'none'` | - | 班次偏好：`none` / `prefer_day` / `prefer_night` |
| `role` | `role` | varchar(100) | NO | - | - | 岗位角色 |
| `userRole` | `user_role` | varchar(20) | NO | `'employee'` | - | 系统角色：`admin` / `employee` |
| `createdAt` | `_created_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：创建时间 |
| `createdBy` | `_created_by` | user_profile | YES | - | - | 系统字段：创建人 |
| `updatedAt` | `_updated_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：更新时间 |
| `updatedBy` | `_updated_by` | user_profile | YES | - | - | 系统字段：更新人 |

**索引与约束**

- 主键：`id`
- 唯一索引：`employee_employee_no_key`（`employee_no`）

---

## `shift_config` — 班次配置

定义每日可用的班次、时间范围以及人数上下限。

| 字段（代码） | 数据库列 | 类型 | 可空 | 默认值 | 约束 | 说明 |
|-------------|---------|------|------|--------|------|------|
| `id` | `id` | uuid | NO | `gen_random_uuid()` | PK | 班次配置 ID |
| `code` | `code` | varchar(20) | NO | - | UQ | 班次代码：`day` / `middle` / `night` / `rest` |
| `name` | `name` | varchar(50) | NO | - | - | 班次名称 |
| `startTime` | `start_time` | varchar(5) | NO | - | - | 开始时间，如 `08:00` |
| `endTime` | `end_time` | varchar(5) | NO | - | - | 结束时间，如 `17:00` |
| `crossDay` | `cross_day` | boolean | NO | `false` | - | 是否跨天 |
| `minCount` | `min_count` | integer | YES | - | - | 每日最低人数 |
| `maxCount` | `max_count` | integer | YES | - | - | 每日最高人数 |
| `holidayMinCount` | `holiday_min_count` | integer | YES | - | - | 节假日上班日最低人数 |
| `holidayMaxCount` | `holiday_max_count` | integer | YES | - | - | 节假日上班日最高人数 |
| `createdAt` | `_created_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：创建时间 |
| `createdBy` | `_created_by` | user_profile | YES | - | - | 系统字段：创建人 |
| `updatedAt` | `_updated_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：更新时间 |
| `updatedBy` | `_updated_by` | user_profile | YES | - | - | 系统字段：更新人 |

**索引与约束**

- 主键：`id`
- 唯一索引：`shift_config_code_key`（`code`）

---

## `schedule_entry` — 排班记录

排班核心表。每条记录表示某员工在某天的最终班次。

| 字段（代码） | 数据库列 | 类型 | 可空 | 默认值 | 约束 | 说明 |
|-------------|---------|------|------|--------|------|------|
| `id` | `id` | uuid | NO | `gen_random_uuid()` | PK | 记录 ID |
| `scheduleDate` | `schedule_date` | date | NO | - | UQ(1) | 排班日期 |
| `employeeId` | `employee_id` | uuid | NO | - | UQ(1), FK | 关联员工 ID |
| `shiftCode` | `shift_code` | varchar(20) | NO | - | - | 班次代码 |
| `source` | `source` | varchar(20) | NO | `'manual'` | - | 数据来源：`manual` / `import` / `generate` |
| `taskId` | `task_id` | uuid | YES | - | - | 关联任务 ID |
| `workLoadTags` | `work_load_tags` | text[] | NO | `[]` | - | 工作负荷标签数组 |
| `createdAt` | `_created_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：创建时间 |
| `createdBy` | `_created_by` | user_profile | YES | - | - | 系统字段：创建人 |
| `updatedAt` | `_updated_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：更新时间 |
| `updatedBy` | `_updated_by` | user_profile | YES | - | - | 系统字段：更新人 |

**索引与约束**

- 主键：`id`
- 唯一索引：`schedule_entry_schedule_date_employee_id_key`（`schedule_date, employee_id`）
- 普通索引：`idx_schedule_entry_employee_id`（`employee_id`）
- 外键：`schedule_entry_employee_id_fkey` → `employee.id`

---

## `schedule_publish` — 排班发布状态

按自然月维护排班的发布状态，控制员工端是否可见。

| 字段（代码） | 数据库列 | 类型 | 可空 | 默认值 | 约束 | 说明 |
|-------------|---------|------|------|--------|------|------|
| `id` | `id` | uuid | NO | `gen_random_uuid()` | PK | 发布记录 ID |
| `month` | `month` | varchar(7) | NO | - | UQ | 月份，如 `2026-09` |
| `status` | `status` | varchar(20) | NO | `'draft'` | - | 状态：`draft` / `published` |
| `publishedAt` | `published_at` | timestamptz(3) | YES | - | - | 发布时间 |
| `createdAt` | `_created_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：创建时间 |
| `createdBy` | `_created_by` | user_profile | YES | - | - | 系统字段：创建人 |
| `updatedAt` | `_updated_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：更新时间 |
| `updatedBy` | `_updated_by` | user_profile | YES | - | - | 系统字段：更新人 |

**索引与约束**

- 主键：`id`
- 唯一：`month`
- 唯一索引：`schedule_publish_month_key`（`month`）

---

## `schedule_change_log` — 排班变更日志

记录排班单元格的每一次变更，用于审计与回查。

| 字段（代码） | 数据库列 | 类型 | 可空 | 默认值 | 约束 | 说明 |
|-------------|---------|------|------|--------|------|------|
| `id` | `id` | uuid | NO | `gen_random_uuid()` | PK | 日志 ID |
| `month` | `month` | varchar(7) | NO | - | - | 月份 |
| `employeeId` | `employee_id` | uuid | NO | - | - | 员工 ID |
| `scheduleDate` | `schedule_date` | date | NO | - | - | 排班日期 |
| `oldShiftCode` | `old_shift_code` | varchar(20) | YES | - | - | 原班次（可为空） |
| `newShiftCode` | `new_shift_code` | varchar(20) | NO | - | - | 新班次 |
| `changeType` | `change_type` | varchar(20) | NO | - | - | 变更类型 |
| `createdAt` | `_created_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：创建时间 |
| `createdBy` | `_created_by` | user_profile | YES | - | - | 系统字段：创建人 |
| `updatedAt` | `_updated_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：更新时间 |
| `updatedBy` | `_updated_by` | user_profile | YES | - | - | 系统字段：更新人 |

**索引与约束**

- 主键：`id`
- 普通索引：`idx_schedule_change_log_month`（`month`）
- 普通索引：`idx_schedule_change_log_employee_date`（`employee_id, schedule_date`）

---

## `schedule_import_history` — 排班导入历史

记录通过 Excel 批量导入排班的批次信息。

| 字段（代码） | 数据库列 | 类型 | 可空 | 默认值 | 约束 | 说明 |
|-------------|---------|------|------|--------|------|------|
| `id` | `id` | uuid | NO | `gen_random_uuid()` | PK | 导入记录 ID |
| `month` | `month` | varchar(7) | NO | - | - | 月份 |
| `fileName` | `file_name` | text | NO | - | - | 文件名 |
| `employeeCount` | `employee_count` | integer | NO | - | - | 导入员工数 |
| `entryCount` | `entry_count` | integer | NO | - | - | 导入排班条目数 |
| `status` | `status` | varchar(20) | NO | `'active'` | - | 状态：`active` / `deleted` |
| `importedAt` | `imported_at` | timestamptz(3) | YES | `CURRENT_TIMESTAMP` | - | 导入时间 |
| `deletedAt` | `deleted_at` | timestamptz(3) | YES | - | - | 删除时间 |
| `createdAt` | `_created_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：创建时间 |
| `createdBy` | `_created_by` | user_profile | YES | - | - | 系统字段：创建人 |
| `updatedAt` | `_updated_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：更新时间 |
| `updatedBy` | `_updated_by` | user_profile | YES | - | - | 系统字段：更新人 |

**索引与约束**

- 主键：`id`
- 普通索引：`idx_schedule_import_history_month`（`month`）

---

## `holiday` — 节假日定义

定义法定节假日与调休上班日，直接影响排班求解器。

| 字段（代码） | 数据库列 | 类型 | 可空 | 默认值 | 约束 | 说明 |
|-------------|---------|------|------|--------|------|------|
| `date` | `date` | date | NO | - | PK | 日期 |
| `type` | `type` | varchar(20) | NO | - | - | 类型：`legal_holiday` / `workday_swap` |
| `name` | `name` | varchar(100) | NO | - | - | 节假日名称 |
| `mustWork` | `must_work` | boolean | NO | `false` | - | 是否必须上班 |
| `weight` | `weight` | integer | NO | `0` | - | 权重 |
| `createdAt` | `_created_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：创建时间 |
| `createdBy` | `_created_by` | user_profile | YES | - | - | 系统字段：创建人 |
| `updatedAt` | `_updated_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：更新时间 |
| `updatedBy` | `_updated_by` | user_profile | YES | - | - | 系统字段：更新人 |

**索引与约束**

- 主键：`date`

---

## `leave_request` — 排休申请

员工提交、管理员审批的排休申请。

| 字段（代码） | 数据库列 | 类型 | 可空 | 默认值 | 约束 | 说明 |
|-------------|---------|------|------|--------|------|------|
| `id` | `id` | uuid | NO | `gen_random_uuid()` | PK | 申请 ID |
| `employeeId` | `employee_id` | uuid | NO | - | FK | 员工 ID |
| `startDate` | `start_date` | date | NO | - | - | 开始日期 |
| `endDate` | `end_date` | date | NO | - | - | 结束日期 |
| `status` | `status` | varchar(20) | NO | `'pending'` | - | 状态：`pending` / `approved` / `rejected` |
| `createdAt` | `_created_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：创建时间 |
| `createdBy` | `_created_by` | user_profile | YES | - | - | 系统字段：创建人 |
| `updatedAt` | `_updated_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：更新时间 |
| `updatedBy` | `_updated_by` | user_profile | YES | - | - | 系统字段：更新人 |

**索引与约束**

- 主键：`id`
- 普通索引：`idx_leave_request_employee_id`（`employee_id`）
- 外键：`leave_request_employee_id_fkey` → `employee.id`

---

## `schedule_setting` — 系统设置

键值对形式的系统级配置。

| 字段（代码） | 数据库列 | 类型 | 可空 | 默认值 | 约束 | 说明 |
|-------------|---------|------|------|--------|------|------|
| `key` | `key` | varchar(50) | NO | - | PK | 设置项键 |
| `value` | `value` | text | NO | - | - | 设置值 |
| `description` | `description` | text | YES | - | - | 说明 |
| `createdAt` | `_created_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：创建时间 |
| `createdBy` | `_created_by` | user_profile | YES | - | - | 系统字段：创建人 |
| `updatedAt` | `_updated_at` | timestamptz(3) | NO | `CURRENT_TIMESTAMP` | - | 系统字段：更新时间 |
| `updatedBy` | `_updated_by` | user_profile | YES | - | - | 系统字段：更新人 |

**索引与约束**

- 主键：`key`

---

## 自定义类型

| 类型名 | TypeScript 类型 | 说明 |
|--------|----------------|------|
| `user_profile` | `string` | 用户身份复合类型，数据库存储为 `ROW(user_id)`，TS 中仅暴露 `user_id` 字符串 |
| `file_attachment` | `FileAttachment` | 文件附件复合类型，包含 `bucket_id` 与 `file_path` |
| `user_profile[]` | `string[]` | `user_profile` 数组类型 |
| `file_attachment[]` | `FileAttachment[]` | `file_attachment` 数组类型 |
| `customTimestamptz` | `Date` | 带精度的 `timestamptz`，驱动层与 `ISO string` 互转 |

---

## 表别名

在业务代码中，Drizzle 通过以下别名引用各表：

| 别名 | 对应表 |
|------|--------|
| `employeeTable` | `employee` |
| `holidayTable` | `holiday` |
| `leaveRequestTable` | `leave_request` |
| `scheduleChangeLogTable` | `schedule_change_log` |
| `scheduleEntryTable` | `schedule_entry` |
| `scheduleImportHistoryTable` | `schedule_import_history` |
| `schedulePublishTable` | `schedule_publish` |
| `scheduleSettingTable` | `schedule_setting` |
| `shiftConfigTable` | `shift_config` |

---

## 表关系简图

```text
employee
   │
   ├──◄ schedule_entry        （一个员工有多条排班记录）
   │
   ├──◄ leave_request         （一个员工可提交多条排休申请）
   │
   └──◄ schedule_change_log   （一个员工的排班变更多条日志）

shift_config
   └── 被 schedule_entry.shift_code 语义引用

schedule_publish
   └── 按月独立记录发布状态

holiday
   └── 按日期定义节假日/调休，影响排班求解

schedule_import_history
   └── 记录每次 Excel 导入批次

schedule_setting
   └── 系统级键值对配置
```
