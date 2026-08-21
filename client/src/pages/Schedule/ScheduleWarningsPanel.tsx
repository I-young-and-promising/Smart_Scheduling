import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, LocateFixed } from "lucide-react";
import type { ScheduleWarning } from "@shared/api.interface";
import { Badge } from "@client/src/components/ui/badge";
import { WARNING_TYPE_LABELS } from "./schedule-utils";

interface ScheduleWarningsPanelProps {
  warnings: ScheduleWarning[];
  onLocate: (warning: ScheduleWarning) => void;
}

const ScheduleWarningsPanel: React.FC<ScheduleWarningsPanelProps> = ({
  warnings,
  onLocate,
}) => {
  return (
    <div className="rounded-[10px] border border-[#e8e6e5] bg-white p-6 shadow-[rgba(0_0_0_0.05)_0px_4px_16px_0px]">
      <div className="flex items-center justify-between gap-2 border-b border-[#e8e6e5] pb-3">
        <h2 className="text-sm font-semibold text-[#0c0a09]">合规警告</h2>
        {warnings.length > 0 ? (
          <Badge variant="destructive" className="rounded-full font-mono">
            {warnings.length}
          </Badge>
        ) : (
          <Badge variant="secondary" className="rounded-full">
            0
          </Badge>
        )}
      </div>
      {warnings.length === 0 ? (
        <div className="flex items-center gap-2 py-5 text-xs text-[#78716c]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          本月排班全部合规，无违规项
        </div>
      ) : (
        <div className="max-h-64 overflow-auto py-2">
          {warnings.map((warning: ScheduleWarning) => {
            const locatable: boolean = Boolean(warning.employeeId && warning.date);
            return (
              <button
                key={warning.id}
                type="button"
                disabled={!locatable}
                onClick={() => onLocate(warning)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-sm py-2 pr-2 text-left",
                  locatable
                    ? "hover:bg-[#f5f5f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3ba6f1]"
                    : "cursor-default",
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-xs leading-snug">
                    {warning.message}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {WARNING_TYPE_LABELS[warning.type]}
                  </span>
                </span>
                {locatable && (
                  <LocateFixed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ScheduleWarningsPanel;
