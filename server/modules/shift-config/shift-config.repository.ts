import type {
  CreateShiftConfigRequest,
  ShiftConfig,
  UpdateShiftConfigRequest,
  UpdateShiftConfigResponse,
} from "@shared/api.interface";

export interface ShiftConfigRepository {
  list(department?: string): Promise<ShiftConfig[]>;
  findById(id: string): Promise<ShiftConfig | null>;
  findByDepartmentAndCode(
    department: string,
    code: string,
  ): Promise<ShiftConfig | null>;
  create(data: CreateShiftConfigRequest): Promise<ShiftConfig>;
  update(
    id: string,
    data: UpdateShiftConfigRequest,
  ): Promise<UpdateShiftConfigResponse>;
  delete(id: string): Promise<void>;
}

export const SHIFT_CONFIG_REPOSITORY = Symbol("SHIFT_CONFIG_REPOSITORY");
