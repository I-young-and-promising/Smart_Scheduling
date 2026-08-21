import dayjs from "dayjs";
import type {
  Employee,
  Holiday,
  RuleConfig,
  RuleItem,
  RuleScore,
  ScheduleWarning,
  ShiftCode,
  ShiftConfig,
} from "@shared/api.interface";

/** 全部班次 code */
export const ALL_SHIFT_CODES: ShiftCode[] = ["day", "middle", "night", "rest"];

/** 工作班次（非休班） */
export const WORKING_SHIFT_CODES: ShiftCode[] = ["day", "middle", "night"];

/** 班次名称兜底（shift_config 缺失时使用） */
export const FALLBACK_SHIFT_NAMES: Record<ShiftCode, string> = {
  day: "白班",
  middle: "中班",
  night: "晚班",
  rest: "休班",
};

/** 默认规则项：hard 必须满足，soft 按权重评分 */
export const DEFAULT_RULE_ITEMS: RuleItem[] = [
  // hard
  { code: "R-S-01", name: "班次衔接矩阵", type: "hard", weight: 0, enabled: true },
  { code: "R-S-02", name: "月度夜班上限", type: "hard", weight: 0, enabled: true },
  { code: "R-P-03", name: "新老搭配", type: "hard", weight: 0, enabled: true },
  { code: "R-P-04", name: "主管每班覆盖", type: "hard", weight: 0, enabled: true },
  { code: "R-P-06", name: "主管不排夜班", type: "hard", weight: 0, enabled: true },
  { code: "R-S-11", name: "最小休息块", type: "hard", weight: 0, enabled: true },
  { code: "R-S-12", name: "最小工作块", type: "hard", weight: 0, enabled: true },
  { code: "R-S-16", name: "每周双休连续", type: "hard", weight: 0, enabled: true },
  { code: "R-S-17", name: "工作日分布均匀", type: "hard", weight: 0, enabled: true },
  { code: "R-S-09", name: "固定周期休假", type: "hard", weight: 0, enabled: true },
  // soft
  { code: "R-S-04", name: "夜班均衡性", type: "soft", weight: 20, enabled: true },
  { code: "R-S-13", name: "晚班偏差控制", type: "soft", weight: 15, enabled: true },
  { code: "R-S-15", name: "周度工作量均衡", type: "soft", weight: 10, enabled: true },
  { code: "R-P-02", name: "高优先级班次筛选", type: "soft", weight: 15, enabled: true },
  { code: "R-P-07", name: "带教班次强同步", type: "soft", weight: 25, enabled: true },
  { code: "R-P-08", name: "高低效率搭配排班", type: "soft", weight: 20, enabled: true },
  { code: "R-S-18", name: "工时结余动态调节", type: "soft", weight: 15, enabled: true },
  { code: "R-S-14", name: "晚班偏好满足", type: "soft", weight: 10, enabled: true },
];

/** 规则引擎默认配置（与旧硬编码常量等价，可被 schedule_setting 覆盖） */
export const DEFAULT_RULE_CONFIG: RuleConfig = {
  nightLimit: 10,
  weekWorkLimit: 6,
  maxConsecutiveRestDays: 10,
  maxConsecutiveDayShifts: 3,
  nightRestDays: 1,
  prevPrefixStartDay: 16,
  transitionMatrix: {
    day: ["day", "middle", "night", "rest"],
    middle: ["middle", "night", "rest"],
    night: ["rest"],
    rest: ["day", "middle", "night", "rest"],
  },
  seniorJuniorMixEnabled: true,
  supervisorCoverageEnabled: true,
  supervisorNoNightEnabled: true,
  mentorSyncEnabled: true,
  efficiencyMixEnabled: true,
  efficiencyMixWeight: 30,
  workBalanceEnabled: true,
  baseMonthOffDays: 8,
  minRestBlockDays: 2,
  minWorkBlockDays: 2,
  weeklyDoubleRestEnabled: true,
  workdayDistributionEnabled: true,
  nightPreferenceEnabled: true,
  rules: DEFAULT_RULE_ITEMS,
};

/**
 * 跨月上下文：上月下半旬班表。
 * 用于上月最后一天与本月 1 号的衔接校验，以及周工作天数跨月累计。
 */
export interface PrevMonthContext {
  /** 上月下半旬日期，升序 */
  dates: string[];
  /** employeeId → date → 班次（缺失视为 rest） */
  matrix: Map<string, Map<string, ShiftCode>>;
}

/** 节假日上下文：date -> Holiday */
export type HolidayContext = Map<string, Holiday>;

/** 已批准排休锁定：employeeId → 当月内固定为 rest 的日期集合 */
export type LockedRestContext = Map<string, Set<string>>;

/** 校验可调参数 */
export interface ValidateOptions {
  prev?: PrevMonthContext;
  holidayContext?: HolidayContext;
  locked?: LockedRestContext;
  nightRestDays?: number;
  ruleConfig?: RuleConfig;
}

function allowedNextSet(
  matrix: Record<ShiftCode, ShiftCode[]> | undefined,
  prev: ShiftCode,
): Set<ShiftCode> {
  const codes: ShiftCode[] = matrix?.[prev] ?? DEFAULT_RULE_CONFIG.transitionMatrix[prev];
  return new Set<ShiftCode>(codes);
}

/** 判断 前一日班次 → 后一日班次 是否合法 */
export function isTransitionAllowed(
  prev: ShiftCode,
  next: ShiftCode,
  matrix?: Record<ShiftCode, ShiftCode[]>,
): boolean {
  return allowedNextSet(matrix, prev).has(next);
}

/** 读取矩阵中某员工某日班次，缺失视为 rest */
export function getShiftOf(
  matrix: Map<string, Map<string, ShiftCode>>,
  employeeId: string,
  date: string,
): ShiftCode {
  return matrix.get(employeeId)?.get(date) ?? "rest";
}

/** 判断某日是否为法定节假日默认休息（非 mustWork） */
export function isHolidayDefaultRest(
  date: string,
  holidayContext?: HolidayContext,
): boolean {
  const h: Holiday | undefined = holidayContext?.get(date);
  return h?.type === "legal_holiday" && !h.mustWork;
}

/** 判断某日对员工是否为锁定休息（批准排休或法定节假日默认休息） */
export function isLockedRest(
  employeeId: string,
  date: string,
  options?: Pick<ValidateOptions, "locked" | "holidayContext">,
): boolean {
  if (options?.locked?.get(employeeId)?.has(date) === true) return true;
  return isHolidayDefaultRest(date, options?.holidayContext);
}

/** 判断某日是否为节假日上班日（法定假日必须上班 / 调休工作日） */
export function isHolidayWorkday(
  date: string,
  holidayContext?: HolidayContext,
): boolean {
  const h: Holiday | undefined = holidayContext?.get(date);
  if (!h) return false;
  if (h.type === "workday_swap") return true;
  if (h.type === "legal_holiday" && h.mustWork) return true;
  return false;
}

/** 获取某日某班次的有效人数上下限（节假日上班日优先使用 holidayMinCount/holidayMaxCount） */
export function getEffectiveCountConfig(
  cfg: ShiftConfig | undefined,
  date: string,
  holidayContext?: HolidayContext,
): { minCount: number | null; maxCount: number | null } {
  if (!cfg) return { minCount: null, maxCount: null };
  if (isHolidayWorkday(date, holidayContext)) {
    return {
      minCount: cfg.holidayMinCount ?? cfg.minCount,
      maxCount: cfg.holidayMaxCount ?? cfg.maxCount,
    };
  }
  return { minCount: cfg.minCount, maxCount: cfg.maxCount };
}

/** 日期所在自然周（周一~周日）的周一，YYYY-MM-DD */
export function getWeekMonday(date: string): string {
  const d: dayjs.Dayjs = dayjs(date);
  const diff: number = d.day() === 0 ? 6 : d.day() - 1;
  return d.subtract(diff, "day").format("YYYY-MM-DD");
}

/** 月份内所有日期，YYYY-MM-DD */
export function getMonthDates(month: string): string[] {
  const first: dayjs.Dayjs = dayjs(`${month}-01`);
  const days: number = first.daysInMonth();
  const dates: string[] = [];
  for (let i: number = 0; i < days; i++) {
    dates.push(first.add(i, "day").format("YYYY-MM-DD"));
  }
  return dates;
}

/** 连续多月日期数组（含首尾） */
export function getMultiMonthDates(months: string[]): string[] {
  const set: Set<string> = new Set<string>();
  for (const month of months) {
    for (const d of getMonthDates(month)) {
      set.add(d);
    }
  }
  return Array.from(set).sort();
}

/** 根据 YYYY-MM-DD 提取月份 YYYY-MM */
export function getMonthOfDate(date: string): string {
  return date.slice(0, 7);
}

/** 人数是否超出班次上下限（null 表示该方向不限） */
export function isCountOutOfRange(
  count: number,
  cfg: ShiftConfig | undefined,
): boolean {
  if (!cfg) return false;
  if (cfg.minCount !== null && count < cfg.minCount) return true;
  if (cfg.maxCount !== null && count > cfg.maxCount) return true;
  return false;
}

/** 校验夜班后连续休息天数是否满足要求 */
function validateNightRestDays(
  emp: Employee,
  dates: string[],
  matrix: Map<string, Map<string, ShiftCode>>,
  nightRestDays: number,
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  for (let i: number = 0; i < dates.length; i++) {
    const code: ShiftCode = getShiftOf(matrix, emp.id, dates[i]);
    if (code !== "night") continue;
    for (let j: number = 1; j <= nightRestDays; j++) {
      const nextIndex: number = i + j;
      if (nextIndex >= dates.length) break;
      const nextCode: ShiftCode = getShiftOf(matrix, emp.id, dates[nextIndex]);
      if (nextCode !== "rest") {
        warnings.push({
          id: `night_rest_days-${emp.id}-${dates[i]}-${j}`,
          type: "night_rest_days",
          message: `${emp.name} 在 ${dates[i]} 晚班后，第 ${j} 天（${dates[nextIndex]}）未安排休息`,
          employeeId: emp.id,
          date: dates[nextIndex],
        });
      }
    }
  }
  return warnings;
}

/**
 * 合规校验：对整段日期排班矩阵执行全部硬约束检查。
 * 矩阵中缺失的日期视为 rest。
 */
export function validateMonth(
  employees: Employee[],
  shiftConfigs: ShiftConfig[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
  options?: ValidateOptions,
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const configByCode: Map<ShiftCode, ShiftConfig> = new Map<ShiftCode, ShiftConfig>();
  for (const cfg of shiftConfigs) {
    configByCode.set(cfg.code, cfg);
  }

  const prev: PrevMonthContext | undefined = options?.prev;
  const holidayContext: HolidayContext | undefined = options?.holidayContext;
  const locked: LockedRestContext | undefined = options?.locked;
  const ruleConfig: RuleConfig = options?.ruleConfig ?? DEFAULT_RULE_CONFIG;
  const nightRestDays: number =
    options?.nightRestDays && options.nightRestDays >= 1
      ? options.nightRestDays
      : ruleConfig.nightRestDays;

  const prevLastDate: string | null =
    prev && prev.dates.length > 0 ? prev.dates[prev.dates.length - 1] : null;

  for (const emp of employees) {
    let nightCount: number = 0;
    const weekWork: Map<string, { count: number; sampleDate: string | null }> = new Map();
    let restRun: number = 0;
    let dayRun: number = 0;

    // 上月工作天数计入对应自然周
    if (prev) {
      for (const d of prev.dates) {
        const prevCode: ShiftCode = prev.matrix.get(emp.id)?.get(d) ?? "rest";
        if (prevCode === "rest") continue;
        const weekKey: string = getWeekMonday(d);
        const prevInfo = weekWork.get(weekKey);
        if (prevInfo) {
          prevInfo.count += 1;
        } else {
          weekWork.set(weekKey, { count: 1, sampleDate: null });
        }
      }
    }

    // 上月最后一天的班次，用于本月 1 号的衔接校验
    const prevLastCode: ShiftCode | null =
      prevLastDate !== null
        ? prev?.matrix.get(emp.id)?.get(prevLastDate) ?? "rest"
        : null;

    for (let i: number = 0; i < dates.length; i++) {
      const date: string = dates[i];
      const code: ShiftCode = getShiftOf(matrix, emp.id, date);

      if (code === "night") nightCount += 1;

      if (code !== "rest") {
        const weekKey: string = getWeekMonday(date);
        const info = weekWork.get(weekKey);
        if (info) {
          info.count += 1;
          if (info.sampleDate === null) info.sampleDate = date;
        } else {
          weekWork.set(weekKey, { count: 1, sampleDate: date });
        }
        restRun = 0;
        if (code === "day") {
          dayRun += 1;
          if (dayRun > ruleConfig.maxConsecutiveDayShifts) {
            warnings.push({
              id: `day_limit-${emp.id}-${date}`,
              type: "day_limit",
              message: `${emp.name} 在 ${date} 连续白班天数超过 ${ruleConfig.maxConsecutiveDayShifts} 天上限`,
              employeeId: emp.id,
              date,
            });
          }
        } else {
          dayRun = 0;
        }
      } else if (!isLockedRest(emp.id, date, { locked, holidayContext })) {
        restRun += 1;
        dayRun = 0;
        if (restRun > ruleConfig.maxConsecutiveRestDays) {
          warnings.push({
            id: `rest_limit-${emp.id}-${date}`,
            type: "rest_limit",
            message: `${emp.name} 在 ${date} 连续休息天数超过 ${ruleConfig.maxConsecutiveRestDays} 天上限`,
            employeeId: emp.id,
            date,
          });
        }
      } else {
        // 锁定的休息（法定假/批准长假）不计入连续休息统计
        restRun = 0;
        dayRun = 0;
      }

      const prevCode: ShiftCode | null =
        i > 0 ? getShiftOf(matrix, emp.id, dates[i - 1]) : prevLastCode;
      if (
        prevCode !== null &&
        !isTransitionAllowed(prevCode, code, ruleConfig.transitionMatrix)
      ) {
        warnings.push({
          id: `transition-${emp.id}-${date}`,
          type: "transition",
          message: `${emp.name} 在 ${date} 的班次衔接（${FALLBACK_SHIFT_NAMES[prevCode]} → ${FALLBACK_SHIFT_NAMES[code]}）违反规则`,
          employeeId: emp.id,
          date,
        });
      }
    }

    if (nightCount > ruleConfig.nightLimit) {
      warnings.push({
        id: `night_limit-${emp.id}-all`,
        type: "night_limit",
        message: `${emp.name} 当月晚班 ${nightCount} 天，超过上限 ${ruleConfig.nightLimit} 天`,
        employeeId: emp.id,
        date: null,
      });
    }

    warnings.push(...validateNightRestDays(emp, dates, matrix, nightRestDays));

    for (const info of weekWork.values()) {
      if (info.count > ruleConfig.weekWorkLimit && info.sampleDate !== null) {
        warnings.push({
          id: `week_limit-${emp.id}-${info.sampleDate}`,
          type: "week_limit",
          message: `${emp.name} 在 ${dayjs(info.sampleDate).format("M月D日")} 所在周累计工作 ${info.count} 天（含上月），超过单周 ${ruleConfig.weekWorkLimit} 天上限`,
          employeeId: emp.id,
          date: info.sampleDate,
        });
      }
    }
  }

  // 每日人数检查（法定节假日默认休息除外，节假日上班日使用独立人数上下限）
  for (const date of dates) {
    if (isHolidayDefaultRest(date, holidayContext)) continue;
    const counts: Map<ShiftCode, number> = new Map<ShiftCode, number>();
    for (const emp of employees) {
      const code: ShiftCode = getShiftOf(matrix, emp.id, date);
      if (code !== "rest") {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
    for (const code of WORKING_SHIFT_CODES) {
      const cfg: ShiftConfig | undefined = configByCode.get(code);
      if (!cfg) continue;
      const effective = getEffectiveCountConfig(cfg, date, holidayContext);
      const count: number = counts.get(code) ?? 0;
      if (
        (effective.minCount !== null && count < effective.minCount) ||
        (effective.maxCount !== null && count > effective.maxCount)
      ) {
        warnings.push({
          id: `daily_limit-all-${date}`,
          type: "daily_limit",
          message: `${date} ${cfg.name}人数 ${count}，应在 ${effective.minCount ?? 0}~${effective.maxCount ?? "不限"} 人之间`,
          employeeId: null,
          date,
        });
      }
    }
  }

  const ruleByCode: Map<string, RuleItem> = new Map<string, RuleItem>(
    (ruleConfig.rules ?? DEFAULT_RULE_ITEMS).map(
      (rule: RuleItem): [string, RuleItem] => [rule.code, rule],
    ),
  );
  const isRuleEnabled = (code: string): boolean =>
    ruleByCode.get(code)?.enabled ?? false;
  const isRuleHard = (code: string): boolean => {
    const rule: RuleItem | undefined = ruleByCode.get(code);
    return (rule?.enabled ?? false) && rule?.type === "hard";
  };

  // R-P-07 / R-P-08 / R-S-18 仅当配置为硬规则时参与可行性校验；默认作为软规则由 scoreSoftRules 评分
  if (isRuleHard("R-P-07")) {
    warnings.push(...validateMentorSync(employees, matrix, dates));
  }
  if (isRuleHard("R-P-08")) {
    warnings.push(...validateEfficiencyMix(employees, matrix, dates));
  }
  if (isRuleHard("R-S-18")) {
    warnings.push(...validateWorkBalance(employees, matrix, dates, ruleConfig.baseMonthOffDays ?? 8));
  }

  if (isRuleHard("R-P-03")) {
    warnings.push(...validateSeniorJuniorMix(employees, shiftConfigs, matrix, dates));
  }
  if (isRuleHard("R-P-04")) {
    warnings.push(...validateSupervisorCoverage(employees, shiftConfigs, matrix, dates));
  }
  if (isRuleHard("R-P-06")) {
    warnings.push(...validateSupervisorNoNight(employees, matrix, dates));
  }
  if (isRuleHard("R-S-11")) {
    warnings.push(
      ...validateMinRestBlock(
        employees,
        matrix,
        dates,
        locked,
        holidayContext,
        ruleConfig.minRestBlockDays ?? 2,
      ),
    );
  }
  if (isRuleHard("R-S-12")) {
    warnings.push(
      ...validateMinWorkBlock(
        employees,
        matrix,
        dates,
        ruleConfig.minWorkBlockDays ?? 2,
      ),
    );
  }
  if (isRuleHard("R-S-16")) {
    warnings.push(...validateWeeklyDoubleRest(employees, matrix, dates));
  }
  if (isRuleHard("R-S-17")) {
    warnings.push(...validateWorkdayDistribution(employees, matrix, dates));
  }
  if (isRuleHard("R-S-09")) {
    warnings.push(...validateFixedLeaves(employees, matrix, dates));
  }

  return warnings;
}

/** R-P-07：新员工带教班次同步校验 */
function validateMentorSync(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const empByNo: Map<string, Employee> = new Map<string, Employee>(
    employees.map((e: Employee): [string, Employee] => [e.employeeNo, e]),
  );
  for (const mentee of employees) {
    if (!mentee.mentorNos || mentee.mentorNos.length === 0) continue;
    const mentors: Employee[] = mentee.mentorNos
      .map((no: string): Employee | undefined => empByNo.get(no))
      .filter((e: Employee | undefined): e is Employee => !!e);
    if (mentors.length === 0) continue;
    for (const date of dates) {
      const menteeCode: ShiftCode = getShiftOf(matrix, mentee.id, date);
      if (menteeCode === "rest") continue;
      const mentorCodes: ShiftCode[] = mentors
        .map((m: Employee): ShiftCode => getShiftOf(matrix, m.id, date))
        .filter((code: ShiftCode): boolean => code !== "rest");
      if (mentorCodes.length > 0 && !mentorCodes.includes(menteeCode)) {
        const mentorNames: string = mentors.map((m: Employee): string => m.name).join("、");
        warnings.push({
          id: `mentor_sync-${mentee.id}-${date}`,
          type: "mentor_sync",
          message: `${mentee.name} 在 ${date} 的班次与带教师傅（${mentorNames}）不一致`,
          employeeId: mentee.id,
          date,
        });
      }
    }
  }
  return warnings;
}

/** R-P-08：高低效率员工搭配校验 */
function validateEfficiencyMix(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  for (const date of dates) {
    const byShift: Map<ShiftCode, { high: Employee[]; low: Employee[]; other: Employee[] }> = new Map();
    for (const emp of employees) {
      const code: ShiftCode = getShiftOf(matrix, emp.id, date);
      if (code === "rest") continue;
      const bucket = byShift.get(code) ?? { high: [], low: [], other: [] };
      const tag: string = (emp.efficiencyTag ?? "").toLowerCase();
      if (tag === "高" || tag === "high") bucket.high.push(emp);
      else if (tag === "低" || tag === "low") bucket.low.push(emp);
      else bucket.other.push(emp);
      byShift.set(code, bucket);
    }
    for (const [code, bucket] of byShift.entries()) {
      const totalEff: number = bucket.high.length + bucket.low.length;
      if (totalEff >= 2 && (bucket.high.length === 0 || bucket.low.length === 0)) {
        const shiftName: string = FALLBACK_SHIFT_NAMES[code];
        warnings.push({
          id: `efficiency_mix-${date}-${code}`,
          type: "efficiency_mix",
          message: `${date} ${shiftName} 班次中高低效率员工未搭配（高 ${bucket.high.length} 人 / 低 ${bucket.low.length} 人）`,
          employeeId: null,
          date,
        });
      }
    }
  }
  return warnings;
}

/** R-S-18：工时结余动态调节校验 */
function validateWorkBalance(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
  baseMonthOffDays: number,
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  for (const emp of employees) {
    const surplusDays: number = emp.surplusDays ?? 0;
    const owedDays: number = emp.owedDays ?? 0;
    if (surplusDays === 0 && owedDays === 0) continue;

    let workDays: number = 0;
    for (const date of dates) {
      const code: ShiftCode = getShiftOf(matrix, emp.id, date);
      if (code !== "rest") workDays += 1;
    }
    const expectedWorkDays: number = dates.length - Math.max(0, baseMonthOffDays - surplusDays + owedDays);
    const diff: number = workDays - expectedWorkDays;
    if (Math.abs(diff) >= 2) {
      const direction: string = diff > 0 ? "过多" : "过少";
      warnings.push({
        id: `work_balance-${emp.id}-all`,
        type: "work_balance",
        message: `${emp.name} 当月工作 ${workDays} 天，结合工时结余/亏欠预期应为 ${expectedWorkDays} 天，实际安排${direction}`,
        employeeId: emp.id,
        date: null,
      });
    }
  }
  return warnings;
}

function isSeniorEmployee(emp: Employee): boolean {
  const tags: Set<string> = new Set<string>(
    [...emp.roleTags, ...emp.abilityTags].map((tag: string): string => tag.toLowerCase()),
  );
  return tags.has("senior") || tags.has("veteran") || tags.has("level_3");
}

function isJuniorEmployee(emp: Employee): boolean {
  const tags: Set<string> = new Set<string>(
    [...emp.roleTags, ...emp.abilityTags].map((tag: string): string => tag.toLowerCase()),
  );
  return tags.has("junior") || tags.has("newcomer") || tags.has("level_1");
}

function isSupervisorEmployee(emp: Employee): boolean {
  return (
    emp.userRole === "admin" ||
    emp.roleTags.map((tag: string): string => tag.toLowerCase()).includes("supervisor")
  );
}

function isSupervisorOrMentorEmployee(emp: Employee): boolean {
  const lowerTags: string[] = emp.roleTags.map((tag: string): string => tag.toLowerCase());
  return (
    emp.userRole === "admin" ||
    lowerTags.includes("supervisor") ||
    lowerTags.includes("mentor")
  );
}

function weekDayName(weekDay: number): string {
  const names: string[] = ["日", "一", "二", "三", "四", "五", "六"];
  return names[weekDay] ?? "";
}

/** R-P-03：新老搭配校验 */
function validateSeniorJuniorMix(
  employees: Employee[],
  shiftConfigs: ShiftConfig[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const cfgByCode: Map<ShiftCode, ShiftConfig> = new Map<ShiftCode, ShiftConfig>();
  for (const cfg of shiftConfigs) {
    cfgByCode.set(cfg.code, cfg);
  }

  for (const date of dates) {
    for (const code of WORKING_SHIFT_CODES) {
      const cfg: ShiftConfig | undefined = cfgByCode.get(code);
      if (!cfg?.requireSeniorJuniorMix) continue;

      const assigned: Employee[] = [];
      for (const emp of employees) {
        if (getShiftOf(matrix, emp.id, date) === code) {
          assigned.push(emp);
        }
      }
      if (assigned.length === 0) continue;

      const hasSenior: boolean = assigned.some(isSeniorEmployee);
      const hasJunior: boolean = assigned.some(isJuniorEmployee);
      if (!hasSenior || !hasJunior) {
        warnings.push({
          id: `senior_junior_mix-${date}-${code}`,
          type: "senior_junior_mix",
          message: `${date} ${cfg.name} 班次新老搭配不足（需至少一名 senior 与一名 junior）`,
          employeeId: null,
          date,
        });
      }
    }
  }
  return warnings;
}

/** R-P-04：主管每班覆盖校验 */
function validateSupervisorCoverage(
  employees: Employee[],
  shiftConfigs: ShiftConfig[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const cfgByCode: Map<ShiftCode, ShiftConfig> = new Map<ShiftCode, ShiftConfig>();
  for (const cfg of shiftConfigs) {
    cfgByCode.set(cfg.code, cfg);
  }

  for (const date of dates) {
    for (const code of WORKING_SHIFT_CODES) {
      const cfg: ShiftConfig | undefined = cfgByCode.get(code);
      if (!cfg?.requireSupervisor) continue;

      let hasSupervisor: boolean = false;
      for (const emp of employees) {
        if (getShiftOf(matrix, emp.id, date) === code && isSupervisorOrMentorEmployee(emp)) {
          hasSupervisor = true;
          break;
        }
      }

      if (!hasSupervisor) {
        warnings.push({
          id: `supervisor_missing-${date}-${code}`,
          type: "supervisor_missing",
          message: `${date} ${cfg.name} 班次缺少主管/管理员在岗`,
          employeeId: null,
          date,
        });
      }
    }
  }
  return warnings;
}

/** R-P-06：主管不排夜班校验 */
function validateSupervisorNoNight(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  for (const emp of employees) {
    if (!isSupervisorEmployee(emp)) continue;
    for (const date of dates) {
      if (getShiftOf(matrix, emp.id, date) === "night") {
        warnings.push({
          id: `supervisor_no_night-${emp.id}-${date}`,
          type: "unavailable_time",
          message: `${emp.name} 为主管/管理员，不能安排 ${date} 夜班`,
          employeeId: emp.id,
          date,
        });
      }
    }
  }
  return warnings;
}

/** R-S-11：最小休息块校验 */
function validateMinRestBlock(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
  locked: LockedRestContext | undefined,
  holidayContext: HolidayContext | undefined,
  minRestBlockDays: number,
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  if (minRestBlockDays <= 1 || dates.length === 0) return warnings;

  for (const emp of employees) {
    let startIndex: number = -1;
    let runLen: number = 0;
    for (let i: number = 0; i < dates.length; i++) {
      const date: string = dates[i];
      const isRest: boolean = getShiftOf(matrix, emp.id, date) === "rest";
      const lockedRest: boolean = isLockedRest(emp.id, date, { locked, holidayContext });
      if (isRest && !lockedRest) {
        if (startIndex === -1) startIndex = i;
        runLen += 1;
      } else {
        if (
          runLen > 0 &&
          runLen < minRestBlockDays &&
          startIndex > 0 &&
          i - 1 < dates.length - 1
        ) {
          warnings.push({
            id: `min_rest_block-${emp.id}-${dates[startIndex]}`,
            type: "min_rest_block",
            message: `${emp.name} 在 ${dates[startIndex]} 起连续休息 ${runLen} 天，低于最小休息块 ${minRestBlockDays} 天`,
            employeeId: emp.id,
            date: dates[startIndex],
          });
        }
        startIndex = -1;
        runLen = 0;
      }
    }
  }
  return warnings;
}

/** R-S-12：最小工作块校验 */
function validateMinWorkBlock(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
  minWorkBlockDays: number,
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  if (minWorkBlockDays <= 1 || dates.length === 0) return warnings;

  for (const emp of employees) {
    let startIndex: number = -1;
    let runLen: number = 0;
    for (let i: number = 0; i < dates.length; i++) {
      const isWork: boolean = getShiftOf(matrix, emp.id, dates[i]) !== "rest";
      if (isWork) {
        if (startIndex === -1) startIndex = i;
        runLen += 1;
      } else {
        if (
          runLen > 0 &&
          runLen < minWorkBlockDays &&
          startIndex > 0 &&
          i - 1 < dates.length - 1
        ) {
          warnings.push({
            id: `min_work_block-${emp.id}-${dates[startIndex]}`,
            type: "min_work_block",
            message: `${emp.name} 在 ${dates[startIndex]} 起连续工作 ${runLen} 天，低于最小工作块 ${minWorkBlockDays} 天`,
            employeeId: emp.id,
            date: dates[startIndex],
          });
        }
        startIndex = -1;
        runLen = 0;
      }
    }
  }
  return warnings;
}

/** R-S-16：每周双休连续校验 */
function validateWeeklyDoubleRest(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const weeks: Map<string, string[]> = new Map<string, string[]>();
  for (const date of dates) {
    const weekKey: string = getWeekMonday(date);
    const arr: string[] = weeks.get(weekKey) ?? [];
    arr.push(date);
    weeks.set(weekKey, arr);
  }

  for (const [weekKey, weekDates] of weeks) {
    if (weekDates.length < 7) continue;
    weekDates.sort();
    for (const emp of employees) {
      let hasDouble: boolean = false;
      for (let i: number = 0; i < weekDates.length - 1; i++) {
        if (
          getShiftOf(matrix, emp.id, weekDates[i]) === "rest" &&
          getShiftOf(matrix, emp.id, weekDates[i + 1]) === "rest"
        ) {
          hasDouble = true;
          break;
        }
      }
      if (!hasDouble) {
        warnings.push({
          id: `double_rest-${emp.id}-${weekKey}`,
          type: "double_rest",
          message: `${emp.name} 在 ${weekDates[0]} 所在周未保证连续两天休息`,
          employeeId: emp.id,
          date: weekDates[0],
        });
      }
    }
  }
  return warnings;
}

/** R-S-17：工作日分布均匀校验 */
function validateWorkdayDistribution(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const weeks: Map<string, string[]> = new Map<string, string[]>();
  for (const date of dates) {
    const weekKey: string = getWeekMonday(date);
    const arr: string[] = weeks.get(weekKey) ?? [];
    arr.push(date);
    weeks.set(weekKey, arr);
  }

  for (const emp of employees) {
    const counts: number[] = [];
    for (const weekDates of weeks.values()) {
      let count: number = 0;
      for (const d of weekDates) {
        if (getShiftOf(matrix, emp.id, d) !== "rest") count += 1;
      }
      counts.push(count);
    }
    if (counts.length <= 1) continue;
    const maxCount: number = Math.max(...counts);
    const minCount: number = Math.min(...counts);
    if (maxCount - minCount > 1) {
      warnings.push({
        id: `workday_distribution-${emp.id}-all`,
        type: "workday_distribution",
        message: `${emp.name} 各周工作天数差异为 ${maxCount - minCount} 天，超过 1 天`,
        employeeId: emp.id,
        date: null,
      });
    }
  }
  return warnings;
}

/** R-S-09：固定周期休假（hard 优先级）校验 */
function validateFixedLeaves(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  for (const emp of employees) {
    for (const leave of emp.fixedLeaves ?? []) {
      if (!leave.enabled || leave.priority !== "hard") continue;
      for (const date of dates) {
        if (dayjs(date).day() === leave.weekDay) {
          if (getShiftOf(matrix, emp.id, date) !== "rest") {
            warnings.push({
              id: `fixed_leave-${emp.id}-${date}`,
              type: "fixed_leave",
              message: `${emp.name} 在 ${date}（周${weekDayName(leave.weekDay)}）存在 hard 固定休假，但未安排休息`,
              employeeId: emp.id,
              date,
            });
          }
        }
      }
    }
  }
  return warnings;
}

function buildMentorMap(employees: Employee[]): Map<string, string[]> {
  const employeeByNo: Map<string, Employee> = new Map<string, Employee>(
    employees.map((e: Employee): [string, Employee] => [e.employeeNo, e]),
  );
  const mentorMap: Map<string, string[]> = new Map<string, string[]>();
  for (const emp of employees) {
    if (emp.mentorNos && emp.mentorNos.length > 0) {
      const mentorIds: string[] = emp.mentorNos
        .map((no: string): Employee | undefined => employeeByNo.get(no))
        .filter((e: Employee | undefined): e is Employee => !!e)
        .map((e: Employee): string => e.id);
      if (mentorIds.length > 0) {
        mentorMap.set(emp.id, mentorIds);
      }
    }
  }
  return mentorMap;
}

/** R-P-07：新员工带教班次同步成本 */
function mentorSyncCost(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
): number {
  const mentorMap: Map<string, string[]> = buildMentorMap(employees);
  let cost: number = 0;
  for (const [menteeId, mentorIds] of mentorMap.entries()) {
    for (const date of dates) {
      const menteeCode: ShiftCode = getShiftOf(matrix, menteeId, date);
      if (menteeCode === "rest") continue;
      const mentorCode: ShiftCode | undefined = mentorIds
        .map((id: string): ShiftCode => getShiftOf(matrix, id, date))
        .find((code: ShiftCode): boolean => code !== "rest");
      if (mentorCode && mentorCode !== menteeCode) {
        cost += 1;
      }
    }
  }
  return cost;
}

/** R-P-08：高低效率员工搭配成本 */
function efficiencyMixCost(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
): number {
  let cost: number = 0;
  for (const date of dates) {
    const byShift: Map<ShiftCode, { high: number; low: number; other: number }> = new Map();
    for (const emp of employees) {
      const code: ShiftCode = getShiftOf(matrix, emp.id, date);
      if (code === "rest") continue;
      const bucket = byShift.get(code) ?? { high: 0, low: 0, other: 0 };
      const tag: string = (emp.efficiencyTag ?? "").toLowerCase();
      if (tag === "高" || tag === "high") bucket.high += 1;
      else if (tag === "低" || tag === "low") bucket.low += 1;
      else bucket.other += 1;
      byShift.set(code, bucket);
    }
    for (const bucket of byShift.values()) {
      const totalEff: number = bucket.high + bucket.low;
      if (totalEff >= 2 && (bucket.high === 0 || bucket.low === 0)) {
        cost += totalEff;
      }
    }
  }
  return cost;
}

/** R-S-18：工时结余动态调节成本 */
function workBalanceCost(
  employees: Employee[],
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
  baseMonthOffDays: number,
): number {
  let cost: number = 0;
  for (const emp of employees) {
    const surplusDays: number = emp.surplusDays ?? 0;
    const owedDays: number = emp.owedDays ?? 0;
    if (surplusDays === 0 && owedDays === 0) continue;

    let restDays: number = 0;
    for (const date of dates) {
      const code: ShiftCode = getShiftOf(matrix, emp.id, date);
      if (code === "rest") restDays += 1;
    }
    const expectedRestDays: number = Math.max(
      0,
      baseMonthOffDays - surplusDays + owedDays,
    );
    const diff: number = restDays - expectedRestDays;
    cost += diff * diff;
  }
  return cost;
}

function isHolidayWorkdayForScore(date: string, holidayContext?: HolidayContext): boolean {
  const h: Holiday | undefined = holidayContext?.get(date);
  if (!h) return false;
  if (h.type === "workday_swap") return true;
  return h.type === "legal_holiday" && h.mustWork;
}

export interface SoftScoreInput {
  employees: Employee[];
  shiftConfigs: ShiftConfig[];
  matrix: Map<string, Map<string, ShiftCode>>;
  dates: string[];
  holidayContext?: HolidayContext;
  ruleConfig: RuleConfig;
}

export interface SoftScoreResult {
  /** 加权总得分，越大越优 */
  total: number;
  /** 各规则得分明细 */
  scores: RuleScore[];
}

/**
 * 软约束评分：根据 ruleConfig.rules 中 type=soft 且 enabled 的规则分别计算成本并加权。
 * 返回总得分（越大越优）与每条规则的得分明细。
 */
export function scoreSoftRules(input: SoftScoreInput): SoftScoreResult {
  const { employees, matrix, dates, holidayContext, ruleConfig } = input;
  const rules: RuleItem[] = ruleConfig.rules ?? DEFAULT_RULE_ITEMS;
  const ruleByCode: Map<string, RuleItem> = new Map<string, RuleItem>(
    rules.map((r: RuleItem): [string, RuleItem] => [r.code, r]),
  );

  const scores: RuleScore[] = [];
  let total: number = 0;

  const scoreFor = (code: string, rawCost: number): void => {
    const rule: RuleItem | undefined = ruleByCode.get(code);
    const enabled: boolean = rule?.enabled ?? false;
    const weight: number = rule?.weight ?? 0;
    const name: string = rule?.name ?? code;
    const rawScore: number = enabled ? rawCost : 0;
    const weightedScore: number = enabled ? -rawScore * weight : 0;
    scores.push({
      code,
      name,
      weight: enabled ? weight : 0,
      rawScore,
      weightedScore,
      satisfied: rawScore === 0,
    });
    total += weightedScore;
  };

  // R-S-04 夜班均衡性：用夜班数方差
  const nightCounts: number[] = [];
  let totalNights: number = 0;
  for (const emp of employees) {
    let nights: number = 0;
    for (const date of dates) {
      if (getShiftOf(matrix, emp.id, date) === "night") nights += 1;
    }
    nightCounts.push(nights);
    totalNights += nights;
  }
  let nightVarianceCost: number = 0;
  if (employees.length > 0) {
    const target: number = totalNights / employees.length;
    for (const n of nightCounts) {
      const diff: number = n - target;
      nightVarianceCost += diff * diff;
    }
  }
  scoreFor("R-S-04", nightVarianceCost);

  // R-S-13 晚班偏差控制：用极差
  let nightRangeCost: number = 0;
  if (nightCounts.length > 0) {
    const maxNights: number = Math.max(...nightCounts);
    const minNights: number = Math.min(...nightCounts);
    nightRangeCost = Math.max(0, maxNights - minNights - 1);
  }
  scoreFor("R-S-13", nightRangeCost);

  // R-S-15 周度工作量均衡 + R-P-02 高优先级班次筛选
  let weekBalanceCost: number = 0;
  let preferenceCost: number = 0;
  for (const emp of employees) {
    const weekWork: Map<string, number> = new Map<string, number>();
    for (let i: number = 0; i < dates.length; i++) {
      const date: string = dates[i];
      const code: ShiftCode = getShiftOf(matrix, emp.id, date);
      if (code !== "rest") {
        const weekKey: string = getWeekMonday(date);
        weekWork.set(weekKey, (weekWork.get(weekKey) ?? 0) + 1);
      }
      if (code === "night" && emp.preference === "prefer_day") {
        preferenceCost += 1;
      } else if (code === "day" && emp.preference === "prefer_night") {
        preferenceCost += 1;
      }
    }
    for (const count of weekWork.values()) {
      if (count < 4) weekBalanceCost += 4 - count;
      else if (count > 5) weekBalanceCost += (count - 5) * 2;
    }
  }
  scoreFor("R-S-15", weekBalanceCost);
  scoreFor("R-P-02", preferenceCost);

  // R-P-07 带教班次同步
  scoreFor("R-P-07", mentorSyncCost(employees, matrix, dates));

  // R-P-08 高低效率搭配
  scoreFor("R-P-08", efficiencyMixCost(employees, matrix, dates));

  // R-S-18 工时结余动态调节
  scoreFor(
    "R-S-18",
    workBalanceCost(employees, matrix, dates, ruleConfig.baseMonthOffDays ?? 8),
  );

  // R-S-14：晚班偏好满足（prefer_night 员工当月至少安排一次夜班）
  let nightPreferenceCost: number = 0;
  for (const emp of employees) {
    if (emp.preference !== "prefer_night") continue;
    let nights: number = 0;
    for (const date of dates) {
      if (getShiftOf(matrix, emp.id, date) === "night") nights += 1;
    }
    if (nights === 0) nightPreferenceCost += 1;
  }
  scoreFor("R-S-14", nightPreferenceCost);

  return { total, scores };
}
