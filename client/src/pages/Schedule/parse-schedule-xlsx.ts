import * as XLSX from "xlsx";
import type { Employee, ShiftCode, ShiftConfig } from "@shared/api.interface";

export interface ParsedImportRow {
  employeeNo: string;
  shifts: Record<string, ShiftCode>;
}

export interface ParseScheduleXlsxResult {
  rows: ParsedImportRow[];
  /** 无法识别的单元格描述列表 */
  skippedCells: string[];
  totalShifts: number;
}

const DAY_HEADER_RES: RegExp[] = [
  /^\d{4}-\d{2}-(\d{2})$/u,
  /^\d{1,2}月(\d{1,2})日?$/u,
  /^(\d{1,2})\s*日?$/u,
];

const EMPLOYEE_NO_HEADERS: ReadonlySet<string> = new Set([
  "工号",
  "员工工号",
  "编号",
  "员工编号",
  "employee no",
  "employeeno",
  "no",
  "no.",
]);

const EMPLOYEE_NAME_HEADERS: ReadonlySet<string> = new Set([
  "姓名",
  "员工姓名",
  "name",
]);

const REST_VALUES: ReadonlySet<string> = new Set([
  "休",
  "休班",
  "休息",
  "rest",
  "off",
  "-",
  "",
]);

const FALLBACK_SHIFT_NAMES: Record<ShiftCode, string> = {
  day: "白班",
  middle: "中班",
  night: "晚班",
  rest: "休班",
};

/** 常见简写与单字符班次映射 */
const SHIFT_ALIASES: Record<string, ShiftCode> = {
  早: "day",
  白: "day",
  d: "day",
  中: "middle",
  m: "middle",
  晚: "night",
  夜: "night",
  n: "night",
  休: "rest",
  r: "rest",
};

/** 构建「班次名称/code → code」映射（班次配置名 + 兜底名 + code 本身 + 常见简写） */
export function buildShiftCodeMap(configs: ShiftConfig[]): Map<string, ShiftCode> {
  const map: Map<string, ShiftCode> = new Map<string, ShiftCode>();
  const codes: ShiftCode[] = ["day", "middle", "night", "rest"];
  for (const cfg of configs) {
    map.set(cfg.name, cfg.code);
    map.set(cfg.code, cfg.code);
  }
  for (const code of codes) {
    map.set(FALLBACK_SHIFT_NAMES[code], code);
    map.set(code, code);
  }
  for (const [alias, code] of Object.entries(SHIFT_ALIASES)) {
    map.set(alias, code);
  }
  return map;
}

function normalizeHeader(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ");
}

function extractDayFromHeader(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const day: number = value.getDate();
    return day >= 1 && day <= 31 ? day : null;
  }
  const s: string = String(value).trim();
  for (const re of DAY_HEADER_RES) {
    const m: RegExpExecArray | null = re.exec(s);
    if (!m) continue;
    const day: number = Number(m[1]);
    if (day >= 1 && day <= 31) return day;
  }
  return null;
}

interface DetectedHeader {
  headerRowIndex: number;
  employeeNoCol: number;
  employeeNameCol: number;
  dateCols: { col: number; day: number }[];
}

function detectHeader(grid: unknown[][]): DetectedHeader | null {
  for (let r: number = 0; r < Math.min(grid.length, 50); r += 1) {
    const row: unknown[] = grid[r] ?? [];
    let employeeNoCol: number = -1;
    let employeeNameCol: number = -1;
    for (let c: number = 0; c < row.length; c += 1) {
      const normalized: string = normalizeHeader(row[c]);
      if (EMPLOYEE_NO_HEADERS.has(normalized)) {
        employeeNoCol = c;
      } else if (EMPLOYEE_NAME_HEADERS.has(normalized)) {
        employeeNameCol = c;
      }
    }
    if (employeeNoCol < 0 && employeeNameCol < 0) continue;

    const cols: { col: number; day: number }[] = [];
    row.forEach((v: unknown, idx: number): void => {
      const day: number | null = extractDayFromHeader(v);
      if (day != null) cols.push({ col: idx, day });
    });

    // 至少包含 5 个日期列才认为是真正的表头行
    if (cols.length >= 5) {
      return { headerRowIndex: r, employeeNoCol, employeeNameCol, dateCols: cols };
    }
  }
  return null;
}

/**
 * 解析班表 Excel：支持两种表头格式
 * 1. 含「工号/员工工号/编号…」列与「1~31」日期列，单元格为班次名称/code
 * 2. 含「姓名」列与「1~31」日期列，单元格为班次简写；需传入 employees 做姓名→工号映射
 * 空白与「休」视为休班。
 */
export async function parseScheduleXlsx(
  file: File,
  codeMap: Map<string, ShiftCode>,
  employees?: Employee[],
): Promise<ParseScheduleXlsxResult> {
  const buffer: ArrayBuffer = await file.arrayBuffer();
  const workbook: XLSX.WorkBook = XLSX.read(buffer, { type: "array" });
  const sheetName: string | undefined = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel 中没有工作表");
  const grid: unknown[][] = XLSX.utils.sheet_to_json<unknown[]>(
    workbook.Sheets[sheetName],
    { header: 1, defval: "" },
  );

  const header: DetectedHeader | null = detectHeader(grid);
  if (!header) {
    throw new Error(
      "未找到表头：需包含「工号/姓名」列和「1~31 日」日期列",
    );
  }

  const nameToNoMap: Map<string, string> = new Map<string, string>();
  if (employees) {
    for (const emp of employees) {
      if (!nameToNoMap.has(emp.name)) {
        nameToNoMap.set(emp.name, emp.employeeNo);
      }
    }
  }

  const resolveEmployeeNo = (
    raw: unknown[],
    r: number,
  ): { employeeNo: string; label: string } | null => {
    if (header.employeeNoCol >= 0) {
      const employeeNo: string = String(raw[header.employeeNoCol] ?? "").trim();
      if (employeeNo) return { employeeNo, label: employeeNo };
    }
    if (header.employeeNameCol >= 0) {
      const name: string = String(raw[header.employeeNameCol] ?? "").trim();
      const employeeNo: string | undefined = nameToNoMap.get(name);
      if (employeeNo) return { employeeNo, label: name };
    }
    return null;
  };

  const rows: ParsedImportRow[] = [];
  const skippedCells: string[] = [];
  let totalShifts: number = 0;

  for (let r: number = header.headerRowIndex + 1; r < grid.length; r += 1) {
    const raw: unknown[] = grid[r] ?? [];
    const resolved = resolveEmployeeNo(raw, r);
    if (!resolved) continue;

    const { employeeNo, label } = resolved;
    const shifts: Record<string, ShiftCode> = {};
    let hasAnyShift: boolean = false;
    for (const { col, day } of header.dateCols) {
      const value: string = String(raw[col] ?? "").trim();
      if (!value || REST_VALUES.has(value)) continue;
      const code: ShiftCode | undefined = codeMap.get(value);
      if (!code || code === "rest") {
        skippedCells.push(`第 ${r + 1} 行「${label}」${day}日：${value}`);
        continue;
      }
      shifts[String(day)] = code;
      totalShifts += 1;
      hasAnyShift = true;
    }
    if (hasAnyShift) {
      rows.push({ employeeNo, shifts });
    }
  }

  if (rows.length === 0) throw new Error("未解析到员工数据行");
  return { rows, skippedCells, totalShifts };
}
