import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import type { Request, Response } from "express";
import type {
  ApplyProposalRequest,
  ApplyProposalResponse,
  CurrentIdentity,
  DeleteImportedScheduleResponse,
  ExportScheduleCheckResponse,
  GenerateProposalsRequest,
  GenerateProposalsResponse,
  GenerateScheduleRequest,
  GenerateScheduleResponse,
  HolidayListResponse,
  ImportHistoryScheduleRequest,
  ImportHistoryScheduleResponse,
  ListImportHistoryResponse,
  MyScheduleResponse,
  OptimizeScheduleRequest,
  OptimizeScheduleResponse,
  PublishScheduleRequest,
  PublishScheduleResponse,
  RuleConfigResponse,
  ScheduleChangeLogListResponse,
  ScheduleOverviewResponse,
  SchedulePublishInfo,
  UpdateRuleConfigRequest,
  UpdateRuleConfigResponse,
  UpdateScheduleCellRequest,
  UpdateScheduleCellResponse,
} from "@shared/api.interface";
import { ScheduleService } from "./schedule.service";
import { IdentityService } from "../identity/identity.service";
import { RuleConfigService } from "./rule-config.service";

@Controller("api/schedules")
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly identityService: IdentityService,
    private readonly ruleConfigService: RuleConfigService,
  ) {}

  /** GET /api/schedules/overview?month=YYYY-MM&department=xxx（管理员） */
  @NeedLogin()
  @Get("overview")
  async getOverview(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("department") department: string,
  ): Promise<ScheduleOverviewResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.getOverview(month, department);
  }

  /** GET /api/schedules/holidays?month=YYYY-MM（管理员） */
  @NeedLogin()
  @Get("holidays")
  async getHolidays(
    @Req() req: Request,
    @Query("month") month: string,
  ): Promise<HolidayListResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.getHolidays(month);
  }

  /** GET /api/schedules/holidays/year?year=YYYY（管理员） */
  @NeedLogin()
  @Get("holidays/year")
  async getHolidaysByYear(
    @Req() req: Request,
    @Query("year") year: string,
  ): Promise<HolidayListResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.getHolidaysByYear(year);
  }

  /** POST /api/schedules/generate（管理员） */
  @NeedLogin()
  @Post("generate")
  async generate(
    @Req() req: Request,
    @Body() body: GenerateScheduleRequest,
  ): Promise<GenerateScheduleResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.generate({
      month: body?.month,
      months: body?.months,
      department: body?.department,
    });
  }

  /** POST /api/schedules/proposals（管理员）：生成多个候选方案 */
  @NeedLogin()
  @Post("proposals")
  async generateProposals(
    @Req() req: Request,
    @Body() body: GenerateProposalsRequest,
  ): Promise<GenerateProposalsResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.generateProposals(
      body?.month ?? "",
      body?.department,
    );
  }

  /** POST /api/schedules/apply-proposal（管理员）：保存选中的候选方案 */
  @NeedLogin()
  @Post("apply-proposal")
  async applyProposal(
    @Req() req: Request,
    @Body() body: ApplyProposalRequest,
  ): Promise<ApplyProposalResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.applyProposal(body, {
      userId: req.userContext?.userId ?? "",
      userName: req.userContext?.userName ?? "",
    });
  }

  /** POST /api/schedules/cells（管理员） */
  @NeedLogin()
  @Post("cells")
  async updateCell(
    @Req() req: Request,
    @Body() body: UpdateScheduleCellRequest,
  ): Promise<UpdateScheduleCellResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.updateCell(body, {
      userId: req.userContext?.userId ?? "",
      userName: req.userContext?.userName ?? "",
    });
  }

  /** POST /api/schedules/optimize（管理员）：基于现有班表做最小变动重排 */
  @NeedLogin()
  @Post("optimize")
  async optimize(
    @Req() req: Request,
    @Body() body: OptimizeScheduleRequest,
  ): Promise<OptimizeScheduleResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.optimize(
      {
        month: body?.month,
        months: body?.months,
        department: body?.department,
      },
      {
        userId: req.userContext?.userId ?? "",
        userName: req.userContext?.userName ?? "",
      },
    );
  }

  /** GET /api/schedules/change-logs?month=YYYY-MM&department=xxx（管理员） */
  @NeedLogin()
  @Get("change-logs")
  async changeLogs(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("department") department: string,
  ): Promise<ScheduleChangeLogListResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.listChangeLogs(month, department);
  }

  /** POST /api/schedules/import：导入历史月份班表（管理员） */
  @NeedLogin()
  @Post("import")
  async importHistory(
    @Req() req: Request,
    @Body() body: ImportHistoryScheduleRequest,
  ): Promise<ImportHistoryScheduleResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.importHistory(body);
  }

  /** GET /api/schedules/import-history?month=YYYY-MM&department=xxx（管理员） */
  @NeedLogin()
  @Get("import-history")
  async listImportHistory(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("department") department: string,
  ): Promise<ListImportHistoryResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.getImportHistory(month, department);
  }

  /** DELETE /api/schedules/imported?month=YYYY-MM&department=xxx（管理员） */
  @NeedLogin()
  @Delete("imported")
  async deleteImported(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("department") department: string,
  ): Promise<DeleteImportedScheduleResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.deleteImported(month, department);
  }

  /** GET /api/schedules/export-check?month=YYYY-MM&department=xxx：导出前校验 */
  @NeedLogin()
  @Get("export-check")
  async exportCheck(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("department") department: string,
  ): Promise<ExportScheduleCheckResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.validateExport(month, department);
  }

  /** GET /api/schedules/export?month=YYYY-MM&department=xxx → xlsx 文件流下载（管理员） */
  @NeedLogin()
  @Get("export")
  async exportSchedule(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("department") department: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    const { buffer, filename }: { buffer: Buffer; filename: string } =
      await this.scheduleService.exportExcel(month, department);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(buffer);
  }

  /** GET /api/schedules/publish-status?month=YYYY-MM&department=xxx（管理员） */
  @NeedLogin()
  @Get("publish-status")
  async publishStatus(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("department") department: string,
  ): Promise<SchedulePublishInfo> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.getPublishStatus(month, department);
  }

  /** POST /api/schedules/publish：发布班表，员工端可见（管理员） */
  @NeedLogin()
  @Post("publish")
  async publish(
    @Req() req: Request,
    @Body() body: PublishScheduleRequest,
  ): Promise<PublishScheduleResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.publishSchedule(
      body?.month,
      body?.department,
    );
  }

  /** GET /api/schedules/my?month=YYYY-MM：当前登录员工的本人班表 */
  @NeedLogin()
  @Get("my")
  async mySchedule(
    @Req() req: Request,
    @Query("month") month: string,
  ): Promise<MyScheduleResponse> {
    const identity: CurrentIdentity = await this.identityService.resolve(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.scheduleService.mySchedule(month, identity);
  }

  /** GET /api/schedules/rule-config：获取排班规则引擎配置（管理员） */
  @NeedLogin()
  @Get("rule-config")
  async getRuleConfig(@Req() req: Request): Promise<RuleConfigResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    const config = await this.ruleConfigService.load();
    return { config };
  }

  /** PUT /api/schedules/rule-config：更新排班规则引擎配置（管理员） */
  @NeedLogin()
  @Put("rule-config")
  async updateRuleConfig(
    @Req() req: Request,
    @Body() body: UpdateRuleConfigRequest,
  ): Promise<UpdateRuleConfigResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    await this.ruleConfigService.save(body?.config);
    return { success: true };
  }
}
