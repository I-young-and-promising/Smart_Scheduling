import { Inject, NotFoundException } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { shiftConfig } from "@server/database/schema";
import type {
  CreateShiftConfigRequest,
  ShiftConfig,
  ShiftCode,
  ShiftTaskCode,
  ShiftType,
  UpdateShiftConfigRequest,
  UpdateShiftConfigResponse,
} from "@shared/api.interface";
import type { ShiftConfigRepository } from "./shift-config.repository";

export class ShiftConfigDrizzleRepository implements ShiftConfigRepository {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async list(department?: string): Promise<ShiftConfig[]> {
    const query = this.db
      .select(this.baseColumns())
      .from(shiftConfig)
      .orderBy(asc(shiftConfig.priority), asc(shiftConfig.code));
    const rows = department
      ? await query.where(eq(shiftConfig.department, department))
      : await query;
    return rows.map((row) => this.toShiftConfig(row as unknown as Record<string, unknown>));
  }

  async findById(id: string): Promise<ShiftConfig | null> {
    const rows = await this.db
      .select(this.baseColumns())
      .from(shiftConfig)
      .where(eq(shiftConfig.id, id));
    return rows.length > 0
      ? this.toShiftConfig(rows[0] as unknown as Record<string, unknown>)
      : null;
  }

  async findByDepartmentAndCode(
    department: string,
    code: string,
  ): Promise<ShiftConfig | null> {
    const rows = await this.db
      .select(this.baseColumns())
      .from(shiftConfig)
      .where(and(eq(shiftConfig.department, department), eq(shiftConfig.code, code)));
    return rows.length > 0
      ? this.toShiftConfig(rows[0] as unknown as Record<string, unknown>)
      : null;
  }

  async create(data: CreateShiftConfigRequest): Promise<ShiftConfig> {
    const inserted = await this.db
      .insert(shiftConfig)
      .values(this.toInsertValues(data))
      .returning({ id: shiftConfig.id });
    const created = await this.findById(inserted[0].id);
    if (!created) {
      throw new NotFoundException("创建班次失败");
    }
    return created;
  }

  async update(
    id: string,
    data: UpdateShiftConfigRequest,
  ): Promise<UpdateShiftConfigResponse> {
    const updated = await this.db
      .update(shiftConfig)
      .set(this.toUpdateValues(data))
      .where(eq(shiftConfig.id, id))
      .returning({ id: shiftConfig.id });
    if (updated.length === 0) {
      throw new NotFoundException("班次不存在");
    }
    return { success: true };
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.db
      .delete(shiftConfig)
      .where(eq(shiftConfig.id, id))
      .returning({ id: shiftConfig.id });
    if (deleted.length === 0) {
      throw new NotFoundException("班次不存在");
    }
  }

  private baseColumns() {
    return {
      id: shiftConfig.id,
      code: shiftConfig.code,
      name: shiftConfig.name,
      startTime: shiftConfig.startTime,
      endTime: shiftConfig.endTime,
      crossDay: shiftConfig.crossDay,
      minCount: shiftConfig.minCount,
      maxCount: shiftConfig.maxCount,
      holidayMinCount: shiftConfig.holidayMinCount,
      holidayMaxCount: shiftConfig.holidayMaxCount,
      department: shiftConfig.department,
      shiftType: shiftConfig.shiftType,
      standardHours: shiftConfig.standardHours,
      requiredRoles: shiftConfig.requiredRoles,
      requiredSkills: shiftConfig.requiredSkills,
      isActive: shiftConfig.isActive,
      isNightShift: shiftConfig.isNightShift,
      isOvernight: shiftConfig.isOvernight,
      requireSupervisor: shiftConfig.requireSupervisor,
      requireSeniorJuniorMix: shiftConfig.requireSeniorJuniorMix,
      priority: shiftConfig.priority,
      taskCodes: shiftConfig.taskCodes,
    };
  }

  private toShiftConfig(row: Record<string, unknown>): ShiftConfig {
    return {
      id: row.id ? String(row.id) : undefined,
      code: String(row.code) as ShiftCode,
      name: String(row.name),
      startTime: String(row.startTime),
      endTime: String(row.endTime),
      crossDay: Boolean(row.crossDay),
      minCount: row.minCount !== null && row.minCount !== undefined ? Number(row.minCount) : null,
      maxCount: row.maxCount !== null && row.maxCount !== undefined ? Number(row.maxCount) : null,
      holidayMinCount:
        row.holidayMinCount !== null && row.holidayMinCount !== undefined
          ? Number(row.holidayMinCount)
          : null,
      holidayMaxCount:
        row.holidayMaxCount !== null && row.holidayMaxCount !== undefined
          ? Number(row.holidayMaxCount)
          : null,
      department: String(row.department),
      shiftType: row.shiftType
        ? (String(row.shiftType) as ShiftType)
        : undefined,
      standardHours: row.standardHours ? String(row.standardHours) : undefined,
      requiredRoles: Array.isArray(row.requiredRoles) ? (row.requiredRoles as string[]) : [],
      requiredSkills: Array.isArray(row.requiredSkills) ? (row.requiredSkills as string[]) : [],
      isActive: Boolean(row.isActive),
      isNightShift: Boolean(row.isNightShift),
      isOvernight: Boolean(row.isOvernight),
      requireSupervisor: Boolean(row.requireSupervisor),
      requireSeniorJuniorMix: Boolean(row.requireSeniorJuniorMix),
      priority: Number(row.priority ?? 0),
      taskCodes: Array.isArray(row.taskCodes)
        ? (row.taskCodes as ShiftTaskCode[])
        : [],
    };
  }

  private toInsertValues(data: CreateShiftConfigRequest): typeof shiftConfig.$inferInsert {
    return {
      code: data.code,
      name: data.name,
      department: data.department,
      startTime: data.startTime,
      endTime: data.endTime,
      crossDay: data.crossDay ?? false,
      minCount: data.minCount ?? null,
      maxCount: data.maxCount ?? null,
      holidayMinCount: data.holidayMinCount ?? null,
      holidayMaxCount: data.holidayMaxCount ?? null,
      shiftType: data.shiftType as never,
      standardHours: data.standardHours,
      requiredRoles: data.requiredRoles ?? [],
      requiredSkills: data.requiredSkills ?? [],
      isActive: data.isActive ?? true,
      isNightShift: data.isNightShift ?? false,
      isOvernight: data.isOvernight ?? false,
      requireSupervisor: data.requireSupervisor ?? false,
      requireSeniorJuniorMix: data.requireSeniorJuniorMix ?? false,
      priority: data.priority ?? 0,
      taskCodes: data.taskCodes
        ? (data.taskCodes as unknown as string)
        : ("[]" as never),
    };
  }

  private toUpdateValues(
    data: UpdateShiftConfigRequest,
  ): Partial<typeof shiftConfig.$inferInsert> {
    const values: Partial<typeof shiftConfig.$inferInsert> = {};
    if (data.name !== undefined) values.name = data.name;
    if (data.startTime !== undefined) values.startTime = data.startTime;
    if (data.endTime !== undefined) values.endTime = data.endTime;
    if (data.crossDay !== undefined) values.crossDay = data.crossDay;
    if (data.minCount !== undefined) values.minCount = data.minCount;
    if (data.maxCount !== undefined) values.maxCount = data.maxCount;
    if (data.holidayMinCount !== undefined)
      values.holidayMinCount = data.holidayMinCount;
    if (data.holidayMaxCount !== undefined)
      values.holidayMaxCount = data.holidayMaxCount;
    if (data.shiftType !== undefined)
      values.shiftType = data.shiftType as never;
    if (data.standardHours !== undefined)
      values.standardHours = data.standardHours;
    if (data.requiredRoles !== undefined)
      values.requiredRoles = data.requiredRoles;
    if (data.requiredSkills !== undefined)
      values.requiredSkills = data.requiredSkills;
    if (data.isActive !== undefined) values.isActive = data.isActive;
    if (data.isNightShift !== undefined) values.isNightShift = data.isNightShift;
    if (data.isOvernight !== undefined) values.isOvernight = data.isOvernight;
    if (data.requireSupervisor !== undefined)
      values.requireSupervisor = data.requireSupervisor;
    if (data.requireSeniorJuniorMix !== undefined)
      values.requireSeniorJuniorMix = data.requireSeniorJuniorMix;
    if (data.priority !== undefined) values.priority = data.priority;
    if (data.taskCodes !== undefined)
      values.taskCodes = data.taskCodes as never;
    return values;
  }
}
