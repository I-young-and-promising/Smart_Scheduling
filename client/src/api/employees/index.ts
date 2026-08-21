import { axiosForBackend } from "@lark-apaas/client-toolkit/utils/getAxiosForBackend";
import type {
  CreateEmployeeResponse,
  EmployeeListResponse,
  SaveEmployeeRequest,
  UpdateEmployeeResponse,
} from "@shared/api.interface";

export async function listEmployees(
  keyword?: string,
  department?: string,
): Promise<EmployeeListResponse> {
  const response = await axiosForBackend.get<EmployeeListResponse>(
    "/api/employees",
    {
      params: {
        ...(keyword ? { keyword } : {}),
        ...(department ? { department } : {}),
      },
    },
  );
  return response.data;
}

export async function createEmployee(
  data: SaveEmployeeRequest,
): Promise<CreateEmployeeResponse> {
  const response = await axiosForBackend.post<CreateEmployeeResponse>(
    "/api/employees",
    data,
  );
  return response.data;
}

export async function updateEmployee(
  id: string,
  data: SaveEmployeeRequest,
): Promise<UpdateEmployeeResponse> {
  const response = await axiosForBackend.put<UpdateEmployeeResponse>(
    `/api/employees/${id}`,
    data,
  );
  return response.data;
}

export async function deleteEmployee(
  id: string,
): Promise<{ success: boolean }> {
  const response = await axiosForBackend.delete<{ success: boolean }>(
    `/api/employees/${id}`,
  );
  return response.data;
}
