import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { employee, leaveRequest } from "@server/database/schema";
import type {
  CreateLeaveRequestRequest,
  CreateLeaveRequestResponse,
  CurrentIdentity,
  LeaveRequest,
  LeaveRequestListResponse,
  LeaveRequestStatus,
  PreferenceWeight,
  ReviewLeaveRequestResponse,
} from "@shared/api.interface";

type LeaveRequestRow = typeof leaveRequest.$inferSelect;
type EmployeeRow = typeof employee.$inferSelect;

const DATE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

@Injectable()
export class LeaveRequestService {
  private readonly logger = new Logger(LeaveRequestService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 查询排休申请列表（按创建时间倒序），可选按状态过滤。
   * 员工姓名通过一次 inArray 批量查询后内存 Map 回填，避免 N+1。
   */
  async list(
    status: LeaveRequestStatus | undefined,
    viewer: CurrentIdentity,
  ): Promise<LeaveRequestListResponse> {
    if (viewer.role === "employee" && !viewer.employeeId) {
      return { items: [], total: 0 };
    }
    const conditions: SQL<unknown>[] = [];
    if (status) {
      conditions.push(eq(leaveRequest.status, status));
    }
    if (viewer.role === "employee") {
      conditions.push(eq(leaveRequest.employeeId, viewer.employeeId as string));
    }

    const rows: LeaveRequestRow[] =
      conditions.length > 0
        ? await this.db
            .select()
            .from(leaveRequest)
            .where(and(...conditions))
            .orderBy(desc(leaveRequest.createdAt))
        : await this.db
            .select()
            .from(leaveRequest)
            .orderBy(desc(leaveRequest.createdAt));

    const employeeIds: string[] = [
      ...new Set(rows.map((row: LeaveRequestRow): string => row.employeeId)),
    ];

    const nameMap: Map<string, string> = new Map<string, string>();
    if (employeeIds.length > 0) {
      const employees: EmployeeRow[] = await this.db
        .select()
        .from(employee)
        .where(inArray(employee.id, employeeIds));
      for (const emp of employees) {
        nameMap.set(emp.id, emp.name);
      }
    }

    const items: LeaveRequest[] = rows.map(
      (row: LeaveRequestRow): LeaveRequest => ({
        id: row.id,
        employeeId: row.employeeId,
        employeeName: nameMap.get(row.employeeId) ?? "未知员工",
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status as LeaveRequestStatus,
        preferenceWeight: row.preferenceWeight as PreferenceWeight,
      }),
    );

    return { items, total: items.length };
  }

  /**
   * 新建排休申请。
   * 校验：日期格式 YYYY-MM-DD 且 startDate <= endDate；员工必须存在。
   */
  async create(
    dto: CreateLeaveRequestRequest,
    viewer: CurrentIdentity,
  ): Promise<CreateLeaveRequestResponse> {
    let { employeeId, startDate, endDate } = dto;
    if (viewer.role === "employee") {
      if (!viewer.employeeId) {
        throw new BadRequestException("未找到您的员工档案，无法提交排休申请");
      }
      employeeId = viewer.employeeId;
    }

    if (
      !DATE_PATTERN.test(startDate) ||
      !DATE_PATTERN.test(endDate) ||
      startDate > endDate
    ) {
      throw new BadRequestException("开始日期不能晚于结束日期");
    }

    const existing: { id: string }[] = await this.db
      .select({ id: employee.id })
      .from(employee)
      .where(eq(employee.id, employeeId));
    if (existing.length === 0) {
      throw new NotFoundException("员工不存在");
    }

    const inserted: { id: string }[] = await this.db
      .insert(leaveRequest)
      .values({ employeeId, startDate, endDate })
      .returning({ id: leaveRequest.id });

    this.logger.log(
      `排休申请已创建: ${JSON.stringify({
        id: inserted[0].id,
        employeeId,
        startDate,
        endDate,
      })}`,
    );
    return { id: inserted[0].id };
  }

  /**
   * 审批排休申请（仅 pending 可操作）。
   * 原子条件更新，未命中时先区分"不存在"与"已审批"。
   */
  async review(
    id: string,
    action: "approved" | "rejected",
  ): Promise<ReviewLeaveRequestResponse> {
    const updated: { id: string }[] = await this.db
      .update(leaveRequest)
      .set({ status: action })
      .where(
        and(eq(leaveRequest.id, id), eq(leaveRequest.status, "pending")),
      )
      .returning({ id: leaveRequest.id });

    if (updated.length === 0) {
      const existing: { id: string }[] = await this.db
        .select({ id: leaveRequest.id })
        .from(leaveRequest)
        .where(eq(leaveRequest.id, id));
      if (existing.length === 0) {
        throw new NotFoundException("排休申请不存在");
      }
      throw new BadRequestException("该申请已审批，不可重复操作");
    }

    this.logger.log(
      `排休申请已审批: ${JSON.stringify({ id, action })}`,
    );
    return { success: true };
  }
}
