/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, jsonb, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const scheduleConflict = pgTable("schedule_conflict", {
  id: uuid("id").primaryKey().defaultRandom(),
  month: varchar("month", { length: 7 }).notNull(),
  department: varchar("department", { length: 50 }).notNull(),
  conflictDate: date("conflict_date").notNull(),
  employeeId: uuid("employee_id"),
  shiftCode: varchar("shift_code", { length: 20 }),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('open'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_schedule_conflict_month_department").on(table.month, table.department),
  index("idx_schedule_conflict_date").on(table.conflictDate),
]);

export const employeeFixedLeave = pgTable("employee_fixed_leave", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").notNull(),
  weekDay: integer("week_day").notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default('hard'),
  enabled: boolean("enabled").notNull().default(true),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_employee_fixed_leave_employee").on(table.employeeId),
]);

export const department = pgTable("department", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("department_code_key").on(table.code),
]);

export const scheduleImportHistory = pgTable("schedule_import_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  month: varchar("month", { length: 7 }).notNull(),
  fileName: text("file_name").notNull(),
  employeeCount: integer("employee_count").notNull(),
  entryCount: integer("entry_count").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  importedAt: customTimestamptz("imported_at", { precision: 3 }).default(sql`CURRENT_TIMESTAMP`),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_schedule_import_history_month").on(table.month),
]);

export const scheduleChangeLog = pgTable("schedule_change_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  month: varchar("month", { length: 7 }).notNull(),
  employeeId: uuid("employee_id").notNull(),
  scheduleDate: date("schedule_date").notNull(),
  oldShiftCode: varchar("old_shift_code", { length: 20 }),
  newShiftCode: varchar("new_shift_code", { length: 20 }).notNull(),
  changeType: varchar("change_type", { length: 20 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_schedule_change_log_month").on(table.month),
  index("idx_schedule_change_log_employee_date").on(table.employeeId, table.scheduleDate),
]);

export const holiday = pgTable("holiday", {
  date: date("date").primaryKey(),
  type: varchar("type", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  mustWork: boolean("must_work").notNull().default(false),
  weight: integer("weight").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const scheduleSetting = pgTable("schedule_setting", {
  key: varchar("key", { length: 50 }).primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const schedulePublish = pgTable("schedule_publish", {
  id: uuid("id").primaryKey().defaultRandom(),
  month: varchar("month", { length: 7 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default('draft'),
  publishedAt: customTimestamptz("published_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("schedule_publish_month_key").on(table.month),
]);

export const scheduleEntry = pgTable("schedule_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleDate: date("schedule_date").notNull(),
  employeeId: uuid("employee_id").notNull(),
  shiftCode: varchar("shift_code", { length: 20 }).notNull(),
  source: varchar("source", { length: 20 }).notNull().default('manual'),
  taskId: uuid("task_id"),
  workLoadTags: text("work_load_tags").array().notNull().default([]),
  locked: boolean("locked").notNull().default(false),
  department: varchar("department", { length: 50 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("schedule_entry_schedule_date_employee_id_key").on(table.scheduleDate, table.employeeId),
  index("idx_schedule_entry_employee_id").on(table.employeeId),
  index("idx_schedule_entry_department").on(table.department),
  foreignKey({
    columns: [table.employeeId],
    foreignColumns: [employee.id],
    name: "schedule_entry_employee_id_fkey",
  }),
]);

export const leaveRequest = pgTable("leave_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  preferenceWeight: varchar("preference_weight", { length: 20 }).notNull().default('reference'),
  reason: text("reason"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_leave_request_employee_id").on(table.employeeId),
  foreignKey({
    columns: [table.employeeId],
    foreignColumns: [employee.id],
    name: "leave_request_employee_id_fkey",
  }),
]);

export const shiftConfig = pgTable("shift_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  crossDay: boolean("cross_day").notNull().default(false),
  minCount: integer("min_count"),
  maxCount: integer("max_count"),
  holidayMinCount: integer("holiday_min_count"),
  holidayMaxCount: integer("holiday_max_count"),
  department: varchar("department", { length: 50 }).notNull(),
  shiftType: varchar("shift_type", { length: 20 }),
  standardHours: numeric("standard_hours"),
  requiredRoles: text("required_roles").array().notNull().default([]),
  requiredSkills: text("required_skills").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isNightShift: boolean("is_night_shift").notNull().default(false),
  isOvernight: boolean("is_overnight").notNull().default(false),
  requireSupervisor: boolean("require_supervisor").notNull().default(false),
  requireSeniorJuniorMix: boolean("require_senior_junior_mix").notNull().default(false),
  priority: integer("priority").notNull().default(0),
  /**
   * @type { code: string; name: string; minCount: number | null; maxCount: number | null }
   */
  taskCodes: jsonb("task_codes").notNull().default('[]'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("shift_config_department_code_unique").on(table.department, table.code),
  index("idx_shift_config_department").on(table.department),
  index("idx_shift_config_active").on(table.isActive),
]);

export const employee = pgTable("employee", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  employeeNo: varchar("employee_no", { length: 50 }).notNull().unique(),
  uid: varchar("uid", { length: 100 }).notNull(),
  platform: varchar("platform", { length: 100 }).notNull(),
  preference: varchar("preference", { length: 20 }).notNull().default('none'),
  role: varchar("role", { length: 100 }).notNull(),
  userRole: varchar("user_role", { length: 20 }).notNull().default('employee'),
  department: varchar("department", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  hireDate: date("hire_date"),
  roleTags: text("role_tags").array().notNull().default([]),
  abilityTags: text("ability_tags").array().notNull().default([]),
  skillTags: text("skill_tags").array().notNull().default([]),
  efficiencyTag: varchar("efficiency_tag", { length: 20 }),
  mentorNos: text("mentor_nos").array().notNull().default([]),
  shiftPreferences: text("shift_preferences").array().notNull().default([]),
  allowedShifts: text("allowed_shifts").array().notNull().default([]),
  dailyStandardWorkload: integer("daily_standard_workload"),
  capacityLevel: varchar("capacity_level", { length: 10 }),
  capacityRatio: numeric("capacity_ratio"),
  owedDays: integer("owed_days").notNull().default(0),
  surplusDays: integer("surplus_days").notNull().default(0),
  isIndividualScheduling: boolean("is_individual_scheduling").notNull().default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("employee_employee_no_key").on(table.employeeNo),
  index("idx_employee_department").on(table.department),
  index("idx_employee_status").on(table.status),
]);

// table aliases
export const departmentTable = department;
export const employeeTable = employee;
export const employeeFixedLeaveTable = employeeFixedLeave;
export const holidayTable = holiday;
export const leaveRequestTable = leaveRequest;
export const scheduleChangeLogTable = scheduleChangeLog;
export const scheduleConflictTable = scheduleConflict;
export const scheduleEntryTable = scheduleEntry;
export const scheduleImportHistoryTable = scheduleImportHistory;
export const schedulePublishTable = schedulePublish;
export const scheduleSettingTable = scheduleSetting;
export const shiftConfigTable = shiftConfig;
