import type { InjectionToken } from "@nestjs/common";
import type {
  Department,
  DepartmentListResponse,
} from "@shared/api.interface";

export interface DepartmentRepository {
  list(): Promise<DepartmentListResponse>;
  findByCode(code: string): Promise<Department | null>;
}

export const DEPARTMENT_REPOSITORY: InjectionToken = Symbol(
  "DEPARTMENT_REPOSITORY",
);
