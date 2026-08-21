import { Controller, Get, Param } from "@nestjs/common";
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import type {
  Department,
  DepartmentListResponse,
} from "@shared/api.interface";
import { DepartmentService } from "./department.service";

@Controller("api/departments")
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @NeedLogin()
  @Get()
  async list(): Promise<DepartmentListResponse> {
    return this.departmentService.list();
  }

  @NeedLogin()
  @Get(":code")
  async getByCode(@Param("code") code: string): Promise<Department | null> {
    return this.departmentService.findByCode(code);
  }
}
