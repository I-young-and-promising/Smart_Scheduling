import type { InjectionToken } from "@nestjs/common";
import type {
  CreateEmployeeResponse,
  Employee,
  SaveEmployeeRequest,
  UpdateEmployeeResponse,
} from "@shared/api.interface";

export interface EmployeeRepository {
  list(department?: string): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  findByEmployeeNo(employeeNo: string): Promise<Employee | null>;
  findByEmployeeNoInDepartment(
    employeeNo: string,
    department: string,
  ): Promise<Employee | null>;
  create(data: SaveEmployeeRequest): Promise<CreateEmployeeResponse>;
  update(id: string, data: SaveEmployeeRequest): Promise<UpdateEmployeeResponse>;
  delete(id: string): Promise<void>;
}

export const EMPLOYEE_REPOSITORY: InjectionToken = Symbol(
  "EMPLOYEE_REPOSITORY",
);
