import dayjs from "dayjs";
import type { Employee, Holiday, ProposalStrategy, RuleConfig, RuleItem, RuleScore, ScheduleWarning, ShiftCode, ShiftConfig } from "@shared/api.interface";
import {
  DEFAULT_RULE_CONFIG,
  DEFAULT_RULE_ITEMS,
  FALLBACK_SHIFT_NAMES,
  WORKING_SHIFT_CODES,
  getShiftOf,
  getWeekMonday,
  isHolidayDefaultRest,
  isLockedRest,
  isTransitionAllowed,
  scoreSoftRules,
  validateMonth,
  type HolidayContext,
  type LockedRestContext,
  type PrevMonthContext,
  type SoftScoreResult,
  type ValidateOptions,
} from "./schedule-compliance";

export interface SolverInput {
  employees: Employee[];
  shiftConfigs: ShiftConfig[];
  /** 已批准排休锁定：employeeId → 当月内固定为 rest 的日期集合 */
  locked: LockedRestContext;
  /** 所有待排日期（跨多月时升序拼接） */
  dates: string[];
  /** 目标月份列表 */
  months: string[];
  /** 上月下半旬班表：月初衔接前置状态与周工作天数跨月累计上下文 */
  prev?: PrevMonthContext;
  /** 节假日上下文 */
  holidayContext?: HolidayContext;
  /** 夜班后必须连续休息天数（1 或 2） */
  nightRestDays?: number;
  /** 规则引擎全局配置 */
  ruleConfig?: RuleConfig;
  /** 现有班表作为初始解；提供时会尽量保留原安排 */
  initialMatrix?: Map<string, Map<string, ShiftCode>>;
  /** 每个单元格与初始解不一致时的惩罚（默认 0） */
  changePenalty?: number;
  baseSeed?: number;
  /** 生成策略：偏好满足 / 公平分配 / 平衡（默认） */
  strategy?: ProposalStrategy;
  /** 返回评分最高的 N 个候选方案（默认 1） */
  topN?: number;
  /** 当前排班所属部门 */
  department?: string;
}

export interface SolverCandidate {
  matrix: Map<string, Map<string, ShiftCode>>;
  score: number;
  ruleScores: RuleScore[];
}

export type SolverResult =
  | { success: true; candidate: SolverCandidate }
  | { success: true; candidates: SolverCandidate[] }
  | { success: false; reason: string };

/** 求解总时间预算（毫秒） */
const TOTAL_BUDGET_MS: number = 12000;
/** 贪心构造最大重启轮数 */
const MAX_CONSTRUCT_ROUNDS: number = 40;
/** 构造阶段时间预算（毫秒），剩余留给局部搜索 */
const CONSTRUCT_BUDGET_MS: number = 4000;
/** 局部搜索最大迭代次数 */
const LOCAL_SEARCH_ITERATIONS: number = 8000;

/** 每日构造顺序：晚班最紧优先，再白班，再中班 */
const CONSTRUCT_ORDER: ShiftCode[] = ["night", "day", "middle"];

/** 强制上班时优先尝试的班次 */
const FORCE_WORK_ORDER: ShiftCode[] = ["day", "middle", "night"];

interface SolverContext {
  employees: Employee[];
  workConfigs: Map<ShiftCode, ShiftConfig>;
  /** 用户输入锁定：批准排休 */
  inputLocked: LockedRestContext;
  /** 法定节假日默认休息 */
  legalHolidayRest: Set<string>;
  /** 法定节假日必须上班的日期 */
  mustWorkHolidays: Set<string>;
  /** 调休工作日 */
  workdaySwaps: Set<string>;
  /** 需要上班的节假日日期（mustWork + 调休） */
  holidayWorkdays: Set<string>;
  dates: string[];
  dateWeekKeys: string[];
  prevDayShifts: Map<string, ShiftCode>;
  /** employeeId → 自然周周一 → 上月下半旬工作天数 */
  prevWeekWork: Map<string, Map<string, number>>;
  nightRestDays: number;
  /** 规则引擎全局配置 */
  ruleConfig: RuleConfig;
  /** 节假日上下文 */
  holidayContext?: HolidayContext;
  /** 现有班表初始解 */
  initialMatrix: Map<string, Map<string, ShiftCode>>;
  /** 变动惩罚 */
  changePenalty: number;
  /** 生成策略 */
  strategy: ProposalStrategy;
  /** employeeId → Employee */
  employeeById: Map<string, Employee>;
  /** employeeNo → Employee */
  employeeByNo: Map<string, Employee>;
  /** 新员工 employeeId → 带教师傅 employeeId 列表 */
  mentorMap: Map<string, string[]>;
}

/** 种子化随机数生成器 mulberry32 */
function mulberry32(seed: number): () => number {
  let a: number = seed >>> 0;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t: number = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shiftName(cfg: ShiftConfig | undefined, code: ShiftCode): string {
  return cfg?.name ?? FALLBACK_SHIFT_NAMES[code];
}

/** 根据是否节假日上班日返回有效人数上下限 */
function effectiveCounts(
  cfg: ShiftConfig | undefined,
  date: string,
  holidayWorkdays: Set<string>,
): { minCount: number | null; maxCount: number | null } {
  if (!cfg) return { minCount: null, maxCount: null };
  if (holidayWorkdays.has(date)) {
    return {
      minCount: cfg.holidayMinCount ?? cfg.minCount,
      maxCount: cfg.holidayMaxCount ?? cfg.maxCount,
    };
  }
  return { minCount: cfg.minCount, maxCount: cfg.maxCount };
}

/** 判断某日是否为法定节假日默认休息 */
function isLegalHolidayRest(date: string, ctx: SolverContext): boolean {
  return ctx.legalHolidayRest.has(date);
}

/** 判断某日是否被锁定休息（批准排休 + 法定假默认休息） */
function isLocked(date: string, empId: string, ctx: SolverContext): boolean {
  if (ctx.inputLocked.get(empId)?.has(date) === true) return true;
  return isLegalHolidayRest(date, ctx);
}

/** 候选排序分数：融合软目标偏好，分数越小越优先 */
function candidateScore(
  code: ShiftCode,
  emp: Employee,
  nights: number,
  restRun: number,
  holidayWorkCount: number,
  isMustWorkHoliday: boolean,
  rnd: () => number,
  preserveBonus: number,
  strategy: ProposalStrategy,
): number {
  const prefWeight: number = strategy === "preference" ? 2 : 1;
  const fairWeight: number = strategy === "fair" ? 2 : 1;
  let score: number = rnd();
  if (code === "night") {
    if (emp.preference === "prefer_night") score -= 100 * prefWeight;
    if (emp.preference === "prefer_day") score += 40 * prefWeight;
    score += nights * 10 * fairWeight;
  } else if (code === "day") {
    if (emp.preference === "prefer_day") score -= 100 * prefWeight;
    if (emp.preference === "prefer_night") score += 40 * prefWeight;
    score += nights * 2 * fairWeight;
  } else if (code === "middle") {
    if (emp.preference === "prefer_night") score += 30 * prefWeight;
  }
  // 连续休息天数越多越优先安排，避免后期无法截断
  score -= restRun * 30 * fairWeight;
  // 法定节假日必须上班时，优先安排 holiday 工作量少的员工
  if (isMustWorkHoliday && code !== "rest") {
    score += holidayWorkCount * 20;
  }
  if (preserveBonus > 0) {
    score -= preserveBonus;
  }
  return score;
}

/** 初始化求解上下文 */
function buildContext(input: SolverInput): SolverContext {
  const workConfigs: Map<ShiftCode, ShiftConfig> = new Map<ShiftCode, ShiftConfig>();
  for (const cfg of input.shiftConfigs) {
    workConfigs.set(cfg.code, cfg);
  }

    const legalHolidayRest: Set<string> = new Set<string>();
    const mustWorkHolidays: Set<string> = new Set<string>();
    const workdaySwaps: Set<string> = new Set<string>();
    const holidayWorkdays: Set<string> = new Set<string>();
    if (input.holidayContext) {
      for (const [date, h] of input.holidayContext.entries()) {
        if (h.type === "legal_holiday") {
          if (h.mustWork) {
            mustWorkHolidays.add(date);
            holidayWorkdays.add(date);
          } else {
            legalHolidayRest.add(date);
          }
        } else if (h.type === "workday_swap") {
          workdaySwaps.add(date);
          holidayWorkdays.add(date);
        }
      }
    }

  const prevDayShifts: Map<string, ShiftCode> = new Map<string, ShiftCode>();
  const prevWeekWork: Map<string, Map<string, number>> = new Map<string, Map<string, number>>();
  const prevLastDate: string | null =
    input.prev && input.prev.dates.length > 0
      ? input.prev.dates[input.prev.dates.length - 1]
      : null;

  const employeeById: Map<string, Employee> = new Map<string, Employee>();
  const employeeByNo: Map<string, Employee> = new Map<string, Employee>();
  const mentorMap: Map<string, string[]> = new Map<string, string[]>();
  for (const emp of input.employees) {
    employeeById.set(emp.id, emp);
    employeeByNo.set(emp.employeeNo, emp);
  }
  for (const emp of input.employees) {
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

  for (const emp of input.employees) {
    prevDayShifts.set(
      emp.id,
      prevLastDate !== null
        ? (input.prev?.matrix.get(emp.id)?.get(prevLastDate) ?? "rest")
        : "rest",
    );

    const weekMap: Map<string, number> = new Map<string, number>();
    if (input.prev) {
      for (const d of input.prev.dates) {
        const code: ShiftCode = input.prev.matrix.get(emp.id)?.get(d) ?? "rest";
        if (code === "rest") continue;
        const weekKey: string = getWeekMonday(d);
        weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + 1);
      }
    }
    prevWeekWork.set(emp.id, weekMap);
  }

    return {
      employees: input.employees,
      workConfigs,
      inputLocked: input.locked,
      legalHolidayRest,
      mustWorkHolidays,
      workdaySwaps,
      holidayWorkdays,
      dates: input.dates,
      dateWeekKeys: input.dates.map((d: string): string => getWeekMonday(d)),
      prevDayShifts,
      prevWeekWork,
      ruleConfig: input.ruleConfig ?? DEFAULT_RULE_CONFIG,
      holidayContext: input.holidayContext,
      nightRestDays:
        input.nightRestDays && input.nightRestDays >= 1
          ? input.nightRestDays
          : (input.ruleConfig?.nightRestDays ?? DEFAULT_RULE_CONFIG.nightRestDays),
      initialMatrix: input.initialMatrix ?? new Map<string, Map<string, ShiftCode>>(),
      changePenalty: input.changePenalty ?? 0,
      strategy: input.strategy ?? "balanced",
      employeeById,
      employeeByNo,
      mentorMap,
    };
}

/** 计算员工在某一自然周（含上月）的累计工作天数 */
function weekWorkCount(
  ctx: SolverContext,
  weekWork: Map<string, Map<string, number>>,
  empId: string,
  weekKey: string,
): number {
  const prev: number = ctx.prevWeekWork.get(empId)?.get(weekKey) ?? 0;
  return (weekWork.get(empId)?.get(weekKey) ?? 0) + prev;
}

/** 计算当前班表下某员工已排夜班数 */
function countNights(
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
  empId: string,
): number {
  let count: number = 0;
  for (const d of dates) {
    if (getShiftOf(matrix, empId, d) === "night") count += 1;
  }
  return count;
}

/** 计算若 dateIndex 日排 code，则 ending at dateIndex 的连续 code 天数是多少 */
function consecutiveRunBefore(
  matrix: Map<string, Map<string, ShiftCode>>,
  dates: string[],
  empId: string,
  dateIndex: number,
  code: ShiftCode,
): number {
  let run: number = 0;
  for (let i: number = dateIndex - 1; i >= 0; i--) {
    if (getShiftOf(matrix, empId, dates[i]) === code) {
      run += 1;
    } else {
      break;
    }
  }
  return run;
}

/** 单轮贪心构造；失败返回 null 并写入 failure.reason */
function constructOne(
  ctx: SolverContext,
  rnd: () => number,
  failure: { reason: string },
): Map<string, Map<string, ShiftCode>> | null {
  const { employees, dates, dateWeekKeys, workConfigs, nightRestDays, ruleConfig } = ctx;
  const matrix: Map<string, Map<string, ShiftCode>> = new Map();
  const nightCount: Map<string, number> = new Map<string, number>();
  const weekWork: Map<string, Map<string, number>> = new Map();
  const prevShift: Map<string, ShiftCode> = new Map<string, ShiftCode>();
  const forcedRest: Map<string, Set<string>> = new Map();
  const restRun: Map<string, number> = new Map<string, number>();
  const dayRun: Map<string, number> = new Map<string, number>();

  for (const emp of employees) {
    matrix.set(emp.id, new Map<string, ShiftCode>());
    nightCount.set(emp.id, 0);
    weekWork.set(emp.id, new Map<string, number>());
    forcedRest.set(emp.id, new Set<string>());
    const prevCode: ShiftCode = ctx.prevDayShifts.get(emp.id) ?? "rest";
    prevShift.set(emp.id, prevCode);
    restRun.set(emp.id, prevCode === "rest" ? 1 : 0);
    dayRun.set(emp.id, prevCode === "day" ? 1 : 0);
  }

  for (let di: number = 0; di < dates.length; di++) {
    const date: string = dates[di];
    const weekKey: string = dateWeekKeys[di];
    const assigned: Set<string> = new Set<string>();
    const dayAssignments: { empId: string; code: ShiftCode }[] = [];

    // 法定节假日默认休息：全员锁定 rest，不分配工作班次
    if (isLegalHolidayRest(date, ctx)) {
      for (const emp of employees) {
        if (!assigned.has(emp.id)) {
          assigned.add(emp.id);
        }
      }
      continue;
    }

    // 1. 按最小人数需求分配各工作班次（节假日上班日使用独立上下限）
    for (const code of CONSTRUCT_ORDER) {
      const cfg: ShiftConfig | undefined = workConfigs.get(code);
      if (!cfg) continue;
      const counts = effectiveCounts(cfg, date, ctx.holidayWorkdays);
      const need: number = counts.minCount ?? 0;
      if (need <= 0) continue;

      const candidates: { emp: Employee; score: number }[] = [];
      for (const emp of employees) {
        if (assigned.has(emp.id)) continue;
        if (isLocked(date, emp.id, ctx) || forcedRest.get(emp.id)?.has(date)) continue;
        if (!isTransitionAllowed(prevShift.get(emp.id) ?? "rest", code, ruleConfig.transitionMatrix)) continue;
        if (code === "night" && isSupervisorEmployee(emp) && isRuleEnabled(ruleConfig.rules, "R-P-06")) continue;
        if (code !== "rest" && hasHardFixedLeave(emp, date) && isRuleEnabled(ruleConfig.rules, "R-S-09")) continue;
        if (code === "night" && (nightCount.get(emp.id) ?? 0) >= ruleConfig.nightLimit) continue;
        if (weekWorkCount(ctx, weekWork, emp.id, weekKey) >= ruleConfig.weekWorkLimit) continue;
        // 连续白班上限：今天若再排 day，则连续 day 天数
        if (
          code === "day" &&
          (dayRun.get(emp.id) ?? 0) + 1 > ruleConfig.maxConsecutiveDayShifts
        )
          continue;
        // 若排夜班，需保证后续 nightRestDays 天可强制休息
        if (code === "night" && !canForceRestAfterNight(ctx, forcedRest, emp.id, di)) continue;

        const initialCode: ShiftCode = getShiftOf(ctx.initialMatrix, emp.id, date);
        candidates.push({
          emp,
          score: candidateScore(
            code,
            emp,
            nightCount.get(emp.id) ?? 0,
            restRun.get(emp.id) ?? 0,
            0,
            ctx.mustWorkHolidays.has(date),
            rnd,
            initialCode === code ? ctx.changePenalty * 2 : 0,
            ctx.strategy,
          ),
        });
      }

      if (candidates.length < need) {
        failure.reason = `${date} 无法满足${shiftName(cfg, code)}人数下限 ${need} 人`;
        return null;
      }
      const effectiveMax = counts.maxCount;

      candidates.sort((a, b): number => a.score - b.score);
      const selected = candidates.slice(0, need);
      if (
        cfg.requireSupervisor &&
        !selected.some((s) => isSupervisorOrMentorEmployee(s.emp))
      ) {
        const supervisorCandidate = candidates.find((c) =>
          isSupervisorOrMentorEmployee(c.emp),
        );
        if (supervisorCandidate) {
          const nonSupervisorIndex = selected.findIndex(
            (s) => !isSupervisorOrMentorEmployee(s.emp),
          );
          if (nonSupervisorIndex >= 0) {
            selected[nonSupervisorIndex] = supervisorCandidate;
          }
        }
      }
      for (const sel of selected) {
        const empId: string = sel.emp.id;
        assigned.add(empId);
        dayAssignments.push({ empId, code });
        matrix.get(empId)?.set(date, code);
      }
    }

    // 2. 强制上班：若某员工非锁定休息已连续 MAX 天，则今天必须上班，避免连续休息超限
    for (const emp of employees) {
      if (assigned.has(emp.id)) continue;
      if (isLocked(date, emp.id, ctx) || forcedRest.get(emp.id)?.has(date)) continue;

      const currentRun: number = restRun.get(emp.id) ?? 0;
      if (currentRun < ruleConfig.maxConsecutiveRestDays) continue;

      let placed: boolean = false;
      for (const code of FORCE_WORK_ORDER) {
        if (!isTransitionAllowed(prevShift.get(emp.id) ?? "rest", code, ruleConfig.transitionMatrix)) continue;
        if (code === "night" && isSupervisorEmployee(emp) && isRuleEnabled(ruleConfig.rules, "R-P-06")) continue;
        if (code !== "rest" && hasHardFixedLeave(emp, date) && isRuleEnabled(ruleConfig.rules, "R-S-09")) continue;
        if (code === "night" && (nightCount.get(emp.id) ?? 0) >= ruleConfig.nightLimit) continue;
        if (code === "night" && !canForceRestAfterNight(ctx, forcedRest, emp.id, di)) continue;
        if (
          code === "day" &&
          (dayRun.get(emp.id) ?? 0) + 1 > ruleConfig.maxConsecutiveDayShifts
        )
          continue;
        if (weekWorkCount(ctx, weekWork, emp.id, weekKey) >= ruleConfig.weekWorkLimit) continue;

        const cfg: ShiftConfig | undefined = workConfigs.get(code);
        if (!cfg) continue;
        // 检查人数上限（节假日上班日使用独立上限）
        const counts = effectiveCounts(cfg, date, ctx.holidayWorkdays);
        let currentCount: number = 0;
        for (const e of employees) {
          if (getShiftOf(matrix, e.id, date) === code) currentCount += 1;
        }
        if (counts.maxCount !== null && currentCount >= counts.maxCount) continue;

        assigned.add(emp.id);
        dayAssignments.push({ empId: emp.id, code });
        matrix.get(emp.id)?.set(date, code);
        placed = true;
        break;
      }

      if (!placed) {
        failure.reason = `${date} ${emp.name} 已连续休息 ${currentRun} 天，无法安排工作以截断休息（上限 ${ruleConfig.maxConsecutiveRestDays} 天）`;
        return null;
      }
    }

    // 3. 更新状态
    for (const item of dayAssignments) {
      if (item.code === "night") {
        nightCount.set(item.empId, (nightCount.get(item.empId) ?? 0) + 1);
        // 锁定夜班后 nightRestDays 天为休息
        const forced: Set<string> = forcedRest.get(item.empId) ?? new Set<string>();
        for (let j: number = 1; j <= nightRestDays; j++) {
          const nextIndex: number = di + j;
          if (nextIndex >= dates.length) break;
          const nextDate: string = dates[nextIndex];
          // 若次日为必须上班日或调休上班日，无法强制休息，但业务上允许上夜班
          if (ctx.mustWorkHolidays.has(nextDate) || ctx.workdaySwaps.has(nextDate)) {
            continue;
          }
          forced.add(nextDate);
        }
        forcedRest.set(item.empId, forced);
      }
      const empWeek: Map<string, number> | undefined = weekWork.get(item.empId);
      empWeek?.set(weekKey, (empWeek.get(weekKey) ?? 0) + 1);
      prevShift.set(item.empId, item.code);
      restRun.set(item.empId, 0);
      if (item.code === "day") {
        dayRun.set(item.empId, (dayRun.get(item.empId) ?? 0) + 1);
      } else {
        dayRun.set(item.empId, 0);
      }
    }
    for (const emp of employees) {
      if (!assigned.has(emp.id)) {
        const prevCode: ShiftCode = prevShift.get(emp.id) ?? "rest";
        if (isLocked(date, emp.id, ctx) || forcedRest.get(emp.id)?.has(date)) {
          // 锁定休息不计入连续休息
          restRun.set(emp.id, 0);
          dayRun.set(emp.id, 0);
          prevShift.set(emp.id, "rest");
        } else {
          prevShift.set(emp.id, "rest");
          restRun.set(emp.id, prevCode === "rest" ? (restRun.get(emp.id) ?? 0) + 1 : 1);
          dayRun.set(emp.id, 0);
        }
      }
    }
  }

  return matrix;
}

/** 检查在 dateIndex 排夜班后，后续 nightRestDays 天是否都能强制休息 */
function canForceRestAfterNight(
  ctx: SolverContext,
  forcedRest: Map<string, Set<string>>,
  empId: string,
  dateIndex: number,
): boolean {
  const { dates, nightRestDays } = ctx;
  for (let j: number = 1; j <= nightRestDays; j++) {
    const nextIndex: number = dateIndex + j;
    if (nextIndex >= dates.length) break;
    const nextDate: string = dates[nextIndex];
    if (ctx.inputLocked.get(empId)?.has(nextDate) === true) continue; // 已锁定休息也合法
    // 必须上班日或调休上班日无法强制休息，但允许安排夜班（次日正常上班）
    if (ctx.mustWorkHolidays.has(nextDate) || ctx.workdaySwaps.has(nextDate)) continue;
    // 若后续日期已经被该员工安排了工作班次，则不能再强制休息
    if (forcedRest.get(empId)?.has(nextDate)) continue;
  }
  return true;
}

/** 按规则权重计算软约束综合得分 */
function scoreMatrix(
  ctx: SolverContext,
  matrix: Map<string, Map<string, ShiftCode>>,
): SoftScoreResult {
  return scoreSoftRules({
    employees: ctx.employees,
    shiftConfigs: [...ctx.workConfigs.values()],
    matrix,
    dates: ctx.dates,
    holidayContext: ctx.holidayContext,
    ruleConfig: ctx.ruleConfig,
  });
}

/** 软成本：越小越好；在规则加权得分基础上叠加构造/搜索所需的内部成本 */
function softCost(
  ctx: SolverContext,
  matrix: Map<string, Map<string, ShiftCode>>,
): number {
  const { employees, dates } = ctx;
  let cost: number = 0;

  for (const emp of employees) {
    let restRun: number = 0;
    let dayRun: number = 0;

    for (let i: number = 0; i < dates.length; i++) {
      const date: string = dates[i];
      const code: ShiftCode = getShiftOf(matrix, emp.id, date);
      if (ctx.changePenalty > 0) {
        const initialCode: ShiftCode = getShiftOf(ctx.initialMatrix, emp.id, date);
        if (initialCode !== code) {
          cost += ctx.changePenalty;
        }
      }
      if (code === "rest") {
        dayRun = 0;
        if (!isLocked(dates[i], emp.id, ctx)) {
          restRun += 1;
          if (restRun > 1) cost += 5 + (restRun - 2) * 3;
        } else {
          restRun = 0;
        }
        // 法定节假日必须上班却休息，重罚
        if (ctx.mustWorkHolidays.has(dates[i])) {
          cost += 200;
        }
      } else {
        restRun = 0;
        if (code === "day") {
          dayRun += 1;
          if (dayRun > 2) cost += 3 + (dayRun - 3) * 3;
        } else {
          dayRun = 0;
        }
      }
    }
  }

  // 规则加权得分（成本越低越好，因此取负）
  const ruleScore: SoftScoreResult = scoreMatrix(ctx, matrix);
  cost -= ruleScore.total;

  return cost;
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

function hasHardFixedLeave(emp: Employee, date: string): boolean {
  const weekDay: number = dayjs(date).day();
  return (emp.fixedLeaves ?? []).some(
    (leave): boolean =>
      leave.enabled && leave.priority === "hard" && leave.weekDay === weekDay,
  );
}

function isRuleEnabled(rules: RuleItem[] | undefined, code: string): boolean {
  const list: RuleItem[] = rules ?? DEFAULT_RULE_ITEMS;
  return list.find((rule: RuleItem): boolean => rule.code === code)?.enabled ?? false;
}

/** 判断将员工在 dateIndex 日改为 code 后全部硬约束是否保持 */
function canAssign(
  ctx: SolverContext,
  matrix: Map<string, Map<string, ShiftCode>>,
  nightCount: Map<string, number>,
  weekWork: Map<string, Map<string, number>>,
  empId: string,
  dateIndex: number,
  code: ShiftCode,
): boolean {
  const { dates, dateWeekKeys, workConfigs, employees, nightRestDays, ruleConfig } = ctx;
  const date: string = dates[dateIndex];
  const current: ShiftCode = getShiftOf(matrix, empId, date);
  const emp: Employee | undefined = ctx.employeeById.get(empId);
  if (current === code) return true;

  // 锁定日不可改
  if (isLocked(date, empId, ctx)) return false;

  // R-P-06：主管/管理员不排夜班
  if (code === "night" && emp && isSupervisorEmployee(emp) && isRuleEnabled(ruleConfig.rules, "R-P-06")) {
    return false;
  }

  // R-S-09：hard 固定周期休假必须休息
  if (code !== "rest" && emp && hasHardFixedLeave(emp, date) && isRuleEnabled(ruleConfig.rules, "R-S-09")) {
    return false;
  }

  const prev: ShiftCode =
    dateIndex === 0
      ? (ctx.prevDayShifts.get(empId) ?? "rest")
      : getShiftOf(matrix, empId, dates[dateIndex - 1]);
  if (!isTransitionAllowed(prev, code, ruleConfig.transitionMatrix)) return false;

  if (dateIndex < dates.length - 1) {
    const next: ShiftCode = getShiftOf(matrix, empId, dates[dateIndex + 1]);
    if (!isTransitionAllowed(code, next, ruleConfig.transitionMatrix)) return false;
  }

    if (code === "night" && current !== "night") {
      if ((nightCount.get(empId) ?? 0) >= ruleConfig.nightLimit) return false;
      // 后续 nightRestDays 天需可休息
      for (let j: number = 1; j <= nightRestDays; j++) {
        const nextIndex: number = dateIndex + j;
        if (nextIndex >= dates.length) break;
        const nextDate: string = dates[nextIndex];
        if (ctx.inputLocked.get(empId)?.has(nextDate) === true) continue;
        if (ctx.mustWorkHolidays.has(nextDate)) return false;
        if (ctx.workdaySwaps.has(nextDate)) return false;
        const nextCode: ShiftCode = getShiftOf(matrix, empId, nextDate);
        if (nextCode !== "rest") return false;
      }
    }


  if (code !== "rest" && current === "rest") {
    const weekKey: string = dateWeekKeys[dateIndex];
    if (weekWorkCount(ctx, weekWork, empId, weekKey) >= ruleConfig.weekWorkLimit) return false;
  }

  // 连续休息硬约束
  if (code === "rest") {
    let run: number = 1;
    // 向前统计非锁定休息
    for (let i: number = dateIndex - 1; i >= 0; i--) {
      const d: string = dates[i];
      const c: ShiftCode = getShiftOf(matrix, empId, d);
      if (c !== "rest" || isLocked(d, empId, ctx)) break;
      run += 1;
    }
    // 向后统计非锁定休息
    for (let i: number = dateIndex + 1; i < dates.length; i++) {
      const d: string = dates[i];
      const c: ShiftCode = getShiftOf(matrix, empId, d);
      if (c !== "rest" || isLocked(d, empId, ctx)) break;
      run += 1;
    }
    if (run > ruleConfig.maxConsecutiveRestDays) return false;
  }

  // 连续白班硬约束
  if (code === "day") {
    let run: number = 1;
    for (let i: number = dateIndex - 1; i >= 0; i--) {
      const c: ShiftCode = getShiftOf(matrix, empId, dates[i]);
      if (c !== "day") break;
      run += 1;
    }
    for (let i: number = dateIndex + 1; i < dates.length; i++) {
      const c: ShiftCode = getShiftOf(matrix, empId, dates[i]);
      if (c !== "day") break;
      run += 1;
    }
    if (run > ruleConfig.maxConsecutiveDayShifts) return false;
  }

  const affected: Set<ShiftCode> = new Set<ShiftCode>();
  if (current !== "rest") affected.add(current);
  if (code !== "rest") affected.add(code);
  for (const c of affected) {
    const cfg: ShiftConfig | undefined = workConfigs.get(c);
    if (!cfg) continue;
    const counts = effectiveCounts(cfg, date, ctx.holidayWorkdays);
    let count: number = 0;
    for (const emp of employees) {
      if (getShiftOf(matrix, emp.id, date) === c) count += 1;
    }
    if (c === current) count -= 1;
    if (c === code) count += 1;
    if (counts.minCount !== null && count < counts.minCount) return false;
    if (counts.maxCount !== null && count > counts.maxCount) return false;
  }

  return true;
}

/** 局部搜索：随机单人单日换班，仅当硬约束保持且软成本下降时接受 */
function localSearch(
  ctx: SolverContext,
  matrix: Map<string, Map<string, ShiftCode>>,
  nightCount: Map<string, number>,
  weekWork: Map<string, Map<string, number>>,
  rnd: () => number,
  deadlineMs: number,
  maxIterations: number,
): void {
  const { employees, dates } = ctx;
  if (employees.length === 0 || dates.length === 0) return;

  const allCodes: ShiftCode[] = ["day", "middle", "night", "rest"];
  let currentCost: number = softCost(ctx, matrix);

  for (let iter: number = 0; iter < maxIterations; iter++) {
    if (Date.now() > deadlineMs) break;
    const emp: Employee = employees[Math.floor(rnd() * employees.length)];
    const dateIndex: number = Math.floor(rnd() * dates.length);
    const date: string = dates[dateIndex];
    if (isLocked(date, emp.id, ctx)) continue;

    const current: ShiftCode = getShiftOf(matrix, emp.id, date);
    const options: ShiftCode[] = allCodes.filter((c: ShiftCode): boolean => c !== current);
    const next: ShiftCode = options[Math.floor(rnd() * options.length)];
    if (!canAssign(ctx, matrix, nightCount, weekWork, emp.id, dateIndex, next)) continue;

    const row: Map<string, ShiftCode> | undefined = matrix.get(emp.id);
    if (!row) continue;

    // 应用变更
    if (next === "rest") {
      row.delete(date);
    } else {
      row.set(date, next);
    }

    // 更新计数
    const weekKey: string = ctx.dateWeekKeys[dateIndex];
    if (current === "night") {
      nightCount.set(emp.id, (nightCount.get(emp.id) ?? 0) - 1);
    }
    if (next === "night") {
      nightCount.set(emp.id, (nightCount.get(emp.id) ?? 0) + 1);
    }
    const empWeek: Map<string, number> | undefined = weekWork.get(emp.id);
    if (current !== "rest" && empWeek) {
      empWeek.set(weekKey, (empWeek.get(weekKey) ?? 0) - 1);
    }
    if (next !== "rest" && empWeek) {
      empWeek.set(weekKey, (empWeek.get(weekKey) ?? 0) + 1);
    }

    const newCost: number = softCost(ctx, matrix);
    if (newCost < currentCost) {
      currentCost = newCost;
    } else {
      // 回滚
      if (current === "rest") {
        row.delete(date);
      } else {
        row.set(date, current);
      }
      if (current === "night") {
        nightCount.set(emp.id, (nightCount.get(emp.id) ?? 0) + 1);
      }
      if (next === "night") {
        nightCount.set(emp.id, (nightCount.get(emp.id) ?? 0) - 1);
      }
      if (current !== "rest" && empWeek) {
        empWeek.set(weekKey, (empWeek.get(weekKey) ?? 0) + 1);
      }
      if (next !== "rest" && empWeek) {
        empWeek.set(weekKey, (empWeek.get(weekKey) ?? 0) - 1);
      }
    }
  }
}

/** 从矩阵计算夜班数与周工作数（用于局部搜索初始化） */
function computeState(
  ctx: SolverContext,
  matrix: Map<string, Map<string, ShiftCode>>,
): {
  nightCount: Map<string, number>;
  weekWork: Map<string, Map<string, number>>;
} {
  const nightCount: Map<string, number> = new Map<string, number>();
  const weekWork: Map<string, Map<string, number>> = new Map<string, Map<string, number>>();
  for (const emp of ctx.employees) {
    nightCount.set(emp.id, 0);
    weekWork.set(emp.id, new Map<string, number>());
  }
  for (let i: number = 0; i < ctx.dates.length; i++) {
    const date: string = ctx.dates[i];
    const weekKey: string = ctx.dateWeekKeys[i];
    for (const emp of ctx.employees) {
      const code: ShiftCode = getShiftOf(matrix, emp.id, date);
      if (code === "night") {
        nightCount.set(emp.id, (nightCount.get(emp.id) ?? 0) + 1);
      }
      if (code !== "rest") {
        const empWeek: Map<string, number> | undefined = weekWork.get(emp.id);
        empWeek?.set(weekKey, (empWeek.get(weekKey) ?? 0) + 1);
      }
    }
  }
  return { nightCount, weekWork };
}

/** 深度复制班次矩阵 */
function cloneMatrix(
  matrix: Map<string, Map<string, ShiftCode>>,
): Map<string, Map<string, ShiftCode>> {
  const clone: Map<string, Map<string, ShiftCode>> = new Map<
    string,
    Map<string, ShiftCode>
  >();
  for (const [empId, dayMap] of matrix) {
    clone.set(empId, new Map<string, ShiftCode>(dayMap));
  }
  return clone;
}

/** 主入口 */
export function solveSchedule(input: SolverInput): SolverResult {
  const ctx: SolverContext = buildContext(input);
  const startedAt: number = Date.now();
  const deadlineMs: number = startedAt + TOTAL_BUDGET_MS;
  const constructDeadlineMs: number = startedAt + CONSTRUCT_BUDGET_MS;
  const seed: number = input.baseSeed ?? startedAt;
  const topN: number = Math.max(1, Math.min(5, input.topN ?? 1));
  const failureReasons: string[] = [];

  const candidates: SolverCandidate[] = [];

  // 若提供现有班表且仍满足全部硬约束，作为初始候选
  if (input.initialMatrix && input.initialMatrix.size > 0) {
    const initialWarnings: ScheduleWarning[] = validateMonth(
      ctx.employees,
      input.shiftConfigs,
      input.initialMatrix,
      ctx.dates,
      {
        prev: input.prev,
        holidayContext: input.holidayContext,
        locked: input.locked,
        nightRestDays: ctx.nightRestDays,
        ruleConfig: ctx.ruleConfig,
      },
    );
    if (initialWarnings.length === 0) {
      const scoreResult: SoftScoreResult = scoreMatrix(ctx, input.initialMatrix);
      insertCandidate(candidates, {
        matrix: cloneMatrix(input.initialMatrix),
        score: scoreResult.total,
        ruleScores: scoreResult.scores,
      }, topN);
    }
  }

  for (let round: number = 0; round < MAX_CONSTRUCT_ROUNDS; round++) {
    if (Date.now() > constructDeadlineMs) break;
    const rnd: () => number = mulberry32(seed + round);
    const failure: { reason: string } = { reason: "" };
    const matrix: Map<string, Map<string, ShiftCode>> | null = constructOne(ctx, rnd, failure);
    if (!matrix) {
      if (failure.reason) failureReasons.push(failure.reason);
      continue;
    }

    // 构造成功通常已满足硬约束，仍做兜底校验
    const hardWarnings: ScheduleWarning[] = validateMonth(
      ctx.employees,
      input.shiftConfigs,
      matrix,
      ctx.dates,
      {
        prev: input.prev,
        holidayContext: input.holidayContext,
        locked: input.locked,
        nightRestDays: ctx.nightRestDays,
        ruleConfig: ctx.ruleConfig,
      },
    );
    if (hardWarnings.length > 0) continue;

    const scoreResult: SoftScoreResult = scoreMatrix(ctx, matrix);
    insertCandidate(candidates, {
      matrix,
      score: scoreResult.total,
      ruleScores: scoreResult.scores,
    }, topN);
  }

  if (candidates.length === 0) {
    const reason: string =
      failureReasons.length > 0
        ? [...new Set(failureReasons)].slice(0, 3).join("；")
        : "未能在给定约束下构造出合法排班";
    return { success: false, reason };
  }

  // 局部搜索软优化：为每个候选单独优化，均分剩余时间
  const searchDeadlineMs: number = deadlineMs;
  const iterationsPerCandidate: number = Math.floor(LOCAL_SEARCH_ITERATIONS / candidates.length);
  for (let i: number = 0; i < candidates.length; i++) {
    const candidate: SolverCandidate = candidates[i];
    if (Date.now() > searchDeadlineMs) break;
    const beforeMatrix: Map<string, Map<string, ShiftCode>> = cloneMatrix(candidate.matrix);
    const { nightCount, weekWork } = computeState(ctx, candidate.matrix);
    const rnd: () => number = mulberry32(seed + MAX_CONSTRUCT_ROUNDS + i);
    localSearch(ctx, candidate.matrix, nightCount, weekWork, rnd, searchDeadlineMs, iterationsPerCandidate);
    const afterWarnings: ScheduleWarning[] = validateMonth(
      ctx.employees,
      input.shiftConfigs,
      candidate.matrix,
      ctx.dates,
      {
        prev: input.prev,
        holidayContext: input.holidayContext,
        locked: input.locked,
        nightRestDays: ctx.nightRestDays,
        ruleConfig: ctx.ruleConfig,
      },
    );
    if (afterWarnings.length > 0) {
      candidate.matrix = beforeMatrix;
    }
    const afterScore: SoftScoreResult = scoreMatrix(ctx, candidate.matrix);
    candidate.score = afterScore.total;
    candidate.ruleScores = afterScore.scores;
  }

  // 按综合得分降序排序
  candidates.sort((a: SolverCandidate, b: SolverCandidate): number => b.score - a.score);

  // 最终硬约束校验兜底
  const validCandidates: SolverCandidate[] = [];
  for (const candidate of candidates) {
    const finalWarnings = validateMonth(
      ctx.employees,
      input.shiftConfigs,
      candidate.matrix,
      ctx.dates,
      {
        prev: input.prev,
        holidayContext: input.holidayContext,
        locked: input.locked,
        nightRestDays: ctx.nightRestDays,
        ruleConfig: ctx.ruleConfig,
      },
    );
    if (finalWarnings.length === 0) {
      validCandidates.push(candidate);
    }
  }

  if (validCandidates.length === 0) {
    return {
      success: false,
      reason: "局部搜索后所有候选均存在合规警告",
    };
  }

  return topN === 1
    ? { success: true, candidate: validCandidates[0] }
    : { success: true, candidates: validCandidates };
}

/** 将新候选按得分插入 topN 列表，保持降序 */
function insertCandidate(
  candidates: SolverCandidate[],
  candidate: SolverCandidate,
  topN: number,
): void {
  if (candidates.length === 0) {
    candidates.push(candidate);
    return;
  }
  // 降序：分数高在前
  let idx: number = candidates.length;
  for (let i: number = 0; i < candidates.length; i++) {
    if (candidate.score > candidates[i].score) {
      idx = i;
      break;
    }
  }
  candidates.splice(idx, 0, candidate);
  if (candidates.length > topN) {
    candidates.pop();
  }
}
