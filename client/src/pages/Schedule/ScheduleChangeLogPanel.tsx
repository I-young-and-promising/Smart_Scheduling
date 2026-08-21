import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { History, Loader2 } from "lucide-react";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { getScheduleChangeLogs } from "@client/src/api/schedules";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
import type { ScheduleChangeLog } from "@shared/api.interface";
import { SHIFT_META } from "./schedule-utils";

interface ScheduleChangeLogPanelProps {
  month: string;
}

const ScheduleChangeLogPanel: React.FC<ScheduleChangeLogPanelProps> = ({
  month,
}) => {
  const { currentDepartment } = useDepartment();
  const [logs, setLogs] = useState<ScheduleChangeLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await getScheduleChangeLogs(month, currentDepartment);
        setLogs(response.items);
      } catch (error: unknown) {
        logger.error("加载变更日志失败", error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [month, currentDepartment]);

  return (
    <div className="rounded-[10px] border border-[#e8e6e5] bg-white p-6 shadow-[rgba(0_0_0_0.05)_0px_4px_16px_0px]">
      <div className="mb-3 flex items-center gap-2 border-b border-[#e8e6e5] pb-3 text-sm font-medium text-[#0c0a09]">
        <History className="h-4 w-4 text-[#78716c]" />
        <span>变更审计</span>
        <span className="ml-auto text-xs text-[#78716c]">
          共 {logs.length} 条
        </span>
      </div>
      {loading ? (
        <div className="flex h-20 items-center justify-center gap-2 text-xs text-[#78716c]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          加载中…
        </div>
      ) : logs.length === 0 ? (
        <div className="py-3 text-xs text-[#78716c]">
          本月暂无手动调整或优化记录
        </div>
      ) : (
        <ul className="max-h-[320px] space-y-2 overflow-auto pr-1">
          {logs.map((log: ScheduleChangeLog) => (
            <li
              key={log.id}
              className="rounded-sm border border-[#e8e6e5] bg-[#fafaf9] p-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{log.employeeName}</span>
                <span className="text-muted-foreground">
                  {dayjs(log.scheduleDate).format("M 月 D 日")}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={SHIFT_META[log.oldShiftCode ?? "rest"].cellClass}>
                  {SHIFT_META[log.oldShiftCode ?? "rest"].label}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={SHIFT_META[log.newShiftCode].cellClass}>
                  {SHIFT_META[log.newShiftCode].label}
                </span>
                <span className="ml-auto rounded-sm bg-accent px-1.5 py-0.5 text-[10px]">
                  {log.changeType === "optimize" ? "增量优化" : "手动调整"}
                </span>
              </div>
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                {log.changedBy} · {dayjs(log.changedAt).format("MM-DD HH:mm")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ScheduleChangeLogPanel;
