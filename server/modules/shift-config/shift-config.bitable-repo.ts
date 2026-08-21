import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BitableClient,
  BitableRepository,
  booleanField,
  booleanValue,
  multiSelectField,
  multiSelectValue,
  numberField,
  numberValue,
  singleSelectField,
  singleSelectValue,
  textField,
  textValue,
  type BitableRecord,
  type BitableSearchResponse,
} from "@server/common/bitable";
import type {
  CreateShiftConfigRequest,
  ShiftConfig,
  ShiftCode,
  ShiftTaskCode,
  ShiftType,
  UpdateShiftConfigRequest,
  UpdateShiftConfigResponse,
} from "@shared/api.interface";
import { DepartmentService } from "@server/modules/department/department.service";
import type { ShiftConfigRepository } from "./shift-config.repository";

const SHIFT_TYPE_TO_CODE: Record<string, ShiftCode> = {
  早班: "day",
  行政班: "day",
  中班: "middle",
  晚班: "night",
  夜班: "night",
  通宵班: "night",
};

function shiftTypeToCode(shiftType: string | undefined): ShiftCode {
  if (!shiftType) return "day";
  return SHIFT_TYPE_TO_CODE[shiftType] ?? "day";
}

function normalizeCode(raw: unknown, shiftType?: string): ShiftCode {
  const code = textValue(raw);
  if (code === "day" || code === "middle" || code === "night" || code === "rest") {
    return code;
  }
  return shiftTypeToCode(shiftType);
}

@Injectable()
export class ShiftConfigBitableRepository
  extends BitableRepository<ShiftConfig>
  implements ShiftConfigRepository
{
  protected readonly pluginInstanceId =
    "shift_config_feishu_multitable_crud_agg_analysis_3";

  constructor(
    client: BitableClient,
    private readonly departmentService: DepartmentService,
  ) {
    super(client);
  }

  async list(department?: string): Promise<ShiftConfig[]> {
    const rows: ShiftConfig[] = await this.listAll();
    const activeRows: ShiftConfig[] = rows.filter((row: ShiftConfig) => row.isActive);
    const targetNames: string[] = department
      ? await this.resolveDepartmentNames(department)
      : [];
    const byDepartment: ShiftConfig[] = department
      ? activeRows.filter((row: ShiftConfig) =>
          this.departmentMatches(row.department ?? "", targetNames),
        )
      : activeRows;

    const grouped: Map<ShiftCode, ShiftConfig> = new Map();
    for (const row of byDepartment) {
      const existing = grouped.get(row.code);
      if (!existing) {
        grouped.set(row.code, row);
        continue;
      }
      existing.minCount = mergeSum(existing.minCount, row.minCount);
      existing.maxCount = mergeSum(existing.maxCount, row.maxCount);
      existing.holidayMinCount = mergeSum(
        existing.holidayMinCount,
        row.holidayMinCount,
      );
      existing.holidayMaxCount = mergeSum(
        existing.holidayMaxCount,
        row.holidayMaxCount,
      );
    }

    const result: ShiftConfig[] = [];
    for (const [code, config] of grouped) {
      const departmentCode: string =
        department ?? this.extractFirstDepartmentCode(config.department);
      result.push({
        ...config,
        id: this.buildCompositeId(code, departmentCode),
      });
    }
    return result;
  }

  async findById(id: string): Promise<ShiftConfig | null> {
    if (this.isCompositeId(id)) {
      const { department, code } = this.parseCompositeId(id);
      return this.findByDepartmentAndCode(department, code);
    }
    const record = await super.findById(id);
    if (!record) return null;
    return this.fromBitableRecord(record as unknown as BitableRecord);
  }

  async findByDepartmentAndCode(
    department: string,
    code: string,
  ): Promise<ShiftConfig | null> {
    const rows: ShiftConfig[] = await this.listAll();
    const targetNames: string[] = await this.resolveDepartmentNames(department);
    let merged: ShiftConfig | null = null;
    for (const row of rows) {
      if (
        row.code === code &&
        this.departmentMatches(row.department ?? "", targetNames)
      ) {
        if (!merged) {
          merged = { ...row };
        } else {
          merged.minCount = mergeSum(merged.minCount, row.minCount);
          merged.maxCount = mergeSum(merged.maxCount, row.maxCount);
          merged.holidayMinCount = mergeSum(
            merged.holidayMinCount,
            row.holidayMinCount,
          );
          merged.holidayMaxCount = mergeSum(
            merged.holidayMaxCount,
            row.holidayMaxCount,
          );
        }
      }
    }
    if (merged) {
      merged.id = this.buildCompositeId(code, department);
    }
    return merged;
  }

  async create(data: CreateShiftConfigRequest): Promise<ShiftConfig> {
    const departmentName: string = await this.resolveDepartmentName(
      data.department,
    );
    const existing = await this.findByDepartmentAndCode(departmentName, data.code);
    if (existing) {
      throw new BadRequestException(
        `部门 ${data.department} 下已存在班次 ${data.code}`,
      );
    }
    const entity: ShiftConfig = this.toShiftConfig(data);
    const created = await this.batchCreate([entity]);
    if (created.length === 0) {
      throw new BadRequestException("创建班次失败");
    }
    const full = await this.findById(created[0].id);
    if (!full) {
      throw new BadRequestException("创建班次后读取失败");
    }
    return full;
  }

  async update(
    id: string,
    data: UpdateShiftConfigRequest,
  ): Promise<UpdateShiftConfigResponse> {
    if (this.isCompositeId(id)) {
      return this.updateComposite(id, data);
    }

    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException("班次不存在");
    }
    const updated: ShiftConfig = {
      ...existing,
      ...data,
      holidayMinCount:
        data.holidayMinCount !== undefined
          ? data.holidayMinCount
          : existing.holidayMinCount,
      holidayMaxCount:
        data.holidayMaxCount !== undefined
          ? data.holidayMaxCount
          : existing.holidayMaxCount,
      taskCodes: data.taskCodes ?? existing.taskCodes,
    } as ShiftConfig;
    await this.batchUpdate([{ id, entity: updated }]);
    return { success: true };
  }

  async delete(id: string): Promise<void> {
    if (this.isCompositeId(id)) {
      const { department, code } = this.parseCompositeId(id);
      const recordIds = await this.findRecordIdsByDepartmentAndCode(
        department,
        code,
      );
      if (recordIds.length === 0) {
        throw new NotFoundException("班次不存在");
      }
      await this.batchDelete(recordIds);

      return;
    }
    await this.batchDelete([id]);
  }

  protected getBusinessKey(entity: ShiftConfig): string {
    return `${entity.department}:${entity.code}`;
  }

  protected toBitableRecord(entity: Partial<ShiftConfig>): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    if (entity.code !== undefined) {
      record["班次编号"] = textField(entity.code);
    }
    if (entity.name !== undefined) {
      record["班次名称"] = textField(entity.name);
    }
    if (entity.department !== undefined) {
      record["适用部门"] = entity.department
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    if (entity.shiftType !== undefined) {
      record["班次类型"] = singleSelectField(entity.shiftType);
    }
    if (entity.startTime !== undefined) {
      record["开始时间"] = textField(entity.startTime);
    }
    if (entity.endTime !== undefined) {
      record["结束时间"] = textField(entity.endTime);
    }
    if (entity.crossDay !== undefined) {
      record["是否跨日"] = booleanField(entity.crossDay);
    }
    if (entity.standardHours !== undefined && entity.standardHours !== null && entity.standardHours !== "") {
      record["标准工时"] = numberField(Number(entity.standardHours));
    }
    if (entity.minCount !== undefined) {
      record["所需最少人数"] = numberField(entity.minCount);
    }
    if (entity.maxCount !== undefined) {
      record["所需最多人数"] = numberField(entity.maxCount);
    }
    if (entity.holidayMinCount !== undefined) {
      record["节假日最少人数"] = numberField(entity.holidayMinCount);
    }
    if (entity.holidayMaxCount !== undefined) {
      record["节假日最多人数"] = numberField(entity.holidayMaxCount);
    }
    if (entity.requiredRoles !== undefined) {
      record["所需岗位"] = multiSelectField(entity.requiredRoles);
    }
    if (entity.requiredSkills !== undefined) {
      record["所需技能"] = multiSelectField(entity.requiredSkills);
    }
    if (entity.isActive !== undefined) {
      record["是否启用"] = booleanField(entity.isActive);
    }
    if (entity.isNightShift !== undefined) {
      record["是否夜班"] = booleanField(entity.isNightShift);
    }
    if (entity.isOvernight !== undefined) {
      record["是否通宵班"] = booleanField(entity.isOvernight);
    }
    if (entity.requireSupervisor !== undefined) {
      record["是否需要主管"] = booleanField(entity.requireSupervisor);
    }
    if (entity.requireSeniorJuniorMix !== undefined) {
      record["是否需要新老搭配"] = booleanField(entity.requireSeniorJuniorMix);
    }
    if (entity.priority !== undefined) {
      record["班次优先级"] = textField(String(entity.priority));
    }
    if (entity.taskCodes !== undefined) {
      record["任务编码"] = textField(JSON.stringify(entity.taskCodes));
    }
    return record;
  }

  protected fromBitableRecord(raw: BitableRecord): ShiftConfig {
    const record: Record<string, unknown> = raw.record;
    const shiftType: string | undefined = singleSelectValue(record["班次类型"]);
    const code: ShiftCode = normalizeCode(record["班次编号"], shiftType);
    const taskCodes: ShiftTaskCode[] = parseTaskCodes(record["任务编码"]);
    return {
      id: raw.id,
      code,
      name: textValue(record["班次名称"]) ?? "",
      startTime: textValue(record["开始时间"]) ?? "",
      endTime: textValue(record["结束时间"]) ?? "",
      crossDay: booleanValue(record["是否跨日"]) ?? false,
      minCount: numberValue(record["所需最少人数"]) ?? null,
      maxCount: numberValue(record["所需最多人数"]) ?? null,
      holidayMinCount: numberValue(record["节假日最少人数"]) ?? null,
      holidayMaxCount: numberValue(record["节假日最多人数"]) ?? null,
      department: parseDepartment(record["适用部门"]),
      shiftType: shiftType as ShiftType,
      standardHours: numberValue(record["标准工时"])?.toString() ?? textValue(record["标准工时"]),
      requiredRoles: multiSelectValue(record["所需岗位"]),
      requiredSkills: multiSelectValue(record["所需技能"]),
      isActive: booleanValue(record["是否启用"]) ?? true,
      isNightShift: booleanValue(record["是否夜班"]) ?? false,
      isOvernight: booleanValue(record["是否通宵班"]) ?? false,
      requireSupervisor: booleanValue(record["是否需要主管"]) ?? false,
      requireSeniorJuniorMix: booleanValue(record["是否需要新老搭配"]) ?? false,
      priority: numberValue(record["班次优先级"]) ?? 0,
      taskCodes,
    };
  }

  private toShiftConfig(data: CreateShiftConfigRequest): ShiftConfig {
    return {
      code: data.code,
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      crossDay: data.crossDay ?? false,
      minCount: data.minCount ?? null,
      maxCount: data.maxCount ?? null,
      holidayMinCount: data.holidayMinCount ?? null,
      holidayMaxCount: data.holidayMaxCount ?? null,
      department: data.department,
      shiftType: data.shiftType,
      standardHours: data.standardHours,
      requiredRoles: data.requiredRoles ?? [],
      requiredSkills: data.requiredSkills ?? [],
      isActive: data.isActive ?? true,
      isNightShift: data.isNightShift ?? false,
      isOvernight: data.isOvernight ?? false,
      requireSupervisor: data.requireSupervisor ?? false,
      requireSeniorJuniorMix: data.requireSeniorJuniorMix ?? false,
      priority: data.priority ?? 0,
      taskCodes: data.taskCodes ?? [],
    };
  }

  private async listAllRaw(): Promise<BitableRecord[]> {
    const records: BitableRecord[] = [];
    let pageToken: string | undefined;
    do {
      const input: Record<string, unknown> = { pageSize: 500 };
      if (pageToken) {
        input.pageToken = pageToken;
      }
      const response: BitableSearchResponse =
        await this.client.call<BitableSearchResponse>(
          this.pluginInstanceId,
          "searchRecords",
          input,
        );
      records.push(...(response.records ?? []));
      pageToken = response.pageToken;
    } while (pageToken);
    return records;
  }

  private async updateComposite(
    id: string,
    data: UpdateShiftConfigRequest,
  ): Promise<UpdateShiftConfigResponse> {
    const { department, code } = this.parseCompositeId(id);
    const records: BitableRecord[] = await this.findRawRecordsByDepartmentAndCode(
      department,
      code,
    );
    const recordIds: string[] = records.map((record) => record.id);
    if (recordIds.length === 0) {
      throw new NotFoundException("班次不存在");
    }

    const countFields: Array<keyof UpdateShiftConfigRequest> = [
      "minCount",
      "maxCount",
      "holidayMinCount",
      "holidayMaxCount",
    ];
    const hasCountUpdate = countFields.some(
      (field) => data[field] !== undefined,
    );

    if (!hasCountUpdate) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundException("班次不存在");
      }
      const updated: ShiftConfig = { ...existing, ...data } as ShiftConfig;
      await this.batchUpdate(recordIds.map((recordId) => ({
        id: recordId,
        entity: updated,
      })));
      return { success: true };
    }

    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException("班次不存在");
    }

    const updates: Array<{ id: string; entity: ShiftConfig }> = [];
    for (const record of records) {
      const entity = this.fromBitableRecord(record);
      const updated: ShiftConfig = { ...entity, ...data } as ShiftConfig;

      for (const field of countFields) {
        if (data[field] === undefined) continue;
        const mergedValue = existing[field as keyof ShiftConfig] as number | null;
        const newValue = data[field] as number | null;
        if (
          mergedValue === null ||
          mergedValue === undefined ||
          newValue === null ||
          newValue === undefined
        ) {
          updated[field as keyof ShiftConfig] = newValue as never;
          continue;
        }
        const ratio = newValue / mergedValue;
        const originalValue = entity[field as keyof ShiftConfig] as number | null;
        if (originalValue === null || originalValue === undefined) {
          updated[field as keyof ShiftConfig] = newValue as never;
          continue;
        }
        updated[field as keyof ShiftConfig] = Math.round(originalValue * ratio) as never;
      }
      updates.push({ id: record.id, entity: updated });
    }

    this.adjustRemainders(updates, existing, data);
    await this.batchUpdate(updates.map(({ id, entity }) => ({ id, entity })));
    return { success: true };
  }

  private adjustRemainders(
    updates: Array<{ id: string; entity: ShiftConfig }>,
    existing: ShiftConfig,
    data: UpdateShiftConfigRequest,
  ): void {
    const countFields: Array<keyof UpdateShiftConfigRequest> = [
      "minCount",
      "maxCount",
      "holidayMinCount",
      "holidayMaxCount",
    ];
    for (const field of countFields) {
      if (data[field] === undefined) continue;
      const target = data[field] as number | null;
      const merged = existing[field as keyof ShiftConfig] as number | null;
      if (target === null || target === undefined || merged === null || merged === undefined) {
        continue;
      }
      const currentSum = updates.reduce(
        (sum, update) =>
          sum +
          ((update.entity[field as keyof ShiftConfig] as number | null) ?? 0),
        0,
      );
      let diff = target - currentSum;
      let index = 0;
      while (diff !== 0 && index < updates.length) {
        const entity = updates[index].entity;
        const current = (entity[field as keyof ShiftConfig] as number | null) ?? 0;
        if (diff > 0) {
          entity[field as keyof ShiftConfig] = (current + 1) as never;
          diff -= 1;
        } else if (diff < 0 && current > 0) {
          entity[field as keyof ShiftConfig] = (current - 1) as never;
          diff += 1;
        }
        index += 1;
      }
    }
  }

  private async findRecordIdsByDepartmentAndCode(
    department: string,
    code: string,
  ): Promise<string[]> {
    const records: BitableRecord[] = await this.listAllRaw();
    const targetNames: string[] = await this.resolveDepartmentNames(department);
    return records
      .filter((record: BitableRecord) => {
        const entity = this.fromBitableRecord(record);
        return (
          entity.code === code &&
          this.departmentMatches(entity.department ?? "", targetNames)
        );
      })
      .map((record: BitableRecord) => record.id);
  }

  private async findRawRecordsByDepartmentAndCode(
    department: string,
    code: string,
  ): Promise<BitableRecord[]> {
    const records: BitableRecord[] = await this.listAllRaw();
    const targetNames: string[] = await this.resolveDepartmentNames(department);
    return records.filter((record: BitableRecord) => {
      const entity = this.fromBitableRecord(record);
      return (
        entity.code === code &&
        this.departmentMatches(entity.department ?? "", targetNames)
      );
    });
  }

  private async resolveDepartmentName(code: string): Promise<string> {
    const dept = await this.departmentService.findByCode(code);
    return dept?.name ?? code;
  }

  private isCompositeId(id: string): boolean {
    return id.includes(":");
  }

  private buildCompositeId(code: string, department: string): string {
    return `${code}:${department}`;
  }

  private parseCompositeId(id: string): { code: string; department: string } {
    const [code, ...rest] = id.split(":");
    return { code, department: rest.join(":") };
  }

  private extractFirstDepartmentCode(departmentValue: string | undefined): string {
    if (!departmentValue) return "";
    return departmentValue.split(",")[0]?.trim() ?? "";
  }

  private async resolveDepartmentNames(codeOrNames: string): Promise<string[]> {
    if (!codeOrNames) return [];
    const parts: string[] = codeOrNames.split(",").map((s: string) => s.trim()).filter(Boolean);
    const names: Set<string> = new Set();
    for (const part of parts) {
      const dept = await this.departmentService.findByCode(part);
      if (dept) {
        names.add(dept.name);
      } else {
        names.add(part);
      }
    }
    return Array.from(names);
  }

  private departmentMatches(rowDepartment: string, targetNames: string[]): boolean {
    if (targetNames.length === 0) return true;
    const rowNames: string[] = rowDepartment
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    return targetNames.some((target: string) => rowNames.includes(target));
  }
}

function mergeSum(
  a: number | null,
  b: number | null,
): number | null {
  if (a === null || a === undefined) return b ?? null;
  if (b === null || b === undefined) return a;
  return a + b;
}

function parseDepartment(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  if (Array.isArray(raw)) {
    return raw
      .map((item: unknown): string =>
        typeof item === "string" ? item : String(item),
      )
      .join(",");
  }
  if (typeof raw === "string") {
    return raw;
  }
  if (typeof raw === "object" && raw !== null && "text" in raw) {
    return (raw as { text?: string }).text;
  }
  return String(raw);
}

function parseTaskCodes(raw: unknown): ShiftTaskCode[] {
  const text = textValue(raw);
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item: unknown): item is ShiftTaskCode =>
          item !== null &&
          typeof item === "object" &&
          "code" in item &&
          typeof item.code === "string",
      );
    }
  } catch {
    // ignore invalid JSON
  }
  return [];
}
