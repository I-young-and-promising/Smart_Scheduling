import { axiosForBackend } from "@lark-apaas/client-toolkit/utils/getAxiosForBackend";
import type {
  Department,
  DepartmentListResponse,
} from "@shared/api.interface";

export async function listDepartments(): Promise<DepartmentListResponse> {
  const response = await axiosForBackend.get<DepartmentListResponse>(
    "/api/departments",
  );
  return response.data;
}

export async function getDepartmentByCode(
  code: string,
): Promise<Department | null> {
  const response = await axiosForBackend.get<Department | null>(
    `/api/departments/${code}`,
  );
  return response.data;
}
