import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateEmployeeResponse,
  Employee,
  EmployeeListResponse,
  EmployeePreference,
  EmployeeStatus,
  SaveEmployeeRequest,
  UpdateEmployeeResponse,
  UserRole,
} from "@shared/api.interface";
import { DepartmentService } from "@server/modules/department/department.service";
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRepository,
} from "./employee.repository";

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
export class EmployeeService {
  private readonly logger: Logger = new Logger(EmployeeService.name);

  constructor(
    @Inject(EMPLOYEE_REPOSITORY)
    private readonly repository: EmployeeRepository,
    private readonly departmentService: DepartmentService,
  ) {}

  async list(
    keyword?: string,
    department?: string,
  ): Promise<EmployeeListResponse> {
    if (department) {
      await this.departmentService.assertDepartmentExists(department);
    }
    const items: Employee[] = await this.repository.list(department);
    const trimmed: string = (keyword ?? "").trim();
    if (!trimmed) {
      return { items, total: items.length };
    }
    const lowerKeyword: string = trimmed.toLowerCase();
    const filtered: Employee[] = items.filter(
      (item: Employee) =>
        item.name.toLowerCase().includes(lowerKeyword) ||
        item.employeeNo.toLowerCase().includes(lowerKeyword) ||
        item.uid.toLowerCase().includes(lowerKeyword),
    );
    return { items: filtered, total: filtered.length };
  }

  async create(data: SaveEmployeeRequest): Promise<CreateEmployeeResponse> {
    this.validateFields(data);
    await this.departmentService.assertDepartmentExists(data.department);
    const existing: Employee | null =
      await this.repository.findByEmployeeNoInDepartment(
        data.employeeNo,
        data.department,
      );
    if (existing) {
      throw new ConflictException("该部门下员工工号已存在");
    }
    const response: CreateEmployeeResponse =
      await this.repository.create(data);
    this.logger.log(
      `员工创建成功 id=${response.id} 工号=${data.employeeNo} 部门=${data.department}`,
    );
    return response;
  }

  async update(
    id: string,
    data: SaveEmployeeRequest,
  ): Promise<UpdateEmployeeResponse> {
    this.validateFields(data);
    await this.departmentService.assertDepartmentExists(data.department);
    const target: Employee | null = await this.repository.findById(id);
    if (!target) {
      throw new NotFoundException("员工不存在");
    }
    if (
      target.employeeNo !== data.employeeNo ||
      target.department !== data.department
    ) {
      const conflict: Employee | null =
        await this.repository.findByEmployeeNoInDepartment(
          data.employeeNo,
          data.department,
        );
      if (conflict && conflict.id !== id) {
        throw new ConflictException("该部门下员工工号已存在");
      }
    }
    const response: UpdateEmployeeResponse =
      await this.repository.update(id, data);
    this.logger.log(
      `员工更新成功 id=${id} 工号=${data.employeeNo} 部门=${data.department}`,
    );
    return response;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    this.logger.log(`员工删除成功 id=${id}`);
  }

  private validateFields(data: SaveEmployeeRequest): void {
    this.assertPreference(data.preference);
    this.assertUserRole(data.userRole);
    this.assertStatus(data.status);
    if (!data.department) {
      throw new BadRequestException("部门不能为空");
    }
  }

  private assertPreference(preference: EmployeePreference): void {
    if (!VALID_PREFERENCES.includes(preference)) {
      throw new BadRequestException("无效的班次偏好");
    }
  }

  private assertUserRole(userRole: UserRole): void {
    if (!VALID_USER_ROLES.includes(userRole)) {
      throw new BadRequestException("无效的系统角色");
    }
  }

  private assertStatus(status: EmployeeStatus): void {
    if (!VALID_STATUSES.includes(status)) {
      throw new BadRequestException("无效的员工状态");
    }
  }
}
