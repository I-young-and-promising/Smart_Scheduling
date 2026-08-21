import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import type { Request } from "express";
import type {
  CreateShiftConfigRequest,
  ShiftConfig,
  ShiftConfigListResponse,
  UpdateShiftConfigRequest,
  UpdateShiftConfigResponse,
} from "@shared/api.interface";
import { ShiftConfigService } from "./shift-config.service";
import { IdentityService } from "../identity/identity.service";

@Controller("api/shift-configs")
@NeedLogin()
export class ShiftConfigController {
  constructor(
    private readonly shiftConfigService: ShiftConfigService,
    private readonly identityService: IdentityService,
  ) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query("department") department?: string,
  ): Promise<ShiftConfigListResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.shiftConfigService.list(department);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: CreateShiftConfigRequest,
  ): Promise<ShiftConfig> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.shiftConfigService.create(body);
  }

  @Put(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateShiftConfigRequest,
  ): Promise<UpdateShiftConfigResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.shiftConfigService.update(id, body);
  }

  @Delete(":id")
  async delete(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<{ success: boolean }> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    await this.shiftConfigService.delete(id);
    return { success: true };
  }
}
