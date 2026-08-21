import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import dayjs from "dayjs";
import * as ExcelJS from "exceljs";
import type {
  ApplyProposalRequest,
  ApplyProposalResponse,
  CurrentIdentity,
  DailyShiftStat,
  DeleteImportedScheduleResponse,
  ExportScheduleCheckResponse,
  Employee,
  EmployeeNightCount,
  GenerateProposalsResponse,
  GenerateScheduleResponse,
  Holiday,
  HolidayListResponse,
  ImportHistoryRow,
  RuleConfig,
  ImportHistoryScheduleRequest,
  ImportHistoryScheduleResponse,
  ListImportHistoryResponse,
  MyScheduleDay,
  ScheduleImportHistoryRecord,
  MyScheduleDayStatus,
  MyScheduleResponse,
  OptimizeScheduleResponse,
  ProposalStrategy,
  PublishScheduleResponse,
  ScheduleCell,
  ScheduleChangeLog,
  ScheduleChangeLogListResponse,
  ScheduleOverviewResponse,
  ScheduleProposal,
  ScheduleProposalCell,
  ScheduleProposalMetrics,
  SchedulePublishInfo,
  ScheduleWarning,
  ShiftCode,
  ShiftConfig,
  UpdateScheduleCellRequest,
  UpdateScheduleCellResponse,
} from "@shared/api.interface";
import {
  employee,
  employeeFixedLeave,
  holiday,
  leaveRequest,
  scheduleChangeLog,
  scheduleImportHistory,
  schedulePublish,
} from "@server/database/schema";
import {
  ALL_SHIFT_CODES,
  WORKING_SHIFT_CODES,
  getMonthDates,
  getMultiMonthDates,
  getShiftOf,
  isCountOutOfRange,
  isHolidayDefaultRest,
  validateMonth,
  type HolidayContext,
  type PrevMonthContext,
  type ValidateOptions,
} from "./schedule-compliance";
import { buildScheduleWorkbook } from "./schedule-export";
import { solveSchedule, type SolverCandidate, type SolverResult } from "./schedule-solver";
import { RuleConfigService } from "./rule-config.service";
import {
  SCHEDULE_RESULT_REPOSITORY,
  type ScheduleResultRepository,
} from "./schedule-result.repository";
import { EmployeeService } from "../employee/employee.service";
import { ShiftConfigService } from "../shift-config/shift-config.service";

const MONTH_RE: RegExp = /^\d{4}-(0[1-9]|1[0-2])$/u;
const YEAR_RE: RegExp = /^\d{4}$/u;
const DATE_RE: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

interface EntryRow {
  scheduleDate: string;
  employeeId: string;
  shiftCode: string;
  source: string;
  taskId?: string | null;
  workLoadTags?: string[];
}

/** 上月下半旬班表数据：跨月上下文 + 原始条目（用于锁定前缀展示） */
type PrevPrefixData = PrevMonthContext & { entries: EntryRow[] };

@Injectable()
export class ScheduleService {
  private readonly logger: Logger = new Logger(ScheduleService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly ruleConfigService: RuleConfigService,
    @Inject(SCHEDULE_RESULT_REPOSITORY)
    private readonly scheduleResultRepository: ScheduleResultRepository,
    private readonly employeeService: EmployeeService,
    private readonly shiftConfigService: ShiftConfigService,
  ) {}

  /** 校验 month 参数格式 YYYY-MM */
  private assertMonth(month: string): string {
    if (typeof month !== "string" || !MONTH_RE.test(month)) {
      throw new BadRequestException("month 参数格式应为 YYYY-MM");
    }
    return month;
  }

  private assertYear(year: string): string {
    if (typeof year !== "string" || !YEAR_RE.test(year)) {
      throw new BadRequestException("year 参数格式应为 YYYY");
    }
    return year;
  }

  private async loadEmployees(department?: string): Promise<Employee[]> {
    const response = await this.employeeService.list(undefined, department);
    return response.items;
  }

  private async loadShiftConfigs(department?: string): Promise<ShiftConfig[]> {
    const response = await this.shiftConfigService.list(department);
    return response.items;
  }

  private async loadHolidaysInRange(first: string, last: string): Promise<HolidayContext> {
    const rows = await this.db
      .select()
      .from(holiday)
      .where(and(gte(holiday.date, first), lte(holiday.date, last)));
    const map: HolidayContext = new Map<string, Holiday>();
    for (const r of rows) {
      map.set(r.date, {
        date: r.date,
        type: r.type as Holiday["type"],
        name: r.name,
        mustWork: r.mustWork,
        weight: r.weight,
      });
    }
    return map;
  }

  private async loadRuleConfig(): Promise<RuleConfig> {
    return this.ruleConfigService.load();
  }

  private async loadFixedLeaves(
    department?: string,
  ): Promise<Map<string, Set<number>>> {
    const rows = await this.db
      .select()
      .from(employeeFixedLeave)
      .where(eq(employeeFixedLeave.enabled, true));

    let filtered = rows;
    if (department) {
      const employees: Employee[] = await this.loadEmployees(department);
      const ids: Set<string> = new Set<string>(
        employees.map((e: Employee): string => e.id),
      );
      filtered = rows.filter((row) => ids.has(row.employeeId));
    }

    const map: Map<string, Set<number>> = new Map();
    for (const row of filtered) {
      const set: Set<number> = map.get(row.employeeId) ?? new Set<number>();
      set.add(row.weekDay);
      map.set(row.employeeId, set);
    }
    return map;
  }

  private async buildLockedLeaves(
    first: string,
    last: string,
    department?: string,
  ): Promise<Map<string, Set<string>>> {
    const leaves = await this.db
      .select()
      .from(leaveRequest)
      .where(
        and(
          eq(leaveRequest.status, "approved"),
          lte(leaveRequest.startDate, last),
          gte(leaveRequest.endDate, first),
        ),
      );

    let filtered = leaves;
    if (department) {
      const employees: Employee[] = await this.loadEmployees(department);
      const ids: Set<string> = new Set<string>(
        employees.map((e: Employee): string => e.id),
      );
      filtered = leaves.filter((leave) => ids.has(leave.employeeId));
    }

    const locked: Map<string, Set<string>> = new Map();
    for (const leave of filtered) {
      const start: string = leave.startDate < first ? first : leave.startDate;
      const end: string = leave.endDate > last ? last : leave.endDate;
      const set: Set<string> = locked.get(leave.employeeId) ?? new Set<string>();
      let cursor: string = start;
      while (cursor <= end) {
        set.add(cursor);
        cursor = dayjs(cursor).add(1, "day").format("YYYY-MM-DD");
      }
      locked.set(leave.employeeId, set);
    }

    const fixedLeaves: Map<string, Set<number>> = await this.loadFixedLeaves(
      department,
    );
    let cursor: string = first;
    while (cursor <= last) {
      const weekDay: number = dayjs(cursor).day();
      for (const [employeeId, weekDays] of fixedLeaves) {
        if (weekDays.has(weekDay)) {
          const set: Set<string> = locked.get(employeeId) ?? new Set<string>();
          set.add(cursor);
          locked.set(employeeId, set);
        }
      }
      cursor = dayjs(cursor).add(1, "day").format("YYYY-MM-DD");
    }

    return locked;
  }

  private async loadEntriesInRange(
    first: string,
    last: string,
    department?: string,
  ): Promise<EntryRow[]> {
    const cells: ScheduleCell[] = await this.scheduleResultRepository.findByDateRange(
      first,
      last,
      { department },
    );
    const employees: Employee[] = await this.loadEmployees(department);
    const empByNo: Map<string, Employee> = new Map<string, Employee>(
      employees.map((e: Employee): [string, Employee] => [e.employeeNo, e]),
    );
    return cells.map((cell: ScheduleCell): EntryRow => {
      const emp: Employee | undefined = cell.employeeNo
        ? empByNo.get(cell.employeeNo)
        : undefined;
      return {
        scheduleDate: cell.date,
        employeeId: emp?.id ?? cell.employeeId,
        shiftCode: cell.shiftCode,
        source: cell.source ?? "generated",
        taskId: cell.taskId,
        workLoadTags: cell.workLoadTags,
      };
    });
  }

  private buildMatrix(entries: EntryRow[]): Map<string, Map<string, ShiftCode>> {
    const matrix: Map<string, Map<string, ShiftCode>> = new Map();
    for (const entry of entries) {
      const row: Map<string, ShiftCode> =
        matrix.get(entry.employeeId) ?? new Map<string, ShiftCode>();
      row.set(entry.scheduleDate, entry.shiftCode as ShiftCode);
      matrix.set(entry.employeeId, row);
    }
    return matrix;
  }

  /** 上月下半旬班表：锁定前缀展示与求解器/合规校验的跨月边界上下文 */
  private async loadPrevPrefix(
    month: string,
    department?: string,
  ): Promise<PrevPrefixData> {
    const ruleConfig: RuleConfig = await this.loadRuleConfig();
    const first: dayjs.Dayjs = dayjs(`${month}-01`);
    const prevFirst: dayjs.Dayjs = first.subtract(1, "month");
    const startDay: number = Math.min(
      ruleConfig.prevPrefixStartDay,
      prevFirst.daysInMonth(),
    );
    const start: string = prevFirst.date(startDay).format("YYYY-MM-DD");
    const end: string = first.subtract(1, "day").format("YYYY-MM-DD");
    const dates: string[] = [];
    let cursor: string = start;
    while (cursor <= end) {
      dates.push(cursor);
      cursor = dayjs(cursor).add(1, "day").format("YYYY-MM-DD");
    }
    const entries: EntryRow[] = await this.loadEntriesInRange(start, end, department);
    return { dates, entries, matrix: this.buildMatrix(entries) };
  }

  /** GET /api/schedules/overview */
  async getOverview(
    monthParam: string,
    department?: string,
  ): Promise<ScheduleOverviewResponse> {
    const month: string = this.assertMonth(monthParam);
    const dates: string[] = getMonthDates(month);
    const first: string = dates[0];
    const last: string = dates[dates.length - 1];

    const employees: Employee[] = await this.loadEmployees(department);
    const entries: EntryRow[] = await this.loadEntriesInRange(first, last, department);

    // 全员晚班统计（无记录时全员 count=0）
    const nightByEmp: Map<string, number> = new Map<string, number>();
    for (const entry of entries) {
      if (entry.shiftCode === "night") {
        nightByEmp.set(entry.employeeId, (nightByEmp.get(entry.employeeId) ?? 0) + 1);
      }
    }
    const nightCounts: EmployeeNightCount[] = employees.map(
      (emp: Employee): EmployeeNightCount => ({
        employeeId: emp.id,
        employeeName: emp.name,
        count: nightByEmp.get(emp.id) ?? 0,
      }),
    );

    const empById: Map<string, Employee> = new Map<string, Employee>(
      employees.map((e: Employee): [string, Employee] => [e.id, e]),
    );

    // 上月下半旬班表：锁定前缀展示 + 跨月合规上下文
    const prev: PrevPrefixData = await this.loadPrevPrefix(month, department);
    const prefixCells: ScheduleCell[] = prev.entries
      .map((entry: EntryRow): ScheduleCell => {
        const emp: Employee | undefined = empById.get(entry.employeeId);
        return {
          employeeId: entry.employeeId,
          employeeName: emp?.name ?? "",
          employeeNo: emp?.employeeNo ?? "",
          date: entry.scheduleDate,
          shiftCode: entry.shiftCode as ShiftCode,
        };
      })
      .sort(
        (a: ScheduleCell, b: ScheduleCell): number =>
          a.employeeNo === b.employeeNo
            ? a.date.localeCompare(b.date)
            : a.employeeNo.localeCompare(b.employeeNo),
      );

    if (entries.length === 0) {
      return {
        cells: [],
        prefixCells,
        dailyStats: [],
        nightCounts,
        warnings: [],
        department: department ?? "",
        conflicts: [],
      };
    }

    const configs: ShiftConfig[] = await this.loadShiftConfigs(department);
    const ruleConfig: RuleConfig = await this.loadRuleConfig();
    const holidayContext: HolidayContext = await this.loadHolidaysInRange(first, last);
    const lockedLeaves: Map<string, Set<string>> = await this.buildLockedLeaves(
      first,
      last,
      department,
    );

    const cells: ScheduleCell[] = entries
      .map((entry: EntryRow): ScheduleCell => {
        const emp: Employee | undefined = empById.get(entry.employeeId);
        return {
          employeeId: entry.employeeId,
          employeeName: emp?.name ?? "",
          employeeNo: emp?.employeeNo ?? "",
          date: entry.scheduleDate,
          shiftCode: entry.shiftCode as ShiftCode,
        };
      })
      .sort(
        (a: ScheduleCell, b: ScheduleCell): number =>
          a.employeeNo === b.employeeNo
            ? a.date.localeCompare(b.date)
            : a.employeeNo.localeCompare(b.employeeNo),
      );

    const matrix: Map<string, Map<string, ShiftCode>> = this.buildMatrix(entries);
    const configByCode: Map<ShiftCode, ShiftConfig> = new Map<ShiftCode, ShiftConfig>(
      configs.map((c: ShiftConfig): [ShiftCode, ShiftConfig] => [c.code, c]),
    );

    const dailyStats: DailyShiftStat[] = dates.map((date: string): DailyShiftStat => {
      let dayCount: number = 0;
      let middleCount: number = 0;
      let nightCount: number = 0;
      for (const emp of employees) {
        const code: ShiftCode = matrix.get(emp.id)?.get(date) ?? "rest";
        if (code === "day") dayCount += 1;
        else if (code === "middle") middleCount += 1;
        else if (code === "night") nightCount += 1;
      }
      const overLimit: boolean =
        isCountOutOfRange(dayCount, configByCode.get("day")) ||
        isCountOutOfRange(middleCount, configByCode.get("middle")) ||
        isCountOutOfRange(nightCount, configByCode.get("night"));
      return { date, dayCount, middleCount, nightCount, overLimit };
    });

    const validateOptions: ValidateOptions = {
      prev,
      holidayContext,
      locked: lockedLeaves,
      nightRestDays: ruleConfig.nightRestDays,
      ruleConfig,
    };
    const warnings: ScheduleWarning[] = validateMonth(
      employees,
      configs,
      matrix,
      dates,
      validateOptions,
    );
    return {
      cells,
      prefixCells,
      dailyStats,
      nightCounts,
      warnings,
      department: department ?? "",
      conflicts: [],
    };
  }

  /** POST /api/schedules/generate */
  async generate(request: {
    month?: string;
    months?: string[];
    department?: string;
  }): Promise<GenerateScheduleResponse> {
    const startedAt: number = Date.now();
    const targetMonths: string[] = this.resolveTargetMonths(request);
    const dates: string[] = getMultiMonthDates(targetMonths);
    if (dates.length === 0) {
      return { success: false, message: "目标月份无效" };
    }
    const first: string = dates[0];
    const last: string = dates[dates.length - 1];
    const department: string | undefined = request.department;

    const employees: Employee[] = await this.loadEmployees(department);
    if (employees.length === 0) {
      return { success: false, message: "暂无员工，请先维护员工信息" };
    }
    const empById: Map<string, Employee> = new Map<string, Employee>(
      employees.map((e: Employee): [string, Employee] => [e.id, e]),
    );
    const configs: ShiftConfig[] = await this.loadShiftConfigs(department);
    const ruleConfig: RuleConfig = await this.loadRuleConfig();
    const holidayContext: HolidayContext = await this.loadHolidaysInRange(first, last);

    // 已批准且与目标区间有交集的排休 → 锁定 rest
    const leaves = await this.db
      .select()
      .from(leaveRequest)
      .where(
        and(
          eq(leaveRequest.status, "approved"),
          lte(leaveRequest.startDate, last),
          gte(leaveRequest.endDate, first),
        ),
      );
    const locked: Map<string, Set<string>> = new Map();
    for (const leave of leaves) {
      const start: string = leave.startDate < first ? first : leave.startDate;
      const end: string = leave.endDate > last ? last : leave.endDate;
      const set: Set<string> = locked.get(leave.employeeId) ?? new Set<string>();
      let cursor: string = start;
      while (cursor <= end) {
        set.add(cursor);
        cursor = dayjs(cursor).add(1, "day").format("YYYY-MM-DD");
      }
      locked.set(leave.employeeId, set);
    }

    // 导入的历史班表已锁定，不允许一键生成覆盖
    const importedCount: number = await this.scheduleResultRepository.countImported(
      first,
      last,
      department,
    );
    if (importedCount > 0) {
      throw new ConflictException(
        "目标月份包含导入的历史班表（已锁定），请先删除对应月份导入数据后再一键生成",
      );
    }

    // 首月的前一个月下半旬作为跨月边界上下文
    const prev: PrevPrefixData = await this.loadPrevPrefix(targetMonths[0], department);

    // 加载现有排班作为初始解，提升构造成功率
    const existingEntries: EntryRow[] = await this.loadEntriesInRange(
      first,
      last,
      department,
    );
    const existingMatrix: Map<string, Map<string, ShiftCode>> =
      this.buildMatrix(existingEntries);

    const strategies: ProposalStrategy[] = ["balanced", "preference", "fair"];
    const timeSeed: number = Math.floor(Date.now() / 1000);
    const seedByStrategy: Record<ProposalStrategy, number> = {
      balanced: timeSeed + 1,
      preference: timeSeed + 2,
      fair: timeSeed + 3,
    };
    interface SolveCandidate {
      matrix: Map<string, Map<string, ShiftCode>>;
      score: number;
    }
    let bestCandidate: SolveCandidate | null = null;
    const failureReasons: string[] = [];

    for (const strategy of strategies) {
      const result: SolverResult = solveSchedule({
        employees,
        shiftConfigs: configs,
        locked,
        dates,
        months: targetMonths,
        prev,
        holidayContext,
        nightRestDays: ruleConfig.nightRestDays,
        ruleConfig,
        strategy,
        baseSeed: seedByStrategy[strategy],
        topN: 3,
        initialMatrix: existingMatrix,
        department,
      });
      if (result.success === false) {
        failureReasons.push(result.reason);
        continue;
      }
      const list: SolverCandidate[] =
        "candidate" in result ? [result.candidate] : result.candidates;
      for (const item of list) {
        if (!bestCandidate || item.score > bestCandidate.score) {
          bestCandidate = { matrix: item.matrix, score: item.score };
        }
      }
    }

    if (!bestCandidate) {
      const reason: string =
        failureReasons.length > 0
          ? [...new Set(failureReasons)].slice(0, 3).join("；")
          : "未能在给定约束下构造出合法排班";
      this.logger.log(
        `排班生成失败 months=${targetMonths.join(",")} reason=${reason} cost=${Date.now() - startedAt}ms`,
      );
      return { success: false, message: reason };
    }

    const resultMatrix: Map<string, Map<string, ShiftCode>> = bestCandidate.matrix;

    // 仅持久化工作班次（rest 不落库，缺失即视为休班）
    const cellsByMonth: Map<string, ScheduleCell[]> = new Map<
      string,
      ScheduleCell[]
    >();
    for (const [empId, dayMap] of resultMatrix) {
      for (const [date, code] of dayMap) {
        if (code !== "rest") {
          const month: string = date.slice(0, 7);
          const list: ScheduleCell[] = cellsByMonth.get(month) ?? [];
          const emp: Employee | undefined = empById.get(empId);
          list.push({
            employeeId: empId,
            employeeName: emp?.name ?? "",
            employeeNo: emp?.employeeNo ?? "",
            date,
            shiftCode: code,
            source: "generated",
          });
          cellsByMonth.set(month, list);
        }
      }
    }

    for (const month of targetMonths) {
      const cells: ScheduleCell[] = cellsByMonth.get(month) ?? [];
      await this.scheduleResultRepository.replaceMonth(month, cells, department ?? "");
      await this.markDraft(month);
    }
    const totalRows: number = Array.from(cellsByMonth.values()).reduce(
      (sum: number, cells: ScheduleCell[]) => sum + cells.length,
      0,
    );
    this.logger.log(
      `排班生成完成 months=${targetMonths.join(",")} 插入 ${totalRows} 条 cost=${Date.now() - startedAt}ms`,
    );
    return {
      success: true,
      message: `排班完成，覆盖 ${targetMonths.join("、")} 共 ${totalRows} 条班次`,
    };
  }

  /** GET /api/schedules/holidays?month=YYYY-MM */
  async getHolidays(monthParam: string): Promise<HolidayListResponse> {
    const month: string = this.assertMonth(monthParam);
    const dates: string[] = getMonthDates(month);
    const holidayContext: HolidayContext = await this.loadHolidaysInRange(
      dates[0],
      dates[dates.length - 1],
    );
    const items: Holiday[] = Array.from(holidayContext.values()).sort(
      (a: Holiday, b: Holiday): number => a.date.localeCompare(b.date),
    );
    return { items };
  }

  /** GET /api/schedules/holidays/year?year=YYYY（管理员） */
  async getHolidaysByYear(yearParam: string): Promise<HolidayListResponse> {
    const year: string = this.assertYear(yearParam);
    const first: string = `${year}-01-01`;
    const last: string = `${year}-12-31`;
    const holidayContext: HolidayContext = await this.loadHolidaysInRange(
      first,
      last,
    );
    const items: Holiday[] = Array.from(holidayContext.values()).sort(
      (a: Holiday, b: Holiday): number => a.date.localeCompare(b.date),
    );
    return { items };
  }

  /** POST /api/schedules/proposals */
  async generateProposals(
    monthParam: string,
    department?: string,
  ): Promise<GenerateProposalsResponse> {
    const month: string = this.assertMonth(monthParam);
    const dates: string[] = getMonthDates(month);
    const first: string = dates[0];
    const last: string = dates[dates.length - 1];

    const employees: Employee[] = await this.loadEmployees(department);
    if (employees.length === 0) {
      throw new BadRequestException("暂无员工，请先维护员工信息");
    }
    const configs: ShiftConfig[] = await this.loadShiftConfigs(department);
    const ruleConfig: RuleConfig = await this.loadRuleConfig();
    const holidayContext: HolidayContext = await this.loadHolidaysInRange(
      first,
      last,
    );
    const locked: Map<string, Set<string>> = await this.buildLockedLeaves(
      first,
      last,
      department,
    );
    const prev: PrevPrefixData = await this.loadPrevPrefix(month, department);
    const existingEntries: EntryRow[] = await this.loadEntriesInRange(
      first,
      last,
      department,
    );
    const existingMatrix: Map<string, Map<string, ShiftCode>> =
      this.buildMatrix(existingEntries);

    const strategies: ProposalStrategy[] = ["balanced", "preference", "fair"];
    const proposalSeed: number = Math.floor(Date.now() / 1000);
    const seedByStrategy: Record<ProposalStrategy, number> = {
      balanced: proposalSeed + 1,
      preference: proposalSeed + 2,
      fair: proposalSeed + 3,
    };
    const meta: Record<
      ProposalStrategy,
      { name: string; description: string }
    > = {
      balanced: {
        name: "均衡方案",
        description: "在偏好满足、公平性与合规之间取平衡",
      },
      preference: {
        name: "偏好优先",
        description: "优先安排员工班次偏好，提升员工满意度",
      },
      fair: {
        name: "公平优先",
        description: "尽量压低单人最大晚班数与节假日工作量差异",
      },
    };

    interface RawCandidate {
      strategy: ProposalStrategy;
      matrix: Map<string, Map<string, ShiftCode>>;
      score: number;
      ruleScores: import("@shared/api.interface").RuleScore[];
    }

    const allCandidates: RawCandidate[] = [];

    for (const strategy of strategies) {
      const result: SolverResult = solveSchedule({
        employees,
        shiftConfigs: configs,
        locked,
        dates,
        months: [month],
        prev,
        holidayContext,
        nightRestDays: ruleConfig.nightRestDays,
        ruleConfig,
        strategy,
        baseSeed: seedByStrategy[strategy],
        topN: 3,
        initialMatrix: existingMatrix,
        department,
      });
      if (result.success === false) {
        this.logger.warn(
          `智能排班策略 ${strategy} 失败: ${result.reason}`,
        );
        continue;
      }

      const list: SolverCandidate[] =
        "candidate" in result ? [result.candidate] : result.candidates;
      for (const item of list) {
        allCandidates.push({
          strategy,
          matrix: item.matrix,
          score: item.score,
          ruleScores: item.ruleScores,
        });
      }
    }

    allCandidates.sort((a: RawCandidate, b: RawCandidate): number => b.score - a.score);
    const topCandidates: RawCandidate[] = allCandidates.slice(0, 3);

    const proposals: ScheduleProposal[] = [];
    for (const candidate of topCandidates) {
      const warnings: ScheduleWarning[] = validateMonth(
        employees,
        configs,
        candidate.matrix,
        dates,
        {
          prev,
          holidayContext,
          locked,
          nightRestDays: ruleConfig.nightRestDays,
          ruleConfig,
        },
      );
      const metrics: ScheduleProposalMetrics = this.computeProposalMetrics(
        candidate.matrix,
        employees,
        dates,
        existingMatrix,
        warnings,
      );
      const cells: ScheduleProposalCell[] = [];
      for (const [empId, dayMap] of candidate.matrix) {
        for (const [date, code] of dayMap) {
          if (code !== "rest") {
            cells.push({ employeeId: empId, date, shiftCode: code });
          }
        }
      }

      proposals.push({
        strategy: candidate.strategy,
        ...meta[candidate.strategy],
        warnings,
        metrics,
        cells,
        totalScore: candidate.score,
        ruleScores: candidate.ruleScores,
      });
    }

    return { month, department: department ?? "", proposals };
  }

  /** 计算候选方案指标 */
  private computeProposalMetrics(
    matrix: Map<string, Map<string, ShiftCode>>,
    employees: Employee[],
    dates: string[],
    existingMatrix: Map<string, Map<string, ShiftCode>>,
    warnings: ScheduleWarning[],
  ): ScheduleProposalMetrics {
    let totalWorkingShifts: number = 0;
    let preferenceHits: number = 0;
    let totalNights: number = 0;
    let maxNights: number = 0;
    let changeCount: number | null = 0;
    let hasExisting: boolean = false;

    for (const emp of employees) {
      let nights: number = 0;
      let hasAnyExisting: boolean = false;
      for (const date of dates) {
        const code: ShiftCode = getShiftOf(matrix, emp.id, date);
        const existing: ShiftCode = getShiftOf(existingMatrix, emp.id, date);
        if (code !== "rest") {
          totalWorkingShifts += 1;
          if (code === "night") nights += 1;
          if (emp.preference === "prefer_day" && code === "day") {
            preferenceHits += 1;
          } else if (emp.preference === "prefer_night" && code === "night") {
            preferenceHits += 1;
          }
        }
        if (existing !== "rest") {
          hasExisting = true;
          hasAnyExisting = true;
        }
        if (code !== existing) {
          changeCount = (changeCount ?? 0) + 1;
        }
      }
      totalNights += nights;
      if (nights > maxNights) maxNights = nights;
      if (!hasAnyExisting && nights === 0) {
        // 该员工没有任何历史记录且本月全休：基本不可能，但兼容
      }
    }

    const avgNightsPerEmployee: number =
      employees.length > 0 ? totalNights / employees.length : 0;

    return {
      warningCount: warnings.length,
      preferenceHits,
      totalWorkingShifts,
      avgNightsPerEmployee: Math.round(avgNightsPerEmployee * 100) / 100,
      maxNightsPerEmployee: maxNights,
      changeCount: hasExisting ? changeCount : null,
    };
  }

  /** POST /api/schedules/apply-proposal */
  async applyProposal(
    body: ApplyProposalRequest,
    actor: { userId: string; userName: string },
  ): Promise<ApplyProposalResponse> {
    const month: string = this.assertMonth(body.month);
    const dates: string[] = getMonthDates(month);
    const first: string = dates[0];
    const last: string = dates[dates.length - 1];
    const department: string = body.department;

    const importedCount: number = await this.scheduleResultRepository.countImported(
      first,
      last,
      department,
    );
    if (importedCount > 0) {
      throw new ConflictException(
        "目标月份包含导入的历史班表（已锁定），请先删除对应月份导入数据后再应用方案",
      );
    }

    const employees: Employee[] = await this.loadEmployees(department);
    const empById: Map<string, Employee> = new Map<string, Employee>(
      employees.map((e: Employee): [string, Employee] => [e.id, e]),
    );

    const dateSet: Set<string> = new Set<string>(dates);
    const cells: ScheduleCell[] = body.cells
      .filter(
        (c: ScheduleProposalCell): boolean =>
          c.shiftCode !== "rest" && dateSet.has(c.date),
      )
      .map(
        (c: ScheduleProposalCell): ScheduleCell => {
          const emp: Employee | undefined = empById.get(c.employeeId);
          return {
            employeeId: c.employeeId,
            employeeName: emp?.name ?? "",
            employeeNo: emp?.employeeNo ?? "",
            date: c.date,
            shiftCode: c.shiftCode,
            source: "generated",
          };
        },
      );

    await this.scheduleResultRepository.replaceMonth(month, cells, department);

    await this.markDraft(month);
    const warnings: ScheduleWarning[] = await this.computeMonthWarnings(
      month,
      department,
    );
    return { success: true, warnings, changedCount: cells.length };
  }

  private resolveTargetMonths(request: { month?: string; months?: string[] }): string[] {
    if (Array.isArray(request.months) && request.months.length > 0) {
      const months: string[] = request.months
        .filter((m): m is string => typeof m === "string" && MONTH_RE.test(m))
        .sort();
      if (months.length === 0) {
        throw new BadRequestException("months 中无有效月份，格式应为 YYYY-MM");
      }
      return months;
    }
    if (request.month) {
      return [this.assertMonth(request.month)];
    }
    throw new BadRequestException("缺少 month 或 months 参数");
  }

  /** POST /api/schedules/cells */
  async updateCell(
    body: UpdateScheduleCellRequest,
    actor: { userId: string; userName: string },
  ): Promise<UpdateScheduleCellResponse> {
    const employeeId: string | undefined = body?.employeeId;
    const date: string | undefined = body?.date;
    const shiftCode: ShiftCode | undefined = body?.shiftCode;
    const department: string | undefined = body?.department;

    if (!employeeId) throw new BadRequestException("缺少 employeeId 参数");
    if (typeof date !== "string" || !DATE_RE.test(date)) {
      throw new BadRequestException("date 参数格式应为 YYYY-MM-DD");
    }
    if (!shiftCode || !ALL_SHIFT_CODES.includes(shiftCode)) {
      throw new BadRequestException("shiftCode 参数非法，应为 day/middle/night/rest");
    }

    const employees: Employee[] = await this.loadEmployees(department);
    const emp: Employee | undefined = employees.find(
      (e: Employee): boolean => e.id === employeeId,
    );
    if (!emp) throw new NotFoundException("员工不存在");

    const approvedLeaves = await this.db
      .select({ id: leaveRequest.id })
      .from(leaveRequest)
      .where(
        and(
          eq(leaveRequest.employeeId, employeeId),
          eq(leaveRequest.status, "approved"),
          lte(leaveRequest.startDate, date),
          gte(leaveRequest.endDate, date),
        ),
      )
      .limit(1);
    if (approvedLeaves.length > 0) {
      throw new BadRequestException(
        "该员工在目标日期已审批排休，不可修改班次",
      );
    }

    const month: string = date.slice(0, 7);
    if (body?.preview === true) {
      const previewWarnings: ScheduleWarning[] =
        await this.computeMonthWarnings(month, department, {
          employeeId,
          date,
          shiftCode,
        });
      return { success: true, warnings: previewWarnings };
    }

    const existingRows: EntryRow[] = await this.loadEntriesInRange(
      date,
      date,
      department,
    );
    const existing: EntryRow | undefined = existingRows.find(
      (r: EntryRow): boolean => r.employeeId === employeeId,
    );
    const oldShiftCode: ShiftCode | null = existing
      ? (existing.shiftCode as ShiftCode)
      : null;

    await this.scheduleResultRepository.upsertCell(
      {
        employeeId,
        employeeName: emp.name,
        employeeNo: emp.employeeNo,
        date,
        shiftCode,
        locked: body?.locked,
      },
      "manual",
      department ?? "",
    );

    await this.logScheduleChange({
      month,
      employeeId,
      scheduleDate: date,
      oldShiftCode,
      newShiftCode: shiftCode,
      changeType: "manual",
      changedBy: actor.userId,
    });

    await this.markDraft(month);
    const warnings: ScheduleWarning[] = await this.computeMonthWarnings(
      month,
      department,
    );
    return { success: true, warnings };
  }

  /** 计算指定月份合规警告，支持模拟一次单元格调整 */
  private async computeMonthWarnings(
    month: string,
    department?: string,
    override?: { employeeId: string; date: string; shiftCode: ShiftCode },
  ): Promise<ScheduleWarning[]> {
    const dates: string[] = getMonthDates(month);
    const employees: Employee[] = await this.loadEmployees(department);
    const configs: ShiftConfig[] = await this.loadShiftConfigs(department);
    const entries: EntryRow[] = await this.loadEntriesInRange(
      dates[0],
      dates[dates.length - 1],
      department,
    );
    const prev: PrevPrefixData = await this.loadPrevPrefix(month, department);
    const matrix: Map<string, Map<string, ShiftCode>> =
      this.buildMatrix(entries);
    if (override) {
      let inner: Map<string, ShiftCode> | undefined = matrix.get(
        override.employeeId,
      );
      if (!inner) {
        inner = new Map<string, ShiftCode>();
        matrix.set(override.employeeId, inner);
      }
      inner.set(override.date, override.shiftCode);
    }
    const ruleConfig: RuleConfig = await this.loadRuleConfig();
    const holidayContext: HolidayContext = await this.loadHolidaysInRange(
      dates[0],
      dates[dates.length - 1],
    );
    const lockedLeaves: Map<string, Set<string>> = await this.buildLockedLeaves(
      dates[0],
      dates[dates.length - 1],
      department,
    );
    const validateOptions: ValidateOptions = {
      prev,
      holidayContext,
      locked: lockedLeaves,
      nightRestDays: ruleConfig.nightRestDays,
      ruleConfig,
    };
    return validateMonth(employees, configs, matrix, dates, validateOptions);
  }

  /** POST /api/schedules/optimize：基于现有班表做最小变动重排 */
  async optimize(
    request: { month?: string; months?: string[]; department?: string },
    actor: { userId: string; userName: string },
  ): Promise<OptimizeScheduleResponse> {
    const startedAt: number = Date.now();
    const targetMonths: string[] = this.resolveTargetMonths(request);
    const dates: string[] = getMultiMonthDates(targetMonths);
    if (dates.length === 0) {
      return { success: false, message: "目标月份无效", changedCount: 0 };
    }
    const first: string = dates[0];
    const last: string = dates[dates.length - 1];
    const department: string | undefined = request.department;

    const employees: Employee[] = await this.loadEmployees(department);
    if (employees.length === 0) {
      return {
        success: false,
        message: "暂无员工，请先维护员工信息",
        changedCount: 0,
      };
    }
    const empById: Map<string, Employee> = new Map<string, Employee>(
      employees.map((e: Employee): [string, Employee] => [e.id, e]),
    );

    // 导入的历史班表已锁定，不允许优化覆盖
    const importedCount: number = await this.scheduleResultRepository.countImported(
      first,
      last,
      department,
    );
    if (importedCount > 0) {
      throw new ConflictException(
        "目标月份包含导入的历史班表（已锁定），请先删除对应月份导入数据后再优化",
      );
    }

    const configs: ShiftConfig[] = await this.loadShiftConfigs(department);
    const ruleConfig: RuleConfig = await this.loadRuleConfig();
    const holidayContext: HolidayContext = await this.loadHolidaysInRange(first, last);
    const lockedLeaves: Map<string, Set<string>> = await this.buildLockedLeaves(
      first,
      last,
      department,
    );
    const prev: PrevPrefixData = await this.loadPrevPrefix(targetMonths[0], department);

    const existingEntries: EntryRow[] = await this.loadEntriesInRange(
      first,
      last,
      department,
    );
    const initialMatrix: Map<string, Map<string, ShiftCode>> =
      this.buildMatrix(existingEntries);

    const result = solveSchedule({
      employees,
      shiftConfigs: configs,
      locked: lockedLeaves,
      dates,
      months: targetMonths,
      prev,
      holidayContext,
      nightRestDays: ruleConfig.nightRestDays,
      ruleConfig,
      initialMatrix,
      changePenalty: 50,
      department,
    });

    if (result.success === false) {
      this.logger.log(
        `排班优化失败 months=${targetMonths.join(",")} reason=${result.reason}`,
      );
      return { success: false, message: result.reason, changedCount: 0 };
    }

    const existingByKey: Map<string, ShiftCode> = new Map<string, ShiftCode>();
    for (const entry of existingEntries) {
      existingByKey.set(`${entry.employeeId}|${entry.scheduleDate}`, entry.shiftCode as ShiftCode);
    }

    const cellsByMonth: Map<string, ScheduleCell[]> = new Map<
      string,
      ScheduleCell[]
    >();
    const changeLogs: Omit<ScheduleChangeLog, "id" | "employeeName" | "changedAt">[] = [];

    const resultMatrix: Map<string, Map<string, ShiftCode>> =
      "candidate" in result
        ? result.candidate.matrix
        : result.candidates[0]?.matrix ?? new Map<string, Map<string, ShiftCode>>();

    for (const emp of employees) {
      const dayMap: Map<string, ShiftCode> | undefined = resultMatrix.get(emp.id);
      for (const date of dates) {
        const newCode: ShiftCode = dayMap?.get(date) ?? "rest";
        const key: string = `${emp.id}|${date}`;
        const oldCode: ShiftCode | undefined = existingByKey.get(key);
        if (oldCode === newCode) continue;
        if (oldCode === undefined && newCode === "rest") continue;

        const month: string = date.slice(0, 7);
        const list: ScheduleCell[] = cellsByMonth.get(month) ?? [];
        list.push({
          employeeId: emp.id,
          employeeName: emp.name,
          employeeNo: emp.employeeNo,
          date,
          shiftCode: newCode,
          source: "generated",
        });
        cellsByMonth.set(month, list);

        changeLogs.push({
          month,
          employeeId: emp.id,
          scheduleDate: date,
          oldShiftCode: oldCode ?? null,
          newShiftCode: newCode,
          changeType: "optimize",
          changedBy: actor.userId,
        });
      }
    }

    for (const month of targetMonths) {
      const cells: ScheduleCell[] = cellsByMonth.get(month) ?? [];
      const monthDates: string[] = getMonthDates(month);
      const monthExisting: EntryRow[] = await this.loadEntriesInRange(
        monthDates[0],
        monthDates[monthDates.length - 1],
        department,
      );
      const monthNewCells: ScheduleCell[] = [];
      const keptKeys: Set<string> = new Set<string>(
        cells.map((c: ScheduleCell) => `${c.employeeId}|${c.date}`),
      );
      for (const entry of monthExisting) {
        const key: string = `${entry.employeeId}|${entry.scheduleDate}`;
        if (!keptKeys.has(key)) continue;
        const emp: Employee | undefined = empById.get(entry.employeeId);
        monthNewCells.push({
          employeeId: entry.employeeId,
          employeeName: emp?.name ?? "",
          employeeNo: emp?.employeeNo ?? "",
          date: entry.scheduleDate,
          shiftCode: entry.shiftCode as ShiftCode,
          source: "generated",
          taskId: entry.taskId,
          workLoadTags: entry.workLoadTags,
        });
      }
      monthNewCells.push(...cells);
      await this.scheduleResultRepository.replaceMonth(
        month,
        monthNewCells,
        department ?? "",
      );
      await this.markDraft(month);
    }

    if (changeLogs.length > 0) {
      await this.db.transaction(async (tx) => {
        for (const log of changeLogs) {
          await tx.insert(scheduleChangeLog).values({
            month: log.month,
            employeeId: log.employeeId,
            scheduleDate: log.scheduleDate,
            oldShiftCode: log.oldShiftCode,
            newShiftCode: log.newShiftCode,
            changeType: log.changeType,
            createdBy: sql`ROW(${log.changedBy})::user_profile`,
          });
        }
      });
    }

    this.logger.log(
      `排班优化完成 months=${targetMonths.join(",")} changed=${changeLogs.length} cost=${Date.now() - startedAt}ms`,
    );
    return {
      success: true,
      message: `优化完成，共变动 ${changeLogs.length} 个单元格`,
      changedCount: changeLogs.length,
    };
  }

  /** 通用变更日志写入 */
  private async logScheduleChange(
    payload: {
      month: string;
      employeeId: string;
      scheduleDate: string;
      oldShiftCode: ShiftCode | null;
      newShiftCode: ShiftCode;
      changeType: "manual" | "optimize";
      changedBy: string;
    },
  ): Promise<void> {
    await this.db.insert(scheduleChangeLog).values({
      month: payload.month,
      employeeId: payload.employeeId,
      scheduleDate: payload.scheduleDate,
      oldShiftCode: payload.oldShiftCode,
      newShiftCode: payload.newShiftCode,
      changeType: payload.changeType,
      createdBy: sql`ROW(${payload.changedBy})::user_profile`,
    });
  }

  /** GET /api/schedules/change-logs：查询某月变更审计日志 */
  async listChangeLogs(
    monthParam: string,
    department?: string,
  ): Promise<ScheduleChangeLogListResponse> {
    const month: string = this.assertMonth(monthParam);
    const rows = await this.db
      .select({
        id: scheduleChangeLog.id,
        employeeId: scheduleChangeLog.employeeId,
        scheduleDate: scheduleChangeLog.scheduleDate,
        oldShiftCode: scheduleChangeLog.oldShiftCode,
        newShiftCode: scheduleChangeLog.newShiftCode,
        changeType: scheduleChangeLog.changeType,
        createdAt: scheduleChangeLog.createdAt,
        createdBy: scheduleChangeLog.createdBy,
      })
      .from(scheduleChangeLog)
      .where(eq(scheduleChangeLog.month, month))
      .orderBy(desc(scheduleChangeLog.createdAt));

    let filtered = rows;
    if (department) {
      const employees: Employee[] = await this.loadEmployees(department);
      const ids: Set<string> = new Set<string>(
        employees.map((e: Employee): string => e.id),
      );
      filtered = rows.filter((r) => ids.has(r.employeeId));
    }

    const empIds: string[] = [...new Set(filtered.map((r) => r.employeeId))];
    const nameMap: Map<string, string> = new Map<string, string>();
    if (empIds.length > 0) {
      const empRows = await this.db
        .select({ id: employee.id, name: employee.name })
        .from(employee)
        .where(inArray(employee.id, empIds));
      for (const e of empRows) {
        nameMap.set(e.id, e.name);
      }
    }

    const items: ScheduleChangeLog[] = filtered.map((r): ScheduleChangeLog => ({
      id: r.id,
      month,
      employeeId: r.employeeId,
      employeeName: nameMap.get(r.employeeId) ?? "未知员工",
      scheduleDate: r.scheduleDate,
      oldShiftCode: (r.oldShiftCode as ShiftCode) ?? null,
      newShiftCode: r.newShiftCode as ShiftCode,
      changeType: r.changeType as "manual" | "optimize",
      changedBy: r.createdBy ?? "",
      changedAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
    }));
    return { items, total: items.length };
  }

  /** POST /api/schedules/import：导入历史月份班表（锁定，作为后续月份的跨月前缀） */
  async importHistory(
    body: ImportHistoryScheduleRequest,
  ): Promise<ImportHistoryScheduleResponse> {
    const month: string = this.assertMonth(body?.month);
    const rows: ImportHistoryRow[] | undefined = body?.rows;
    const department: string = body.department;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException("rows 不能为空");
    }

    const daysInMonth: number = dayjs(`${month}-01`).daysInMonth();
    const employees: Employee[] = await this.loadEmployees(department);
    const empByNo: Map<string, Employee> = new Map<string, Employee>(
      employees.map((e: Employee): [string, Employee] => [e.employeeNo, e]),
    );
    const empById: Map<string, Employee> = new Map<string, Employee>(
      employees.map((e: Employee): [string, Employee] => [e.id, e]),
    );

    const unknownNos: string[] = [];
    const entries: EntryRow[] = [];
    for (const row of rows) {
      const employeeNo: string = String(row?.employeeNo ?? "").trim();
      if (!employeeNo) continue;
      const emp: Employee | undefined = empByNo.get(employeeNo);
      if (!emp) {
        if (!unknownNos.includes(employeeNo)) unknownNos.push(employeeNo);
        continue;
      }
      const shifts: Record<string, ShiftCode> = row.shifts ?? {};
      for (const [dayStr, code] of Object.entries(shifts)) {
        const dayNum: number = Number(dayStr);
        if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > daysInMonth) continue;
        if (code !== "day" && code !== "middle" && code !== "night") continue;
        entries.push({
          scheduleDate: `${month}-${String(dayNum).padStart(2, "0")}`,
          employeeId: emp.id,
          shiftCode: code,
          source: "imported",
        });
      }
    }
    if (unknownNos.length > 0) {
      throw new BadRequestException(`以下工号未在员工列表中：${unknownNos.join("、")}`);
    }
    if (entries.length === 0) {
      throw new BadRequestException("未解析到有效班次数据");
    }

    const first: string = `${month}-01`;
    const last: string = `${month}-${String(daysInMonth).padStart(2, "0")}`;
    const fileName: string = body?.fileName?.trim() || "未命名文件";
    const employeeCount: number = new Set<string>(entries.map((e: EntryRow) => e.employeeId)).size;
    const entryCount: number = entries.length;

    const importCells: ScheduleCell[] = entries.map(
      (entry: EntryRow): ScheduleCell => {
        const emp: Employee | undefined = empById.get(entry.employeeId);
        return {
          employeeId: entry.employeeId,
          employeeName: emp?.name ?? "",
          employeeNo: emp?.employeeNo ?? "",
          date: entry.scheduleDate,
          shiftCode: entry.shiftCode as ShiftCode,
          source: "imported",
        };
      },
    );
    await this.scheduleResultRepository.importHistory(month, importCells, department);

    await this.db
      .update(scheduleImportHistory)
      .set({ status: "deleted", deletedAt: new Date() })
      .where(and(eq(scheduleImportHistory.month, month), eq(scheduleImportHistory.status, "active")));

    await this.db.insert(scheduleImportHistory).values({
      month,
      fileName,
      employeeCount,
      entryCount,
      status: "active",
    });

    await this.markDraft(month);
    this.logger.log(`历史班表导入完成 month=${month} 共 ${entries.length} 条`);
    return {
      success: true,
      inserted: entries.length,
      message: `导入完成，共写入 ${entries.length} 条班次`,
    };
  }

  /** DELETE /api/schedules/imported：删除指定月份的导入班表 */
  async deleteImported(
    monthParam: string,
    department?: string,
  ): Promise<DeleteImportedScheduleResponse> {
    const month: string = this.assertMonth(monthParam);
    const dates: string[] = getMonthDates(month);
    const deleted: number = await this.scheduleResultRepository.deleteByDateRange(
      dates[0],
      dates[dates.length - 1],
      { source: "imported", department },
    );

    await this.db
      .update(scheduleImportHistory)
      .set({ status: "deleted", deletedAt: new Date() })
      .where(and(eq(scheduleImportHistory.month, month), eq(scheduleImportHistory.status, "active")));

    await this.markDraft(month);
    this.logger.log(`删除导入班表 month=${month} 共 ${deleted} 条`);
    return { success: true, deleted };
  }

  /** GET /api/schedules/import-history?month=YYYY-MM：导入历史记录 */
  async getImportHistory(
    monthParam: string,
    department?: string,
  ): Promise<ListImportHistoryResponse> {
    const month: string = this.assertMonth(monthParam);
    const rows = await this.db
      .select()
      .from(scheduleImportHistory)
      .where(eq(scheduleImportHistory.month, month))
      .orderBy(desc(scheduleImportHistory.importedAt));

    const items: ScheduleImportHistoryRecord[] = rows.map((r) => ({
      id: r.id,
      month: r.month,
      fileName: r.fileName,
      employeeCount: r.employeeCount,
      entryCount: r.entryCount,
      status: r.status as "active" | "deleted",
      importedAt: r.importedAt ? new Date(r.importedAt).toISOString() : "",
      deletedAt: r.deletedAt ? new Date(r.deletedAt).toISOString() : undefined,
    }));

    const hasActive: boolean = items.some((i: ScheduleImportHistoryRecord) => i.status === "active");
    if (!hasActive) {
      const dates: string[] = getMonthDates(month);
      const importedEntries: ScheduleCell[] = await this.scheduleResultRepository.findByDateRange(
        dates[0],
        dates[dates.length - 1],
        { source: "imported", department },
      );
      if (importedEntries.length > 0) {
        const employeeIds: Set<string> = new Set<string>(
          importedEntries.map((e: ScheduleCell) => e.employeeId),
        );
        items.unshift({
          id: "legacy",
          month,
          fileName: "历史导入数据（无文件记录）",
          employeeCount: employeeIds.size,
          entryCount: importedEntries.length,
          status: "active",
          importedAt: "",
        });
      }
    }

    return { items };
  }

  /** GET /api/schedules/export：生成标准排班表格式 xlsx Buffer */
  async exportExcel(
    monthParam: string,
    department?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const month: string = this.assertMonth(monthParam);
    const dates: string[] = getMonthDates(month);
    const first: string = dates[0];
    const last: string = dates[dates.length - 1];

    const employees: Employee[] = await this.loadEmployees(department);
    const configs: ShiftConfig[] = await this.loadShiftConfigs(department);
    const entries: EntryRow[] = await this.loadEntriesInRange(first, last, department);
    const holidays = await this.loadHolidaysInRange(first, last);

    const workbook: ExcelJS.Workbook = buildScheduleWorkbook({
      month,
      employees,
      shiftConfigs: configs,
      entries,
      holidays: Array.from(holidays.values()),
    });

    const buffer: Buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return { buffer, filename: `排班表-${month}.xlsx` };
  }

  /** GET /api/schedules/export-check：导出前校验，避免飞书导入踩坑 */
  async validateExport(
    monthParam: string,
    department?: string,
  ): Promise<ExportScheduleCheckResponse> {
    const month: string = this.assertMonth(monthParam);
    const dates: string[] = getMonthDates(month);
    const first: string = dates[0];
    const last: string = dates[dates.length - 1];

    const employees: Employee[] = await this.loadEmployees(department);
    const configs: ShiftConfig[] = await this.loadShiftConfigs(department);
    const entries: EntryRow[] = await this.loadEntriesInRange(first, last, department);
    const ruleConfig: RuleConfig = await this.loadRuleConfig();
    const holidayContext: HolidayContext = await this.loadHolidaysInRange(first, last);
    const lockedLeaves: Map<string, Set<string>> = await this.buildLockedLeaves(
      first,
      last,
      department,
    );
    const prev: PrevPrefixData = await this.loadPrevPrefix(month, department);
    const matrix: Map<string, Map<string, ShiftCode>> = this.buildMatrix(entries);

    const errors: string[] = [];
    const warnings: string[] = [];

    const empById: Map<string, Employee> = new Map<string, Employee>(
      employees.map((e: Employee): [string, Employee] => [e.id, e]),
    );
    const byEmployeeNo: Map<string, Employee[]> = new Map<string, Employee[]>();

    for (const emp of employees) {
      if (!emp.name || emp.name.trim() === "") {
        errors.push(`员工 ${emp.employeeNo} 姓名为空`);
      }
      if (!emp.employeeNo || emp.employeeNo.trim() === "") {
        errors.push(`员工 ${emp.name ?? emp.id} 工号为空`);
      }
      if (!emp.uid || emp.uid.trim() === "") {
        errors.push(`员工 ${emp.name ?? emp.employeeNo} 未绑定飞书 UID`);
      }
      const list: Employee[] = byEmployeeNo.get(emp.employeeNo) ?? [];
      list.push(emp);
      byEmployeeNo.set(emp.employeeNo, list);
    }

    for (const [no, list] of byEmployeeNo.entries()) {
      if (list.length > 1) {
        errors.push(`工号 ${no} 重复（${list.map((e: Employee) => e.name).join("、")}）`);
      }
    }

    for (const entry of entries) {
      if (!empById.has(entry.employeeId)) {
        errors.push(`${entry.scheduleDate} 存在未知员工的排班记录`);
      }
      if (!ALL_SHIFT_CODES.includes(entry.shiftCode as ShiftCode)) {
        errors.push(`${entry.scheduleDate} 班次代码 ${entry.shiftCode} 非法`);
      }
    }

    const configByCode: Map<ShiftCode, ShiftConfig> = new Map<ShiftCode, ShiftConfig>(
      configs.map((c: ShiftConfig): [ShiftCode, ShiftConfig] => [c.code, c]),
    );
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
        const count: number = counts.get(code) ?? 0;
        if (cfg.minCount !== null && count < cfg.minCount) {
          warnings.push(`${date} ${cfg.name}人数 ${count} 低于下限 ${cfg.minCount}`);
        }
        if (cfg.maxCount !== null && count > cfg.maxCount) {
          warnings.push(`${date} ${cfg.name}人数 ${count} 超过上限 ${cfg.maxCount}`);
        }
      }
    }

    const validateOptions: ValidateOptions = {
      prev,
      holidayContext,
      locked: lockedLeaves,
      nightRestDays: ruleConfig.nightRestDays,
      ruleConfig,
    };
    const scheduleWarnings: ScheduleWarning[] = validateMonth(
      employees,
      configs,
      matrix,
      dates,
      validateOptions,
    );
    for (const w of scheduleWarnings) {
      warnings.push(w.message);
    }

    const publishStatus = await this.getPublishStatus(month);
    if (publishStatus.status === "draft") {
      warnings.push("该月班表尚未发布，员工端不可见");
    }

    if (entries.length === 0) {
      warnings.push("该月暂无排班记录，导出文件将为空");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /** GET /api/schedules/publish-status：某月发布状态（无记录视为草稿） */
  async getPublishStatus(
    monthParam: string,
    _department?: string,
  ): Promise<SchedulePublishInfo> {
    const month: string = this.assertMonth(monthParam);
    const rows = await this.db
      .select()
      .from(schedulePublish)
      .where(eq(schedulePublish.month, month));
    if (rows.length === 0) {
      return { month, status: "draft", publishedAt: null };
    }
    const record = rows[0];
    return {
      month,
      status: record.status === "published" ? "published" : "draft",
      publishedAt: record.publishedAt
        ? new Date(record.publishedAt).toISOString()
        : null,
    };
  }

  /** POST /api/schedules/publish：发布某月班表，员工端可见 */
  async publishSchedule(
    monthParam: string,
    _department?: string,
  ): Promise<PublishScheduleResponse> {
    const month: string = this.assertMonth(monthParam);
    const now: Date = new Date();
    const rows: { publishedAt: Date | null }[] = await this.db
      .insert(schedulePublish)
      .values({ month, status: "published", publishedAt: now })
      .onConflictDoUpdate({
        target: [schedulePublish.month],
        set: { status: "published", publishedAt: now },
      })
      .returning({ publishedAt: schedulePublish.publishedAt });
    const publishedAt: string = rows[0]?.publishedAt
      ? new Date(rows[0].publishedAt).toISOString()
      : now.toISOString();
    this.logger.log(`班表发布成功 month=${month}`);
    return {
      success: true,
      status: "published",
      publishedAt,
      message: "班表已发布，员工端可见",
    };
  }

  /** 写操作后重置发布状态为草稿，避免半成品数据暴露给员工端 */
  private async markDraft(month: string): Promise<void> {
    await this.db
      .insert(schedulePublish)
      .values({ month, status: "draft", publishedAt: null })
      .onConflictDoUpdate({
        target: [schedulePublish.month],
        set: { status: "draft", publishedAt: null },
      });
  }

  /** GET /api/schedules/my：员工本人班表（仅已发布月份可见） */
  async mySchedule(
    monthParam: string,
    identity: CurrentIdentity,
  ): Promise<MyScheduleResponse> {
    const month: string = this.assertMonth(monthParam);
    if (identity.role !== "employee" || !identity.employeeId) {
      return {
        month,
        isPublished: false,
        days: [],
        employeeName: identity.name || null,
      };
    }
    const employeeId: string = identity.employeeId;
    const employees: Employee[] = await this.loadEmployees();
    const me: Employee | undefined = employees.find(
      (e: Employee): boolean => e.id === employeeId,
    );
    const employeeName: string | null = me?.name ?? null;

    const publish: SchedulePublishInfo = await this.getPublishStatus(month);
    if (publish.status !== "published") {
      return { month, isPublished: false, days: [], employeeName };
    }

    const dates: string[] = getMonthDates(month);
    const first: string = dates[0];
    const last: string = dates[dates.length - 1];

    const configs: ShiftConfig[] = await this.loadShiftConfigs();
    const configByCode: Map<ShiftCode, ShiftConfig> = new Map<
      ShiftCode,
      ShiftConfig
    >(configs.map((c: ShiftConfig): [ShiftCode, ShiftConfig] => [c.code, c]));

    const entries: EntryRow[] = await this.loadEntriesInRange(first, last);
    const myShifts: Map<string, ShiftCode> = new Map<string, ShiftCode>();
    const nameById: Map<string, string> = new Map<string, string>(
      employees.map((e: Employee): [string, string] => [e.id, e.name]),
    );
    // 同班次搭档索引：`${date}|${code}` → 姓名列表
    const shiftersByKey: Map<string, string[]> = new Map<string, string[]>();
    for (const entry of entries) {
      if (entry.employeeId === employeeId) {
        myShifts.set(entry.scheduleDate, entry.shiftCode as ShiftCode);
      }
      const key: string = `${entry.scheduleDate}|${entry.shiftCode}`;
      const names: string[] = shiftersByKey.get(key) ?? [];
      names.push(nameById.get(entry.employeeId) ?? "");
      shiftersByKey.set(key, names);
    }

    // 本人已批准排休日期 → status=leave
    const leaveDates: Set<string> = new Set<string>();
    const leaves = await this.db
      .select({
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
      })
      .from(leaveRequest)
      .where(
        and(
          eq(leaveRequest.employeeId, employeeId),
          eq(leaveRequest.status, "approved"),
          lte(leaveRequest.startDate, last),
          gte(leaveRequest.endDate, first),
        ),
      );
    for (const leave of leaves) {
      const start: string = leave.startDate < first ? first : leave.startDate;
      const end: string = leave.endDate > last ? last : leave.endDate;
      let cursor: string = start;
      while (cursor <= end) {
        leaveDates.add(cursor);
        cursor = dayjs(cursor).add(1, "day").format("YYYY-MM-DD");
      }
    }

    const days: MyScheduleDay[] = dates.map((date: string): MyScheduleDay => {
      const code: ShiftCode = myShifts.get(date) ?? "rest";
      const cfg: ShiftConfig | undefined = configByCode.get(code);
      const status: MyScheduleDayStatus = leaveDates.has(date)
        ? "leave"
        : code === "rest"
          ? "rest"
          : "work";
      const teammates: string[] | undefined =
        code === "rest"
          ? undefined
          : (shiftersByKey.get(`${date}|${code}`) ?? []).filter(
              (name: string): boolean => Boolean(name) && name !== employeeName,
            );
      return {
        date,
        shiftCode: code,
        shiftName: cfg?.name ?? (code === "rest" ? "休班" : code),
        startTime: cfg?.startTime || undefined,
        endTime: cfg?.endTime || undefined,
        crossDay: cfg?.crossDay,
        status,
        teammates,
      };
    });

    return { month, isPublished: true, days, employeeName };
  }
}
