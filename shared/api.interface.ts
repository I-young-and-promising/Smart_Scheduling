/* 前后端共享的类型写在这里 */

// ============ 部门管理 ============

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  orderIndex: number;
}

export interface DepartmentListResponse {
  items: Department[];
}

// ============ 员工管理 ============

export type EmployeePreference = "none" | "prefer_day" | "prefer_night";

export type EmployeeStatus = "active" | "probation" | "leave" | "resigned";

/** 系统角色：admin=HR/管理员（全量权限），employee=普通员工（仅本人已发布班表+个人排休） */
export type UserRole = "admin" | "employee";

export interface Employee {
  id: string;
  name: string;
  employeeNo: string;
  uid: string;
  platform: string;
  preference: EmployeePreference;
  /** 员工在公司内的业务角色（如主管/带教老师），与系统权限 userRole 不同 */
  role: string;
  userRole: UserRole;
  /** 所属部门 code */
  department: string;
  /** 员工状态：在岗 / 试用期 / 休假中 / 离职 */
  status: EmployeeStatus;
  /** 入职时间，YYYY-MM-DD */
  hireDate?: string;
  /** 角色标签：supervisor / mentor / newcomer / flexible */
  roleTags: string[];
  /** 能力等级标签：level_1 / level_2 / level_3 / veteran / transferred 等 */
  abilityTags: string[];
  /** 技能标签：all_round / basic / specialist */
  skillTags: string[];
  /** 效率标签：high / medium / low */
  efficiencyTag?: string;
  /** 带教老师工号列表（新员工与带教老师绑定） */
  mentorNos: string[];
  /** 班次偏好白名单（可排班次 code 列表） */
  shiftPreferences: string[];
  /** 班次权限白名单（允许安排的班次 code 列表） */
  allowedShifts: string[];
  /** 日均标准单处理量 */
  dailyStandardWorkload?: number;
  /** 产能等级：S / A / B / improving */
  capacityLevel?: string;
  /** 产能系数（PostgreSQL numeric 以 string 透传） */
  capacityRatio?: string;
  /** 累计欠工时天数 */
  owedDays: number;
  /** 累计富余工时天数 */
  surplusDays: number;
  /** 是否单独排班（机动岗/病退组） */
  isIndividualScheduling: boolean;
  /** 固定周期休假配置（每周固定休息） */
  fixedLeaves: EmployeeFixedLeave[];
}

export interface EmployeeListResponse {
  items: Employee[];
  total: number;
}

export interface SaveEmployeeRequest {
  name: string;
  employeeNo: string;
  uid: string;
  platform: string;
  preference: EmployeePreference;
  role: string;
  userRole: UserRole;
  department: string;
  status: EmployeeStatus;
  hireDate?: string;
  roleTags: string[];
  abilityTags: string[];
  skillTags: string[];
  efficiencyTag?: string;
  mentorNos: string[];
  shiftPreferences: string[];
  allowedShifts: string[];
  dailyStandardWorkload?: number;
  capacityLevel?: string;
  capacityRatio?: string;
  owedDays: number;
  surplusDays: number;
  isIndividualScheduling: boolean;
  fixedLeaves?: EmployeeFixedLeave[];
}

export interface CreateEmployeeResponse {
  id: string;
}

export interface UpdateEmployeeResponse {
  success: boolean;
}

// ============ 固定周期休假 ============

export type FixedLeavePriority = "hard" | "soft";

export interface EmployeeFixedLeave {
  id: string;
  employeeId: string;
  /** 0=周日，1=周一，...，6=周六 */
  weekDay: number;
  priority: FixedLeavePriority;
  enabled: boolean;
}

export interface SaveEmployeeFixedLeaveRequest {
  employeeId: string;
  weekDay: number;
  priority: FixedLeavePriority;
  enabled: boolean;
}

export interface EmployeeFixedLeaveListResponse {
  items: EmployeeFixedLeave[];
}

// ============ 班次配置 ============

export type ShiftCode = "day" | "middle" | "night" | "rest";

export type ShiftType = "day" | "middle" | "night" | "overnight" | "admin" | "special";

export interface ShiftTaskCode {
  code: string;
  name: string;
  minCount: number | null;
  maxCount: number | null;
}

export interface ShiftConfig {
  /** 班次记录 id：数据库分支为 UUID，Bitable 分支可为 code:department 复合 id */
  id?: string;
  code: ShiftCode;
  name: string;
  startTime: string;
  endTime: string;
  crossDay: boolean;
  minCount: number | null;
  maxCount: number | null;
  /** 法定节假日/调休工作日的独立人数下限，null 表示沿用 minCount */
  holidayMinCount: number | null;
  /** 法定节假日/调休工作日的独立人数上限，null 表示沿用 maxCount */
  holidayMaxCount: number | null;
  /** 所属部门 code */
  department: string;
  /** 班次类型 */
  shiftType?: ShiftType;
  /** 标准工时（小时，PostgreSQL numeric 以 string 透传） */
  standardHours?: string;
  /** 要求的角色标签列表 */
  requiredRoles: string[];
  /** 要求的技能标签列表 */
  requiredSkills: string[];
  /** 是否启用 */
  isActive: boolean;
  /** 是否夜班 */
  isNightShift: boolean;
  /** 是否通宵班 */
  isOvernight: boolean;
  /** 是否需要主管在岗 */
  requireSupervisor: boolean;
  /** 是否需要新老搭配 */
  requireSeniorJuniorMix: boolean;
  /** 优先级，数字越大越优先 */
  priority: number;
  /** 细分单人任务代码列表 */
  taskCodes: ShiftTaskCode[];
}

export interface ShiftConfigListResponse {
  items: ShiftConfig[];
}

export interface CreateShiftConfigRequest {
  code: ShiftCode;
  name: string;
  department: string;
  startTime: string;
  endTime: string;
  crossDay?: boolean;
  minCount?: number | null;
  maxCount?: number | null;
  holidayMinCount?: number | null;
  holidayMaxCount?: number | null;
  shiftType?: ShiftType;
  standardHours?: string;
  requiredRoles?: string[];
  requiredSkills?: string[];
  isActive?: boolean;
  isNightShift?: boolean;
  isOvernight?: boolean;
  requireSupervisor?: boolean;
  requireSeniorJuniorMix?: boolean;
  priority?: number;
  taskCodes?: ShiftTaskCode[];
}

export interface UpdateShiftConfigRequest {
  name?: string;
  startTime?: string;
  endTime?: string;
  crossDay?: boolean;
  minCount?: number | null;
  maxCount?: number | null;
  holidayMinCount?: number | null;
  holidayMaxCount?: number | null;
  shiftType?: ShiftType;
  standardHours?: string;
  requiredRoles?: string[];
  requiredSkills?: string[];
  isActive?: boolean;
  isNightShift?: boolean;
  isOvernight?: boolean;
  requireSupervisor?: boolean;
  requireSeniorJuniorMix?: boolean;
  priority?: number;
  taskCodes?: ShiftTaskCode[];
}

export interface UpdateShiftConfigResponse {
  success: boolean;
}

export interface DeleteShiftConfigResponse {
  success: boolean;
}

// ============ 节假日 ============

export type HolidayType = "legal_holiday" | "workday_swap" | "weekend";

export interface Holiday {
  date: string;
  type: HolidayType;
  name: string;
  mustWork: boolean;
  weight: number;
}

export interface HolidayListResponse {
  items: Holiday[];
}

// ============ 规则引擎 ============

export type ScheduleSettingKey = "night_rest_days" | "schedule_rules";

export interface ScheduleSetting {
  key: ScheduleSettingKey;
  value: string;
  description: string;
}

export type RuleType = "hard" | "soft";

/** 单条排班规则配置项 */
export interface RuleItem {
  /** 规则编号，如 R-S-02、R-P-07 */
  code: string;
  /** 规则显示名称 */
  name: string;
  /** 规则类型：hard=必须满足，soft=按权重评分 */
  type: RuleType;
  /** 软规则权重（hard 规则可忽略） */
  weight: number;
  /** 是否启用 */
  enabled: boolean;
  /** 规则参数，不同规则参数不同 */
  params?: Record<string, unknown>;
}

/** 单条规则在某个方案下的得分明细 */
export interface RuleScore {
  code: string;
  name: string;
  weight: number;
  /** 原始扣分/成本，越小越好 */
  rawScore: number;
  /** 加权后得分（或扣分），展示用 */
  weightedScore: number;
  /** 该规则是否被满足（无违规） */
  satisfied: boolean;
}

export type NightShiftStrategy = "rotation" | "consecutive_then_free" | "fixed_group";

/** 排班规则引擎全局配置 */
export interface RuleConfig {
  /** 单人月度晚班上限 */
  nightLimit: number;
  /** 单人单自然周工作天数上限 */
  weekWorkLimit: number;
  /** 单人单次连续休息天数上限（被锁定的休息不计入） */
  maxConsecutiveRestDays: number;
  /** 单人单次连续白班天数上限 */
  maxConsecutiveDayShifts: number;
  /** 夜班后必须连续休息天数（1 或 2） */
  nightRestDays: number;
  /** 上月前缀起始日号：该日之后的上月班表作为跨月上下文 */
  prevPrefixStartDay: number;
  /** 班次衔接矩阵：前一日班次 → 允许的后一日班次集合 */
  transitionMatrix: Record<ShiftCode, ShiftCode[]>;
  /** R-P-03：新老搭配规则 */
  seniorJuniorMixEnabled?: boolean;
  /** R-P-04：主管每班覆盖 */
  supervisorCoverageEnabled?: boolean;
  /** R-P-05：机动岗规则 */
  flexibleRoleEnabled?: boolean;
  /** R-P-06：主管不排夜班 */
  supervisorNoNightEnabled?: boolean;
  /** R-P-07：新员工带教班次同步 */
  mentorSyncEnabled?: boolean;
  /** R-P-08：高低效率员工搭配 */
  efficiencyMixEnabled?: boolean;
  /** R-P-08：权重 */
  efficiencyMixWeight?: number;
  /** R-S-05：夜班排班策略 */
  nightShiftStrategy?: NightShiftStrategy;
  /** R-S-09：月度排休目标天数（null 表示自动计算） */
  monthOffTargetDays?: number | null;
  /** R-S-11：休息段最少天数 */
  minRestBlockDays?: number;
  /** R-S-12：上班段最少天数 */
  minWorkBlockDays?: number;
  /** R-S-13：晚班偏差控制 */
  nightBiasThreshold?: number;
  /** R-S-14：晚班偏好满足 */
  nightPreferenceEnabled?: boolean;
  /** R-S-16：每周双休连续 */
  weeklyDoubleRestEnabled?: boolean;
  /** R-S-17：工作日分布均匀 */
  workdayDistributionEnabled?: boolean;
  /** R-S-18：工时结余动态调节 */
  workBalanceEnabled?: boolean;
  /** 固定周期休假 */
  fixedLeaveEnabled?: boolean;
  /** 基础月休天数（R-S-18 用） */
  baseMonthOffDays?: number;
  /** 规则列表（新版权重评分机制） */
  rules?: RuleItem[];
}

export interface RuleConfigResponse {
  config: RuleConfig;
}

export interface UpdateRuleConfigRequest {
  config: RuleConfig;
}

export interface UpdateRuleConfigResponse {
  success: boolean;
}

export interface ExportScheduleCheckResponse {
  /** 是否可导出（无阻塞错误） */
  valid: boolean;
  /** 阻塞错误列表 */
  errors: string[];
  /** 非阻塞警告列表 */
  warnings: string[];
}

// ============ 排休申请 ============

export type LeaveRequestStatus = "pending" | "approved" | "rejected";

export type PreferenceWeight = "strong" | "weak" | "reference";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  status: LeaveRequestStatus;
  /** 偏好权重：强偏好 / 弱偏好 / 仅参考 */
  preferenceWeight: PreferenceWeight;
  /** 事由 */
  reason?: string;
}

export interface LeaveRequestListResponse {
  items: LeaveRequest[];
  total: number;
}

export interface CreateLeaveRequestRequest {
  employeeId: string;
  startDate: string;
  endDate: string;
  preferenceWeight?: PreferenceWeight;
  reason?: string;
}

export interface CreateLeaveRequestResponse {
  id: string;
}

export interface ReviewLeaveRequestResponse {
  success: boolean;
}

// ============ 排班冲突 ============

export type ScheduleConflictStatus = "open" | "resolved" | "ignored";

export interface ScheduleConflict {
  id: string;
  month: string;
  department: string;
  date: string;
  employeeId?: string;
  shiftCode?: ShiftCode;
  type: string;
  description: string;
  status: ScheduleConflictStatus;
  createdAt: string;
}

export interface ScheduleConflictListResponse {
  items: ScheduleConflict[];
  total: number;
}

export interface UpdateScheduleConflictRequest {
  status: ScheduleConflictStatus;
}

// ============ 排班工作台 ============

export interface ScheduleCell {
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  date: string;
  shiftCode: ShiftCode;
  taskId?: string | null;
  workLoadTags?: string[];
  /** 单元格是否被锁定（重新排班时不被覆盖） */
  locked?: boolean;
  /** 排班来源，Bitable 仓库使用 */
  source?: string;
  /** Bitable record id，内部使用 */
  recordId?: string;
  /** 所属部门 code，隔离查询使用 */
  department?: string;
}

export interface DailyShiftStat {
  date: string;
  dayCount: number;
  middleCount: number;
  nightCount: number;
  overLimit: boolean;
}

export interface EmployeeNightCount {
  employeeId: string;
  employeeName: string;
  count: number;
}

export type ScheduleWarningType =
  | "transition"
  | "night_rest"
  | "night_limit"
  | "week_limit"
  | "daily_limit"
  | "rest_limit"
  | "day_limit"
  | "night_rest_days"
  | "mentor_sync"
  | "efficiency_mix"
  | "work_balance"
  | "supervisor_missing"
  | "senior_junior_mix"
  | "fixed_leave"
  | "unavailable_time"
  | "min_rest_block"
  | "min_work_block"
  | "night_preference"
  | "double_rest"
  | "workday_distribution";

export interface ScheduleWarning {
  id: string;
  type: ScheduleWarningType;
  message: string;
  employeeId: string | null;
  date: string | null;
}

export interface ScheduleOverviewResponse {
  cells: ScheduleCell[];
  /** 上月下半旬班表（锁定前缀，用于跨月接续展示与校验） */
  prefixCells: ScheduleCell[];
  dailyStats: DailyShiftStat[];
  nightCounts: EmployeeNightCount[];
  warnings: ScheduleWarning[];
  /** 当前部门 */
  department: string;
  /** 当月排班冲突列表 */
  conflicts: ScheduleConflict[];
}

export interface GenerateScheduleRequest {
  /** 目标部门 */
  department: string;
  /** 兼容旧版单月生成 */
  month?: string;
  /** 多月连续生成，优先级高于 month */
  months?: string[];
}

export interface GenerateScheduleResponse {
  success: boolean;
  message: string;
}

export interface OptimizeScheduleRequest {
  /** 目标部门 */
  department: string;
  /** 兼容旧版单月优化 */
  month?: string;
  /** 多月连续优化，优先级高于 month */
  months?: string[];
}

export interface OptimizeScheduleResponse {
  success: boolean;
  message: string;
  /** 本次优化实际发生变动的单元格数 */
  changedCount: number;
}

export interface UpdateScheduleCellRequest {
  employeeId: string;
  date: string;
  shiftCode: ShiftCode;
  /** 是否锁定单元格 */
  locked?: boolean;
  /** 为 true 时仅预览合规警告，不会真正保存 */
  preview?: boolean;
  /** 目标部门 */
  department?: string;
}

export interface UpdateScheduleCellResponse {
  success: boolean;
  warnings: ScheduleWarning[];
}

export interface BatchUpdateScheduleCellRequest {
  cells: UpdateScheduleCellRequest[];
}

export interface BatchUpdateScheduleCellResponse {
  success: boolean;
  changedCount: number;
  warnings: ScheduleWarning[];
}

export type ScheduleChangeType = "manual" | "optimize";

export interface ScheduleChangeLog {
  id: string;
  month: string;
  employeeId: string;
  employeeName: string;
  scheduleDate: string;
  oldShiftCode: ShiftCode | null;
  newShiftCode: ShiftCode;
  changeType: ScheduleChangeType;
  changedBy: string;
  changedAt: string;
}

export interface ScheduleChangeLogListResponse {
  items: ScheduleChangeLog[];
  total: number;
}

// ============ 历史班表导入（跨月接续） ============

export interface ImportHistoryRow {
  employeeNo: string;
  /** key 为当月日号（"1"-"31"），value 为工作班次 code（不含 rest） */
  shifts: Record<string, ShiftCode>;
}

export interface ImportHistoryScheduleRequest {
  month: string;
  /** 目标部门 */
  department: string;
  fileName?: string;
  rows: ImportHistoryRow[];
}

export interface ImportHistoryScheduleResponse {
  success: boolean;
  inserted: number;
  message: string;
}

export interface ScheduleImportHistoryRecord {
  id: string;
  month: string;
  fileName: string;
  employeeCount: number;
  entryCount: number;
  status: 'active' | 'deleted';
  importedAt: string;
  deletedAt?: string;
}

export interface ListImportHistoryResponse {
  items: ScheduleImportHistoryRecord[];
}

export interface DeleteImportedScheduleResponse {
  success: boolean;
  deleted: number;
}

// ============ 方案对比 ============

export type ProposalStrategy = "balanced" | "preference" | "fair";

export interface ScheduleProposalMetrics {
  warningCount: number;
  preferenceHits: number;
  totalWorkingShifts: number;
  avgNightsPerEmployee: number;
  maxNightsPerEmployee: number;
  changeCount: number | null;
}

export interface ScheduleProposalCell {
  employeeId: string;
  date: string;
  shiftCode: ShiftCode;
}

export interface ScheduleProposal {
  strategy: ProposalStrategy;
  name: string;
  description: string;
  warnings: ScheduleWarning[];
  metrics: ScheduleProposalMetrics;
  cells: ScheduleProposalCell[];
  /** 综合评分，越大越优 */
  totalScore: number;
  /** 各规则加权得分明细 */
  ruleScores: RuleScore[];
}

export interface GenerateProposalsRequest {
  month: string;
  /** 目标部门 */
  department: string;
}

export interface GenerateProposalsResponse {
  month: string;
  department: string;
  proposals: ScheduleProposal[];
}

export interface ApplyProposalRequest {
  month: string;
  /** 目标部门 */
  department: string;
  strategy: ProposalStrategy;
  cells: ScheduleProposalCell[];
}

export interface ApplyProposalResponse {
  success: boolean;
  warnings: ScheduleWarning[];
  changedCount: number;
}

// ============ 身份与角色 ============

export interface CurrentIdentity {
  /** 妙搭用户 ID（未登录为空） */
  userId: string;
  role: UserRole;
  /** 匹配到的员工记录 id，未匹配为 null */
  employeeId: string | null;
  /** 展示名：匹配员工取员工姓名，否则取登录用户名 */
  name: string;
}

// ============ 排班发布机制 ============

export type PublishStatus = "draft" | "published";

export interface SchedulePublishInfo {
  month: string;
  status: PublishStatus;
  /** 最近一次发布时间（ISO 字符串），未发布为 null */
  publishedAt: string | null;
}

export interface PublishScheduleRequest {
  month: string;
  /** 目标部门 */
  department: string;
}

export interface PublishScheduleResponse {
  success: boolean;
  status: PublishStatus;
  publishedAt: string | null;
  message: string;
}

// ============ 员工端「我的班表」 ============

export type MyScheduleDayStatus = "work" | "rest" | "leave";

export interface MyScheduleDay {
  date: string;
  shiftCode: ShiftCode;
  shiftName: string;
  startTime?: string;
  endTime?: string;
  crossDay?: boolean;
  status: MyScheduleDayStatus;
  /** 当天同班次搭档姓名 */
  teammates?: string[];
}

export interface MyScheduleResponse {
  month: string;
  isPublished: boolean;
  days: MyScheduleDay[];
  /** 当前登录用户匹配到的员工姓名，未匹配为 null */
  employeeName: string | null;
}
