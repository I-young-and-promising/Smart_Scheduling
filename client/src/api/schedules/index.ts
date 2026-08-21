import { axiosForBackend } from "@lark-apaas/client-toolkit/utils/getAxiosForBackend";
import type {
  ApplyProposalRequest,
  ApplyProposalResponse,
  DeleteImportedScheduleResponse,
  ExportScheduleCheckResponse,
  GenerateProposalsRequest,
  GenerateProposalsResponse,
  GenerateScheduleRequest,
  GenerateScheduleResponse,
  HolidayListResponse,
  ImportHistoryScheduleRequest,
  ImportHistoryScheduleResponse,
  ListImportHistoryResponse,
  MyScheduleResponse,
  OptimizeScheduleRequest,
  OptimizeScheduleResponse,
  PublishScheduleResponse,
  RuleConfig,
  RuleConfigResponse,
  ScheduleChangeLogListResponse,
  ScheduleOverviewResponse,
  SchedulePublishInfo,
  UpdateRuleConfigResponse,
  UpdateScheduleCellRequest,
  UpdateScheduleCellResponse,
} from "@shared/api.interface";

export async function getHolidays(month: string): Promise<HolidayListResponse> {
  const response = await axiosForBackend.get<HolidayListResponse>(
    "/api/schedules/holidays",
    { params: { month } },
  );
  return response.data;
}

export async function getHolidaysByYear(
  year: string,
): Promise<HolidayListResponse> {
  const response = await axiosForBackend.get<HolidayListResponse>(
    "/api/schedules/holidays/year",
    { params: { year } },
  );
  return response.data;
}

export async function getScheduleOverview(
  month: string,
  department: string,
): Promise<ScheduleOverviewResponse> {
  const response = await axiosForBackend.get<ScheduleOverviewResponse>(
    "/api/schedules/overview",
    { params: { month, department } },
  );
  return response.data;
}

export async function generateSchedule(
  data: GenerateScheduleRequest,
): Promise<GenerateScheduleResponse> {
  const response = await axiosForBackend.post<GenerateScheduleResponse>(
    "/api/schedules/generate",
    data,
  );
  return response.data;
}

export async function updateScheduleCell(
  data: UpdateScheduleCellRequest,
): Promise<UpdateScheduleCellResponse> {
  const response = await axiosForBackend.post<UpdateScheduleCellResponse>(
    "/api/schedules/cells",
    data,
  );
  return response.data;
}

export async function importHistorySchedule(
  data: ImportHistoryScheduleRequest,
): Promise<ImportHistoryScheduleResponse> {
  const response = await axiosForBackend.post<ImportHistoryScheduleResponse>(
    "/api/schedules/import",
    data,
  );
  return response.data;
}

export async function deleteImportedSchedule(
  month: string,
  department: string,
): Promise<DeleteImportedScheduleResponse> {
  const response =
    await axiosForBackend.delete<DeleteImportedScheduleResponse>(
      "/api/schedules/imported",
      { params: { month, department } },
    );
  return response.data;
}

export async function listImportHistory(
  month: string,
  department: string,
): Promise<ListImportHistoryResponse> {
  const response = await axiosForBackend.get<ListImportHistoryResponse>(
    "/api/schedules/import-history",
    { params: { month, department } },
  );
  return response.data;
}

export async function checkExportSchedule(
  month: string,
  department: string,
): Promise<ExportScheduleCheckResponse> {
  const response = await axiosForBackend.get<ExportScheduleCheckResponse>(
    "/api/schedules/export-check",
    { params: { month, department } },
  );
  return response.data;
}

export async function exportScheduleExcel(
  month: string,
  department: string,
): Promise<Blob> {
  const response = await axiosForBackend.get<Blob>("/api/schedules/export", {
    params: { month, department },
    responseType: "blob",
  });
  return response.data;
}

export async function getPublishStatus(
  month: string,
  department: string,
): Promise<SchedulePublishInfo> {
  const response = await axiosForBackend.get<SchedulePublishInfo>(
    "/api/schedules/publish-status",
    { params: { month, department } },
  );
  return response.data;
}

export async function publishSchedule(
  month: string,
  department: string,
): Promise<PublishScheduleResponse> {
  const response = await axiosForBackend.post<PublishScheduleResponse>(
    "/api/schedules/publish",
    { month, department },
  );
  return response.data;
}

export async function getMySchedule(month: string): Promise<MyScheduleResponse> {
  const response = await axiosForBackend.get<MyScheduleResponse>(
    "/api/schedules/my",
    { params: { month } },
  );
  return response.data;
}

export async function optimizeSchedule(
  data: OptimizeScheduleRequest,
): Promise<OptimizeScheduleResponse> {
  const response = await axiosForBackend.post<OptimizeScheduleResponse>(
    "/api/schedules/optimize",
    data,
  );
  return response.data;
}

export async function getScheduleChangeLogs(
  month: string,
  department: string,
): Promise<ScheduleChangeLogListResponse> {
  const response = await axiosForBackend.get<ScheduleChangeLogListResponse>(
    "/api/schedules/change-logs",
    { params: { month, department } },
  );
  return response.data;
}

export async function generateProposals(
  data: GenerateProposalsRequest,
): Promise<GenerateProposalsResponse> {
  const response = await axiosForBackend.post<GenerateProposalsResponse>(
    "/api/schedules/proposals",
    data,
  );
  return response.data;
}

export async function applyProposal(
  data: ApplyProposalRequest,
): Promise<ApplyProposalResponse> {
  const response = await axiosForBackend.post<ApplyProposalResponse>(
    "/api/schedules/apply-proposal",
    data,
  );
  return response.data;
}

export async function getRuleConfig(
  department: string,
): Promise<RuleConfig> {
  const response = await axiosForBackend.get<RuleConfigResponse>(
    "/api/schedules/rule-config",
    { params: { department } },
  );
  return response.data.config;
}

export async function updateRuleConfig(
  config: RuleConfig,
  department: string,
): Promise<UpdateRuleConfigResponse> {
  const response = await axiosForBackend.put<UpdateRuleConfigResponse>(
    "/api/schedules/rule-config",
    { config, department },
  );
  return response.data;
}
