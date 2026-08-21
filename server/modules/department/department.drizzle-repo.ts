import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { asc, eq } from "drizzle-orm";
import { department } from "@server/database/schema";
import type {
  Department,
  DepartmentListResponse,
} from "@shared/api.interface";
import type { DepartmentRepository } from "./department.repository";

@Injectable()
export class DepartmentDrizzleRepository implements DepartmentRepository {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(): Promise<DepartmentListResponse> {
    const rows: Department[] = await this.db
      .select({
        id: department.id,
        code: department.code,
        name: department.name,
        description: department.description,
        orderIndex: department.orderIndex,
      })
      .from(department)
      .orderBy(asc(department.orderIndex), asc(department.code));
    return { items: rows };
  }

  async findByCode(code: string): Promise<Department | null> {
    const rows: Department[] = await this.db
      .select({
        id: department.id,
        code: department.code,
        name: department.name,
        description: department.description,
        orderIndex: department.orderIndex,
      })
      .from(department)
      .where(eq(department.code, code));
    return rows.length > 0 ? rows[0] : null;
  }
}
