import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import type { Request } from "express";
import type {
  CreateLeaveRequestRequest,
  CreateLeaveRequestResponse,
  CurrentIdentity,
  LeaveRequestListResponse,
  LeaveRequestStatus,
  ReviewLeaveRequestResponse,
} from "@shared/api.interface";
import { LeaveRequestService } from "./leave-request.service";
import { IdentityService } from "../identity/identity.service";

const LEAVE_REQUEST_STATUSES: LeaveRequestStatus[] = [
  "pending",
  "approved",
  "rejected",
];

@Controller("api/leave-requests")
export class LeaveRequestController {
  constructor(
    private readonly leaveRequestService: LeaveRequestService,
    private readonly identityService: IdentityService,
  ) {}

  /** 列表：管理员看全部，员工仅看本人申请 */
  @NeedLogin()
  @Get()
  async list(
    @Req() req: Request,
    @Query("status") status?: string,
  ): Promise<LeaveRequestListResponse> {
    const viewer: CurrentIdentity = await this.identityService.resolve(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    const filter: LeaveRequestStatus | undefined =
      status && LEAVE_REQUEST_STATUSES.includes(status as LeaveRequestStatus)
        ? (status as LeaveRequestStatus)
        : undefined;
    return this.leaveRequestService.list(filter, viewer);
  }

  /** 新建：员工强制本人提交，管理员可代任意员工提交 */
  @Post()
  @NeedLogin()
  async create(
    @Req() req: Request,
    @Body() body: CreateLeaveRequestRequest,
  ): Promise<CreateLeaveRequestResponse> {
    const viewer: CurrentIdentity = await this.identityService.resolve(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.leaveRequestService.create(body, viewer);
  }

  @Post(":id/approve")
  @NeedLogin()
  async approve(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<ReviewLeaveRequestResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.leaveRequestService.review(id, "approved");
  }

  @Post(":id/reject")
  @NeedLogin()
  async reject(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<ReviewLeaveRequestResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.leaveRequestService.review(id, "rejected");
  }
}
