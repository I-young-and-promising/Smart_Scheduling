import dayjs from "dayjs";
import * as ExcelJS from "exceljs";
import type { Employee, Holiday, ShiftCode, ShiftConfig } from "@shared/api.interface";

export interface ExportEntryRow {
  scheduleDate: string;
  employeeId: string;
  shiftCode: string;
}

interface PlatformGroup {
  platform: string;
  members: Employee[];
}

/** 班次单元格显示字符 */
const SHIFT_CHAR: Record<ShiftCode, string> = {
  day: "早",
  middle: "中",
  night: "晚",
  rest: "休",
};

/** 班次单元格背景色（休班无背景） */
const SHIFT_FILL: Partial<Record<ShiftCode, string>> = {
  day: "FFFDDDEF",
  middle: "FFD5F6F2",
  night: "FFBACEFD",
};

const BORDER_ARGB: string = "FF1F2329";
const BLACK: string = "FF000000";
const DATE_HEADER_FILL: string = "FFFFF258";
const DATE_HEADER_FONT: string = "FFF54A45";
const REST_STAT_FILL: string = "FFFFFF00";
const REST_STAT_FONT: string = "FFFF0000";

/** 行高 27px ≈ 20.25pt */
const ROW_HEIGHT: number = 20.25;
/** 标题行行高（容纳 21 号字） */
const TITLE_HEIGHT: number = 31;
/** 日期列宽 ≈50px */
const DATE_COL_WIDTH: number = 7;
/** 平台 / 姓名列宽 */
const PLATFORM_COL_WIDTH: number = 12;
const NAME_COL_WIDTH: number = 10;

const STAT_LABELS: string[] = ["早", "中", "晚", "休", "上班人数"];
/** 标题班次说明的班次顺序 */
const TITLE_SHIFT_ORDER: ShiftCode[] = ["day", "middle", "night"];

function thinBorder(): ExcelJS.Borders {
  const side: ExcelJS.Border = { style: "thin", color: { argb: BORDER_ARGB } };
  return { top: side, left: side, bottom: side, right: side, diagonal: {} };
}

function centerAlignment(): Partial<ExcelJS.Alignment> {
  return { horizontal: "center", vertical: "middle" };
}

/** 标题中的班次时间说明：早 08:30-17:00// 中 13:30-22:00// 晚 16:30-01:00+1 */
function buildShiftDescription(configs: ShiftConfig[]): string {
  const parts: string[] = [];
  for (const code of TITLE_SHIFT_ORDER) {
    const cfg: ShiftConfig | undefined = configs.find(
      (c: ShiftConfig): boolean => c.code === code,
    );
    if (!cfg) continue;
    parts.push(`${cfg.name} ${cfg.startTime}-${cfg.endTime}${cfg.crossDay ? "+1" : ""}`);
  }
  return parts.join("// ");
}

/** 按平台分组（保持员工列表顺序） */
function groupByPlatform(employees: Employee[]): PlatformGroup[] {
  const groups: PlatformGroup[] = [];
  for (const emp of employees) {
    const group: PlatformGroup | undefined = groups.find(
      (g: PlatformGroup): boolean => g.platform === emp.platform,
    );
    if (group) {
      group.members.push(emp);
    } else {
      groups.push({ platform: emp.platform, members: [emp] });
    }
  }
  return groups;
}

/** 合并区域补全边框（ExcelJS 合并后需逐格设置边框才完整） */
function applyBorders(
  sheet: ExcelJS.Worksheet,
  rowStart: number,
  rowEnd: number,
  colStart: number,
  colEnd: number,
): void {
  for (let r: number = rowStart; r <= rowEnd; r++) {
    const row: ExcelJS.Row = sheet.getRow(r);
    for (let c: number = colStart; c <= colEnd; c++) {
      row.getCell(c).border = thinBorder();
    }
  }
}

interface GroupStats {
  day: number[];
  middle: number[];
  night: number[];
  rest: number[];
  working: number[];
}

/** 统计区五行：早 / 中 / 晚 / 休 / 上班人数（逐日） */
function computeGroupStats(
  members: Employee[],
  shiftOf: (empId: string, dayIndex: number) => ShiftCode,
  days: number,
): GroupStats {
  const stats: GroupStats = { day: [], middle: [], night: [], rest: [], working: [] };
  for (let di: number = 0; di < days; di++) {
    let dayCount: number = 0;
    let middleCount: number = 0;
    let nightCount: number = 0;
    for (const emp of members) {
      const code: ShiftCode = shiftOf(emp.id, di);
      if (code === "day") dayCount += 1;
      else if (code === "middle") middleCount += 1;
      else if (code === "night") nightCount += 1;
    }
    stats.day.push(dayCount);
    stats.middle.push(middleCount);
    stats.night.push(nightCount);
    stats.rest.push(members.length - dayCount - middleCount - nightCount);
    stats.working.push(dayCount + middleCount + nightCount);
  }
  return stats;
}

/** 写入一组排班表（标题 + 表头 + 数据区 + 统计区），返回下一组起始行号 */
function writeGroup(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  group: PlatformGroup,
  monthLabel: string,
  shiftDescription: string,
  days: number,
  shiftOf: (empId: string, dayIndex: number) => ShiftCode,
  holidayMap: Map<number, Holiday>,
): number {
  const totalCols: number = 2 + days;
  let row: number = startRow;

  // 标题行：A 列到最后日期列合并
  const titleRow: ExcelJS.Row = sheet.getRow(row);
  titleRow.height = TITLE_HEIGHT;
  sheet.mergeCells(row, 1, row, totalCols);
  const titleCell: ExcelJS.Cell = titleRow.getCell(1);
  titleCell.value = `${monthLabel} ${group.platform} ${shiftDescription}`;
  titleCell.font = { size: 21, bold: true, color: { argb: BLACK } };
  titleCell.alignment = centerAlignment();
  applyBorders(sheet, row, row, 1, totalCols);
  row += 1;

  // 表头行：平台 / 姓名 / 1~N 日
  const headerRow: ExcelJS.Row = sheet.getRow(row);
  headerRow.height = ROW_HEIGHT;
  for (const [col, label] of [
    [1, "平台"],
    [2, "姓名"],
  ] as [number, string][]) {
    const cell: ExcelJS.Cell = headerRow.getCell(col);
    cell.value = label;
    cell.font = { size: 14, bold: true, color: { argb: BLACK } };
    cell.alignment = centerAlignment();
    cell.border = thinBorder();
  }
  for (let d: number = 1; d <= days; d++) {
    const cell: ExcelJS.Cell = headerRow.getCell(2 + d);
    const holiday: Holiday | undefined = holidayMap.get(d);
    cell.value = d;
    cell.font = { size: 14, bold: true, color: { argb: DATE_HEADER_FONT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DATE_HEADER_FILL } };
    cell.alignment = centerAlignment();
    cell.border = thinBorder();
    if (holiday) {
      cell.note = `${holiday.type === "workday_swap" ? "调休" : "节假日"}：${holiday.name}`;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: holiday.type === "workday_swap" ? "FFFFE0B2" : "FFFFCDD2",
        },
      };
    }
  }
  row += 1;

  // 数据区：每行一名员工，平台列整体合并
  const dataStart: number = row;
  for (const emp of group.members) {
    const dataRow: ExcelJS.Row = sheet.getRow(row);
    dataRow.height = ROW_HEIGHT;
    const nameCell: ExcelJS.Cell = dataRow.getCell(2);
    nameCell.value = emp.name;
    nameCell.font = { size: 13, color: { argb: BLACK } };
    nameCell.alignment = centerAlignment();
    nameCell.border = thinBorder();
    for (let d: number = 1; d <= days; d++) {
      const code: ShiftCode = shiftOf(emp.id, d - 1);
      const cell: ExcelJS.Cell = dataRow.getCell(2 + d);
      cell.value = SHIFT_CHAR[code];
      cell.font = { size: 13, color: { argb: BLACK } };
      const fill: string | undefined = SHIFT_FILL[code];
      if (fill) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      }
      cell.alignment = centerAlignment();
      cell.border = thinBorder();
    }
    row += 1;
  }
  const dataEnd: number = row - 1;
  if (dataEnd >= dataStart) {
    sheet.mergeCells(dataStart, 1, dataEnd, 1);
    const platformCell: ExcelJS.Cell = sheet.getCell(dataStart, 1);
    platformCell.value = group.platform;
    platformCell.font = { size: 14, color: { argb: BLACK } };
    platformCell.alignment = centerAlignment();
    applyBorders(sheet, dataStart, dataEnd, 1, 1);
  }

  // 统计区：早 / 中 / 晚 / 休 / 上班人数，标签列合并
  const stats: GroupStats = computeGroupStats(group.members, shiftOf, days);
  const statSeries: number[][] = [stats.day, stats.middle, stats.night, stats.rest, stats.working];
  const statStart: number = row;
  for (let i: number = 0; i < STAT_LABELS.length; i++) {
    const statRow: ExcelJS.Row = sheet.getRow(row);
    statRow.height = ROW_HEIGHT;
    const isRestRow: boolean = i === 3;
    const labelCell: ExcelJS.Cell = statRow.getCell(2);
    labelCell.value = STAT_LABELS[i];
    labelCell.font = {
      size: 14,
      bold: i === 3 || i === 4,
      color: { argb: isRestRow ? REST_STAT_FONT : BLACK },
    };
    if (isRestRow) {
      labelCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: REST_STAT_FILL },
      };
    }
    labelCell.alignment = centerAlignment();
    labelCell.border = thinBorder();
    for (let d: number = 0; d < days; d++) {
      const cell: ExcelJS.Cell = statRow.getCell(3 + d);
      cell.value = statSeries[i][d];
      cell.font = { size: 14, color: { argb: isRestRow ? REST_STAT_FONT : BLACK } };
      if (isRestRow) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: REST_STAT_FILL },
        };
      }
      cell.alignment = centerAlignment();
      cell.border = thinBorder();
    }
    row += 1;
  }
  sheet.mergeCells(statStart, 1, statStart + STAT_LABELS.length - 1, 1);
  const statLabelCell: ExcelJS.Cell = sheet.getCell(statStart, 1);
  statLabelCell.value = "统计";
  statLabelCell.font = { size: 14, bold: true, color: { argb: BLACK } };
  statLabelCell.alignment = centerAlignment();
  applyBorders(sheet, statStart, statStart + STAT_LABELS.length - 1, 1, 1);

  return row;
}

/**
 * 构建排班表工作簿：按平台分组上下排列，
 * 每组含标题行、表头行、员工数据行与五行统计区。
 */
export function buildScheduleWorkbook(params: {
  month: string;
  employees: Employee[];
  shiftConfigs: ShiftConfig[];
  entries: ExportEntryRow[];
  holidays?: Holiday[];
}): ExcelJS.Workbook {
  const { month, employees, shiftConfigs, entries, holidays = [] } = params;
  const first: dayjs.Dayjs = dayjs(`${month}-01`);
  const days: number = first.daysInMonth();
  const monthLabel: string = `${first.year()}年${first.month() + 1}月`;
  const shiftDescription: string = buildShiftDescription(shiftConfigs);

  const holidayMap: Map<number, Holiday> = new Map<number, Holiday>();
  for (const h of holidays) {
    holidayMap.set(dayjs(h.date).date(), h);
  }

  // employeeId → 日号(1-based) → 班次，缺失视为休班
  const shiftByEmp: Map<string, Map<number, ShiftCode>> = new Map();
  for (const entry of entries) {
    const dayNum: number = dayjs(entry.scheduleDate).date();
    const dayMap: Map<number, ShiftCode> =
      shiftByEmp.get(entry.employeeId) ?? new Map<number, ShiftCode>();
    dayMap.set(dayNum, entry.shiftCode as ShiftCode);
    shiftByEmp.set(entry.employeeId, dayMap);
  }
  const shiftOf = (empId: string, dayIndex: number): ShiftCode =>
    shiftByEmp.get(empId)?.get(dayIndex + 1) ?? "rest";

  const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
  const sheet: ExcelJS.Worksheet = workbook.addWorksheet(`${monthLabel}排班表`);
  const totalCols: number = 2 + days;

  sheet.getColumn(1).width = PLATFORM_COL_WIDTH;
  sheet.getColumn(2).width = NAME_COL_WIDTH;
  for (let c: number = 3; c <= totalCols; c++) {
    sheet.getColumn(c).width = DATE_COL_WIDTH;
  }

  const groups: PlatformGroup[] = groupByPlatform(employees);
  let row: number = 1;
  groups.forEach((group: PlatformGroup, index: number): void => {
    row = writeGroup(
      sheet,
      row,
      group,
      monthLabel,
      shiftDescription,
      days,
      shiftOf,
      holidayMap,
    );
    if (index < groups.length - 1) row += 1;
  });

  return workbook;
}
