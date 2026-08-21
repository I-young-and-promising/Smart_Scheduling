import { Inject, Injectable } from "@nestjs/common";
import type {
  Department,
  DepartmentListResponse,
} from "@shared/api.interface";
import {
  DEPARTMENT_REPOSITORY,
  type DepartmentRepository,
} from "./department.repository";

@Injectable()
export class DepartmentService {
  constructor(
    @Inject(DEPARTMENT_REPOSITORY)
    private readonly repository: DepartmentRepository,
  ) {}

  async list(): Promise<DepartmentListResponse> {
    return this.repository.list();
  }

  async findByCode(code: string): Promise<Department | null> {
    return this.repository.findByCode(code);
  }

  async assertDepartmentExists(code: string): Promise<void> {
    const department: Department | null = await this.findByCode(code);
    if (!department) {
      throw new Error(`部门不存在: ${code}`);
    }
  }
}
