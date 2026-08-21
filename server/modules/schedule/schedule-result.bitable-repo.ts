import { Injectable } from "@nestjs/common";
import {
  BitableClient,
  booleanField,
  booleanValue,
  dateField,
  dateValue,
  sleep,
  textField,
  textValue,
  type BitableRecord,
} from "@server/common/bitable";
import type { Employee, ScheduleCell, ShiftConfig, ShiftCode } from "@shared/api.interface";
import { buildCellKey, type ScheduleResultRepository } from "./schedule-result.repository";

const EMPLOYEE_PLUGIN_ID = "feishu_multitable_crud_agg_analysis_1";
const SHIFT_PLUGIN_ID = "shift_config_feishu_multitable_crud_agg_analysis_3";

@Injectable()
export class ScheduleResultBitableRepository
  implements ScheduleResultRepository
{
  private readonly pluginInstanceId =
    "feishu_multitable_crud_agg_analysis_2";

  constructor(private readonly client: BitableClient) {}

  async findByDateRange(
    first: string,
    last: string,
    options?: { source?: string; department?: string },
  ): Promise<ScheduleCell[]> {
    const response = await this.client.call<{ records: BitableRecord[]; hasMore: boolean; pageToken?: string; total: number }>(
      this.pluginInstanceId,
      "searchRecords",
      { pageSize: 500 },
    );
    let records: BitableRecord[] = response.records ?? [];
    let pageToken: string | undefined = response.pageToken;
    while (pageToken) {
      const next = await this.client.call<{ records: BitableRecord[]; hasMore: boolean; pageToken?: string; total: number }>(
        this.pluginInstanceId,
        "searchRecords",
        { pageToken, pageSize: 500 },
      );
      records = records.concat(next.records ?? []);
      pageToken = next.pageToken;
    }

    const rows: ScheduleCell[] = records
      .map((raw: BitableRecord) => this.fromBitableRecord(raw))
      .filter((row: ScheduleCell) => row.date >= first && row.date <= last);

    const filteredByDepartment: ScheduleCell[] = options?.department
      ? rows.filter((row: ScheduleCell) => row.department === options.department)
      : rows;

    if (options?.source) {
      return filteredByDepartment.filter((row: ScheduleCell) => row.source === options.source);
    }
    return filteredByDepartment;
  }

  async replaceMonth(
    month: string,
    cells: ScheduleCell[],
    department?: string,
  ): Promise<number> {
    const first: string = `${month}-01`;
    const lastDay: number = new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 0).getDate();
    const last: string = `${month}-${String(lastDay).padStart(2, "0")}`;

    const existing = await this.findByDateRange(first, last, { department });
    const incomingKeys: Set<string> = new Set(
      cells.map((cell: ScheduleCell) => buildCellKey(cell)),
    );

    const toDelete: string[] = existing
      .filter((cell: ScheduleCell) => !incomingKeys.has(buildCellKey(cell)))
      .map((cell: ScheduleCell) => cell.recordId)
      .filter((id: string | undefined): id is string => !!id);

    await this.batchDelete(toDelete);
    const source: string = cells[0]?.source ?? "generated";
    await this.batchUpsert(
      cells.map((cell: ScheduleCell) => ({ ...cell, source })),
      source,
      department,
    );
    return cells.length;
  }

  async upsertCell(cell: ScheduleCell, source: string, department?: string): Promise<void> {
    await this.batchUpsert([{ ...cell, source }], source, department);
  }

  async batchUpsert(cells: ScheduleCell[], source: string, department?: string): Promise<void> {
    if (cells.length === 0) return;
    const employeeMap = await this.loadEmployeeMap();
    const shiftMap = await this.loadShiftMap();

    const firstDate: string = cells.reduce((min: string, c: ScheduleCell) =>
      c.date < min ? c.date : min, cells[0].date);
    const lastDate: string = cells.reduce((max: string, c: ScheduleCell) =>
      c.date > max ? c.date : max, cells[0].date);
    const existing: ScheduleCell[] = await this.findByDateRange(firstDate, lastDate, { department });
    const keyToExisting: Map<string, ScheduleCell> = new Map<string, ScheduleCell>();
    for (const cell of existing) {
      if (!cell.employeeNo || !cell.date) continue;
      keyToExisting.set(`${cell.employeeNo}#${cell.date}`, cell);
    }

    const toAdd: Array<{ record: Record<string, unknown> }> = [];
    const toUpdate: Array<{ id: string; record: Record<string, unknown> }> = [];
    for (const entity of cells) {
      const record: Record<string, unknown> = this.toBitableRecord(
        { ...entity, source },
        employeeMap,
        shiftMap,
      );
      const key: string = `${entity.employeeNo}#${entity.date}`;
      const prev: ScheduleCell | undefined = keyToExisting.get(key);
      if (prev?.recordId) {
        toUpdate.push({ id: prev.recordId, record });
      } else {
        toAdd.push({ record });
      }
    }

    for (let i: number = 0; i < toUpdate.length; i += 500) {
      const chunk = toUpdate.slice(i, i + 500);
      await this.client.call<{ records: Array<{ id: string }> }>(
        this.pluginInstanceId,
        "batchUpdateRecords",
        { records: chunk },
      );
      if (toUpdate.length > 500) await sleep(100);
    }

    for (let i: number = 0; i < toAdd.length; i += 500) {
      const chunk = toAdd.slice(i, i + 500);
      await this.client.call<{ records: Array<{ id: string }> }>(
        this.pluginInstanceId,
        "batchAddRecords",
        { records: chunk },
      );
      if (toAdd.length > 500) await sleep(100);
    }
  }

  async deleteByDateRange(
    first: string,
    last: string,
    options?: { source?: string; department?: string },
  ): Promise<number> {
    const existing = await this.findByDateRange(first, last, options);
    const ids: string[] = existing
      .map((cell: ScheduleCell) => cell.recordId)
      .filter((id: string | undefined): id is string => !!id);
    await this.batchDelete(ids);
    return ids.length;
  }

  async countImported(first: string, last: string, department?: string): Promise<number> {
    const existing = await this.findByDateRange(first, last, { source: "imported", department });
    return existing.length;
  }

  async importHistory(month: string, cells: ScheduleCell[], department?: string): Promise<number> {
    await this.replaceMonth(
      month,
      cells.map((cell: ScheduleCell) => ({ ...cell, source: "imported" })),
      department,
    );
    return cells.length;
  }

  private async batchDelete(recordIds: string[]): Promise<void> {
    if (recordIds.length === 0) return;
    for (let i = 0; i < recordIds.length; i += 500) {
      const chunk = recordIds.slice(i, i + 500);
      await this.client.call<{ success: boolean }>(
        this.pluginInstanceId,
        "deleteRecords",
        { recordIDs: chunk },
      );
      if (recordIds.length > 500) await sleep(100);
    }
  }

  private toBitableRecord(
    entity: ScheduleCell,
    employeeMap: Map<string, Employee>,
    shiftMap: Map<string, ShiftConfig>,
  ): Record<string, unknown> {
    const emp = employeeMap.get(entity.employeeNo);
    const shift = Array.from(shiftMap.values()).find(
      (s: ShiftConfig) => s.code === entity.shiftCode,
    );
    const record: Record<string, unknown> = {};
    record["排班记录编号"] = textField(
      `SCH-${entity.employeeNo}-${entity.date}-${entity.shiftCode}`,
    );
    record["日期"] = dateField(entity.date);
    record["部门"] = textField(entity.department ?? emp?.department ?? "");
    record["班次"] = textField(shift?.name ?? entity.shiftCode);
    record["员工"] = textField(entity.employeeName);
    record["岗位"] = textField("");
    record["开始时间"] = textField(shift?.startTime ?? "");
    record["结束时间"] = textField(shift?.endTime ?? "");
    record["是否夜班"] = booleanField(
      shift?.isNightShift ?? entity.shiftCode === "night",
    );
    record["排班来源"] = textField(entity.source ?? "generated");
    record["是否锁定"] = booleanField(entity.locked ?? false);
    record["是否人工调整"] = booleanField(entity.source === "manual");
    record["命中规则"] = textField("");
    record["例外说明"] = textField("");
    return record;
  }

  private fromBitableRecord(raw: BitableRecord): ScheduleCell {
    const record = raw.record;
    const date: string = dateValue(record["日期"]) ?? "";
    const scheduleNo: string = this.extractDisplayText(record["排班记录编号"]);
    const parsed = this.parseScheduleNo(scheduleNo, date);
    const shiftName: string =
      this.extractDisplayText(record["班次"]) || parsed.shiftName;
    const employeeName: string =
      this.extractDisplayText(record["员工"]) || parsed.employeeName;
    const source: string = textValue(record["排班来源"]) ?? "generated";
    return {
      employeeId: parsed.employeeNo || raw.id,
      employeeName,
      employeeNo: parsed.employeeNo,
      date: parsed.date || date,
      shiftCode: shiftName ? this.shiftNameToCode(shiftName) : "rest",
      source,
      recordId: raw.id,
      department: textValue(record["部门"]) ?? undefined,
      locked: booleanValue(record["是否锁定"]) ?? false,
    };
  }

  private parseScheduleNo(
    scheduleNo: string,
    fallbackDate: string,
  ): { employeeNo: string; employeeName: string; shiftName: string; date: string } {
    if (!scheduleNo) {
      return { employeeNo: "", employeeName: "", shiftName: "", date: fallbackDate };
    }
    const parts: string[] = scheduleNo.split("-");
    if (parts.length >= 5 && parts[0] === "SCH") {
      const employeeNo: string = parts[1];
      const dateStr: string = `${parts[2]}-${parts[3]}-${parts[4]}`;
      const shiftName: string = parts.slice(5).join("-") || "";
      return { employeeNo, employeeName: "", shiftName, date: dateStr };
    }
    return { employeeNo: "", employeeName: "", shiftName: "", date: fallbackDate };
  }

  private extractEmployeeNo(raw: unknown): string | undefined {
    if (raw === null || raw === undefined) return undefined;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      if (typeof first === "string") return first;
      if (typeof first === "object" && first !== null && "text" in first) {
        return (first as { text?: string }).text;
      }
    }
    if (typeof raw === "object" && "text" in (raw as object)) {
      return (raw as { text?: string }).text;
    }
    return this.extractDisplayText(raw);
  }

  private extractDisplayText(raw: unknown): string {
    if (raw === null || raw === undefined) return "";
    if (typeof raw === "string") return raw;
    if (typeof raw === "number") return String(raw);
    if (typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.text === "string") return obj.text;
      if (Array.isArray(obj) && obj.length > 0) {
        return this.extractDisplayText(obj[0]);
      }
      if (obj.recordIDs && Array.isArray(obj.recordIDs) && obj.recordIDs.length > 0) {
        return String(obj.recordIDs[0]);
      }
      if (obj.link_record_ids && Array.isArray(obj.link_record_ids) && obj.link_record_ids.length > 0) {
        return String(obj.link_record_ids[0]);
      }
    }
    return "";
  }

  private shiftNameToCode(name: string): ShiftCode {
    const normalized: string = name.trim().toLowerCase();
    if (
      normalized === "day" ||
      normalized.includes("早") ||
      normalized.includes("行政") ||
      normalized.includes("白")
    ) {
      return "day";
    }
    if (normalized === "middle" || normalized.includes("中")) {
      return "middle";
    }
    if (
      normalized === "night" ||
      normalized.includes("晚") ||
      normalized.includes("夜") ||
      normalized.includes("通宵")
    ) {
      return "night";
    }
    if (normalized === "rest" || normalized.includes("休")) {
      return "rest";
    }
    return "rest";
  }

  private async loadEmployeeMap(): Promise<Map<string, Employee>> {
    try {
      const response = await this.client.call<{ records: BitableRecord[] }>(
        EMPLOYEE_PLUGIN_ID,
        "searchRecords",
        { pageSize: 500 },
      );
      const map = new Map<string, Employee>();
      for (const raw of response.records ?? []) {
        const no =
          this.extractEmployeeNo(raw.record["员工ID"]) ||
          textValue(raw.record["备注"]);
        const name = textValue(raw.record["员工姓名"]);
        const department = textValue(raw.record["所属部门"]) ?? "";
        const emp: Employee = {
          id: raw.id,
          name: name ?? "",
          employeeNo: no ?? "",
          uid: "",
          platform: "",
          preference: "none",
          role: "",
          userRole: "employee",
          department,
          status: "active",
          roleTags: [],
          abilityTags: [],
          skillTags: [],
          mentorNos: [],
          shiftPreferences: [],
          allowedShifts: [],
          owedDays: 0,
          surplusDays: 0,
          isIndividualScheduling: false,
          fixedLeaves: [],
        };
        if (no) {
          map.set(no, emp);
        }
        if (name) {
          map.set(name, emp);
        }
      }
      return map;
    } catch {
      return new Map();
    }
  }

  private async loadShiftMap(): Promise<Map<string, ShiftConfig>> {
    try {
      const response = await this.client.call<{ records: BitableRecord[] }>(
        SHIFT_PLUGIN_ID,
        "searchRecords",
        { pageSize: 500 },
      );
      const map = new Map<string, ShiftConfig>();
      for (const raw of response.records ?? []) {
        const name = textValue(raw.record["班次名称"]) ?? "";
        if (name) {
          map.set(name, {
            code: this.shiftNameToCode(name),
            name,
            startTime: textValue(raw.record["开始时间"]) ?? "",
            endTime: textValue(raw.record["结束时间"]) ?? "",
            crossDay: false,
            minCount: null,
            maxCount: null,
            holidayMinCount: null,
            holidayMaxCount: null,
            department: textValue(raw.record["适用部门"]) ?? "",
            requiredRoles: [],
            requiredSkills: [],
            isActive: true,
            isNightShift: booleanValue(raw.record["是否夜班"]) ?? false,
            isOvernight: booleanValue(raw.record["是否通宵班"]) ?? false,
            requireSupervisor: false,
            requireSeniorJuniorMix: false,
            priority: 0,
            taskCodes: [],
          });
        }
      }
      return map;
    } catch {
      return new Map();
    }
  }
}
