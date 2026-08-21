import type { InjectionToken } from "@nestjs/common";
import type { ScheduleWarning } from "@shared/api.interface";

export interface ScheduleConflictRepository {
  saveWarnings(month: string, warnings: ScheduleWarning[]): Promise<number>;
}

export const SCHEDULE_CONFLICT_REPOSITORY: InjectionToken = Symbol(
  "SCHEDULE_CONFLICT_REPOSITORY",
);
