import { Injectable, NotFoundException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { and, asc, eq } from "drizzle-orm";
import { employee } from "@server/database/schema";
import type {
  CreateEmployeeResponse,
  Employee,
  EmployeePreference,
  EmployeeStatus,
  SaveEmployeeRequest,
  UpdateEmployeeResponse,
  UserRole,
} from "@shared/api.interface";
import type { EmployeeRepository } from "./employee.repository";

const VALID_PREFERENCES: EmployeePreference[] = [
  "none",
  "prefer_day",
  "prefer_night",
];

const VALID_USER_ROLES: UserRole[] = ["admin", "employee"];

const VALID_STATUSES: EmployeeStatus[] = [
  "active",
  "probation",
  "leave",
  "resigned",
];

@Injectable()
export class EmployeeDrizzleRepository implements EmployeeRepository {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(department?: string): Promise<Employee[]> {
    const query = this.db
      .select({
        id: employee.id,
        name: employee.name,
        employeeNo: employee.employeeNo,
        uid: employee.uid,
        platform: employee.platform,
        preference: employee.preference,
        role: employee.role,
        userRole: employee.userRole,
        department: employee.department,
        status: employee.status,
        hireDate: employee.hireDate,
        roleTags: employee.roleTags,
        abilityTags: employee.abilityTags,
        skillTags: employee.skillTags,
        efficiencyTag: employee.efficiencyTag,
        mentorNos: employee.mentorNos,
        shiftPreferences: employee.shiftPreferences,
        allowedShifts: employee.allowedShifts,
        dailyStandardWorkload: employee.dailyStandardWorkload,
        capacityLevel: employee.capacityLevel,
        capacityRatio: employee.capacityRatio,
        owedDays: employee.owedDays,
        surplusDays: employee.surplusDays,
        isIndividualScheduling: employee.isIndividualScheduling,
      })
      .from(employee)
      .orderBy(asc(employee.employeeNo));
    const rows = department ? await query.where(eq(employee.department, department)) : await query;
    return rows.map((row) => this.toEmployee(row as unknown as Record<string, unknown>));
  }

  async findById(id: string): Promise<Employee | null> {
    const rows = await this.selectBaseQuery().where(eq(employee.id, id));
    return rows.length > 0 ? this.toEmployee(rows[0] as unknown as Record<string, unknown>) : null;
  }

  async findByEmployeeNo(employeeNo: string): Promise<Employee | null> {
    const rows = await this.selectBaseQuery().where(eq(employee.employeeNo, employeeNo));
    return rows.length > 0 ? this.toEmployee(rows[0] as unknown as Record<string, unknown>) : null;
  }

  async findByEmployeeNoInDepartment(
    employeeNo: string,
    department: string,
  ): Promise<Employee | null> {
    const rows = await this.selectBaseQuery().where(
      and(eq(employee.employeeNo, employeeNo), eq(employee.department, department)),
    );
    return rows.length > 0 ? this.toEmployee(rows[0] as unknown as Record<string, unknown>) : null;
  }

  async create(data: SaveEmployeeRequest): Promise<CreateEmployeeResponse> {
    const inserted = await this.db
      .insert(employee)
      .values(this.toInsertValues(data))
      .returning({ id: employee.id });
    return { id: inserted[0].id };
  }

  async update(
    id: string,
    data: SaveEmployeeRequest,
  ): Promise<UpdateEmployeeResponse> {
    const updated = await this.db
      .update(employee)
      .set(this.toInsertValues(data))
      .where(eq(employee.id, id))
      .returning({ id: employee.id });
    if (updated.length === 0) {
      throw new NotFoundException("员工不存在");
    }
    return { success: true };
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.db
      .delete(employee)
      .where(eq(employee.id, id))
      .returning({ id: employee.id });
    if (deleted.length === 0) {
      throw new NotFoundException("员工不存在");
    }
  }

  private selectBaseQuery() {
    return this.db
      .select({
        id: employee.id,
        name: employee.name,
        employeeNo: employee.employeeNo,
        uid: employee.uid,
        platform: employee.platform,
        preference: employee.preference,
        role: employee.role,
        userRole: employee.userRole,
        department: employee.department,
        status: employee.status,
        hireDate: employee.hireDate,
        roleTags: employee.roleTags,
        abilityTags: employee.abilityTags,
        skillTags: employee.skillTags,
        efficiencyTag: employee.efficiencyTag,
        mentorNos: employee.mentorNos,
        shiftPreferences: employee.shiftPreferences,
        allowedShifts: employee.allowedShifts,
        dailyStandardWorkload: employee.dailyStandardWorkload,
        capacityLevel: employee.capacityLevel,
        capacityRatio: employee.capacityRatio,
        owedDays: employee.owedDays,
        surplusDays: employee.surplusDays,
        isIndividualScheduling: employee.isIndividualScheduling,
      })
      .from(employee);
  }

  private toEmployee(row: Record<string, unknown>): Employee {
    return {
      id: String(row.id),
      name: String(row.name),
      employeeNo: String(row.employeeNo),
      uid: String(row.uid),
      platform: String(row.platform),
      preference: VALID_PREFERENCES.includes(row.preference as EmployeePreference)
        ? (row.preference as EmployeePreference)
        : "none",
      role: String(row.role),
      userRole: VALID_USER_ROLES.includes(row.userRole as UserRole)
        ? (row.userRole as UserRole)
        : "employee",
      department: String(row.department),
      status: VALID_STATUSES.includes(row.status as EmployeeStatus)
        ? (row.status as EmployeeStatus)
        : "active",
      hireDate: row.hireDate ? String(row.hireDate) : undefined,
      roleTags: Array.isArray(row.roleTags) ? (row.roleTags as string[]) : [],
      abilityTags: Array.isArray(row.abilityTags) ? (row.abilityTags as string[]) : [],
      skillTags: Array.isArray(row.skillTags) ? (row.skillTags as string[]) : [],
      efficiencyTag: row.efficiencyTag ? String(row.efficiencyTag) : undefined,
      mentorNos: Array.isArray(row.mentorNos) ? (row.mentorNos as string[]) : [],
      shiftPreferences: Array.isArray(row.shiftPreferences)
        ? (row.shiftPreferences as string[])
        : [],
      allowedShifts: Array.isArray(row.allowedShifts)
        ? (row.allowedShifts as string[])
        : [],
      dailyStandardWorkload:
        row.dailyStandardWorkload !== null && row.dailyStandardWorkload !== undefined
          ? Number(row.dailyStandardWorkload)
          : undefined,
      capacityLevel: row.capacityLevel ? String(row.capacityLevel) : undefined,
      capacityRatio: row.capacityRatio ? String(row.capacityRatio) : undefined,
      owedDays: Number(row.owedDays ?? 0),
      surplusDays: Number(row.surplusDays ?? 0),
      isIndividualScheduling: Boolean(row.isIndividualScheduling),
      fixedLeaves: [],
    };
  }

  private toInsertValues(data: SaveEmployeeRequest): typeof employee.$inferInsert {
    return {
      name: data.name,
      employeeNo: data.employeeNo,
      uid: data.uid,
      platform: data.platform,
      preference: data.preference,
      role: data.role,
      userRole: data.userRole,
      department: data.department,
      status: data.status,
      hireDate: data.hireDate,
      roleTags: data.roleTags,
      abilityTags: data.abilityTags,
      skillTags: data.skillTags,
      efficiencyTag: data.efficiencyTag,
      mentorNos: data.mentorNos,
      shiftPreferences: data.shiftPreferences,
      allowedShifts: data.allowedShifts,
      dailyStandardWorkload: data.dailyStandardWorkload,
      capacityLevel: data.capacityLevel,
      capacityRatio: data.capacityRatio,
      owedDays: data.owedDays,
      surplusDays: data.surplusDays,
      isIndividualScheduling: data.isIndividualScheduling,
    };
  }
}
