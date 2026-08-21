import { axiosForBackend } from "@lark-apaas/client-toolkit/utils/getAxiosForBackend";
import type {
  CreateLeaveRequestRequest,
  CreateLeaveRequestResponse,
  LeaveRequestListResponse,
  LeaveRequestStatus,
  ReviewLeaveRequestResponse,
} from "@shared/api.interface";

export async function listLeaveRequests(
  status?: LeaveRequestStatus,
): Promise<LeaveRequestListResponse> {
  const response = await axiosForBackend.get<LeaveRequestListResponse>(
    "/api/leave-requests",
    { params: status ? { status } : {} },
  );
  return response.data;
}

export async function createLeaveRequest(
  data: CreateLeaveRequestRequest,
): Promise<CreateLeaveRequestResponse> {
  const response = await axiosForBackend.post<CreateLeaveRequestResponse>(
    "/api/leave-requests",
    data,
  );
  return response.data;
}

export async function approveLeaveRequest(
  id: string,
): Promise<ReviewLeaveRequestResponse> {
  const response = await axiosForBackend.post<ReviewLeaveRequestResponse>(
    `/api/leave-requests/${id}/approve`,
  );
  return response.data;
}

export async function rejectLeaveRequest(
  id: string,
): Promise<ReviewLeaveRequestResponse> {
  const response = await axiosForBackend.post<ReviewLeaveRequestResponse>(
    `/api/leave-requests/${id}/reject`,
  );
  return response.data;
}
