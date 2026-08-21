import { axiosForBackend } from "@lark-apaas/client-toolkit/utils/getAxiosForBackend";
import type {
  CreateShiftConfigRequest,
  DeleteShiftConfigResponse,
  ShiftConfig,
  ShiftConfigListResponse,
  UpdateShiftConfigRequest,
  UpdateShiftConfigResponse,
} from "@shared/api.interface";

export async function listShiftConfigs(
  department: string,
): Promise<ShiftConfigListResponse> {
  const response = await axiosForBackend.get<ShiftConfigListResponse>(
    "/api/shift-configs",
    { params: { department } },
  );
  return response.data;
}

export async function createShiftConfig(
  data: CreateShiftConfigRequest,
): Promise<ShiftConfig> {
  const response = await axiosForBackend.post<ShiftConfig>(
    "/api/shift-configs",
    data,
  );
  return response.data;
}

export async function updateShiftConfig(
  id: string,
  data: UpdateShiftConfigRequest,
): Promise<UpdateShiftConfigResponse> {
  const response = await axiosForBackend.put<UpdateShiftConfigResponse>(
    `/api/shift-configs/${id}`,
    data,
  );
  return response.data;
}

export async function deleteShiftConfig(
  id: string,
): Promise<DeleteShiftConfigResponse> {
  const response = await axiosForBackend.delete<DeleteShiftConfigResponse>(
    `/api/shift-configs/${id}`,
  );
  return response.data;
}
