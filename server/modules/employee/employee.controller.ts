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
  CreateEmployeeResponse,
  EmployeeListResponse,
  SaveEmployeeRequest,
  UpdateEmployeeResponse,
} from "@shared/api.interface";
import { EmployeeService } from "./employee.service";
import { IdentityService } from "../identity/identity.service";

@Controller("api/employees")
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly identityService: IdentityService,
  ) {}

  @NeedLogin()
  @Get()
  async list(
    @Req() req: Request,
    @Query("keyword") keyword?: string,
    @Query("department") department?: string,
  ): Promise<EmployeeListResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.employeeService.list(keyword, department);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() body: SaveEmployeeRequest,
  ): Promise<CreateEmployeeResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.employeeService.create(body);
  }

  @NeedLogin()
  @Put(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: SaveEmployeeRequest,
  ): Promise<UpdateEmployeeResponse> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    return this.employeeService.update(id, body);
  }

  @NeedLogin()
  @Delete(":id")
  async delete(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<{ success: boolean }> {
    await this.identityService.assertAdmin(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    await this.employeeService.delete(id);
    return { success: true };
  }
}
