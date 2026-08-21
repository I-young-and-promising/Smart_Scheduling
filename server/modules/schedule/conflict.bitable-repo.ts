import { Injectable } from "@nestjs/common";
import {
  BitableClient,
  dateField,
  sleep,
  textField,
} from "@server/common/bitable";
import type { ScheduleWarning } from "@shared/api.interface";
import type { ScheduleConflictRepository } from "./conflict.repository";

@Injectable()
export class ScheduleConflictBitableRepository
  implements ScheduleConflictRepository
{
  private readonly pluginInstanceId =
    "feishu_multitable_crud_agg_analysis_6";

  constructor(private readonly client: BitableClient) {}

  async saveWarnings(month: string, warnings: ScheduleWarning[]): Promise<number> {
    if (warnings.length === 0) return 0;

    const records: Array<{ record: Record<string, unknown> }> = [];
    for (const warning of warnings) {
      records.push({
        record: {
          月份: textField(month),
          违规日期: warning.date ? dateField(warning.date) : undefined,
          员工: textField(warning.employeeId ?? ""),
          冲突类型: textField(warning.type),
          冲突描述: textField(warning.message),
          处理状态: textField("待处理"),
        },
      });
    }

    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      await this.client.call<{ records: Array<{ id: string }> }>(
        this.pluginInstanceId,
        "batchAddRecords",
        { records: chunk },
      );
      if (records.length > 500) await sleep(100);
    }
    return warnings.length;
  }
}
