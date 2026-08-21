import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { eq, or } from "drizzle-orm";
import { employee } from "@server/database/schema";
import type { CurrentIdentity } from "@shared/api.interface";

/** 演示员工：未在花名册中匹配到的登录用户默认落到该员工档案，方便体验 */
const DEMO_EMPLOYEE_NO: string = "001";

/**
 * 身份解析：所有已登录用户统一视为管理员；未登录访客按 employee 最小权限兜底。
 * 登录用户仍尝试映射到员工花名册（命中用本人档案，未命中落到演示员工）。
 */
@Injectable()
export class IdentityService {
  private readonly logger: Logger = new Logger(IdentityService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async resolve(
    userId: string | undefined,
    userName?: string,
  ): Promise<CurrentIdentity> {
    if (!userId) {
      return { userId: "", role: "employee", employeeId: null, name: "" };
    }
    const rows = await this.db
      .select({
        id: employee.id,
        name: employee.name,
      })
      .from(employee)
      .where(or(eq(employee.uid, userId), eq(employee.employeeNo, userId)))
      .limit(1);
    if (rows.length > 0) {
      const matched = rows[0];
      return {
        userId,
        role: "admin",
        employeeId: matched.id,
        name: matched.name,
      };
    }
    const demo = await this.db
      .select({ id: employee.id, name: employee.name })
      .from(employee)
      .where(eq(employee.employeeNo, DEMO_EMPLOYEE_NO))
      .limit(1);
    if (demo.length > 0) {
      return {
        userId,
        role: "admin",
        employeeId: demo[0].id,
        name: demo[0].name,
      };
    }
    return { userId, role: "admin", employeeId: null, name: userName ?? "" };
  }

  /** 管理端门禁：非 admin 一律拒绝 */
  async assertAdmin(
    userId: string | undefined,
    userName?: string,
  ): Promise<CurrentIdentity> {
    const identity: CurrentIdentity = await this.resolve(userId, userName);
    if (identity.role !== "admin") {
      throw new ForbiddenException("该操作仅管理员可用");
    }
    return identity;
  }
}
