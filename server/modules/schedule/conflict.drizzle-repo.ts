import { Injectable } from "@nestjs/common";
import type { ScheduleWarning } from "@shared/api.interface";
import type { ScheduleConflictRepository } from "./conflict.repository";

@Injectable()
export class ScheduleConflictDrizzleRepository
  implements ScheduleConflictRepository
{
  async saveWarnings(_month: string, _warnings: ScheduleWarning[]): Promise<number> {
    return 0;
  }
}
