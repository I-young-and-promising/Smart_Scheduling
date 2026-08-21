import type { InjectionToken } from "@nestjs/common";
import type { ScheduleCell, ShiftCode } from "@shared/api.interface";

export interface ScheduleResultRepository {
  /** 查询 [first, last] 区间内的排班结果 */
  findByDateRange(
    first: string,
    last: string,
    options?: { source?: string; department?: string },
  ): Promise<ScheduleCell[]>;
  /** 整月替换：删除目标月份全部现有结果并写入 cells */
  replaceMonth(month: string, cells: ScheduleCell[], department: string): Promise<number>;
  /** 单条 upsert */
  upsertCell(cell: ScheduleCell, source: string, department: string): Promise<void>;
  /** 批量 upsert */
  batchUpsert(cells: ScheduleCell[], source: string, department: string): Promise<void>;
  /** 删除 [first, last] 区间内 source 指定来源的数据 */
  deleteByDateRange(
    first: string,
    last: string,
    options?: { source?: string; department?: string },
  ): Promise<number>;
  /** 统计 [first, last] 区间内 source='imported' 的记录数 */
  countImported(first: string, last: string, department?: string): Promise<number>;
  /** 导入历史班表：删除同月份已有 imported 数据并写入 cells */
  importHistory(month: string, cells: ScheduleCell[], department: string): Promise<number>;
}

export const SCHEDULE_RESULT_REPOSITORY: InjectionToken = Symbol(
  "SCHEDULE_RESULT_REPOSITORY",
);

export interface CellLookupKey {
  employeeId: string;
  date: string;
}

export function buildCellKey(cell: { employeeId: string; date: string }): string {
  return `${cell.employeeId}|${cell.date}`;
}

export function scheduleCellToEntry(
  cell: ScheduleCell,
  source: string,
  department: string,
): {
  scheduleDate: string;
  employeeId: string;
  shiftCode: ShiftCode;
  source: string;
  taskId?: string | null;
  workLoadTags?: string[];
  department: string;
} {
  return {
    scheduleDate: cell.date,
    employeeId: cell.employeeId,
    shiftCode: cell.shiftCode,
    source,
    taskId: cell.taskId,
    workLoadTags: cell.workLoadTags,
    department,
  };
}
