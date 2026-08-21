import React from "react";
import type { EmployeeNightCount } from "@shared/api.interface";
import { Badge } from "@client/src/components/ui/badge";

interface ScheduleNightCountsProps {
  nightCounts: EmployeeNightCount[];
  nightLimit: number;
}

const ScheduleNightCounts: React.FC<ScheduleNightCountsProps> = ({
  nightCounts,
  nightLimit,
}) => {
  const sorted: EmployeeNightCount[] = [...nightCounts].sort(
    (a: EmployeeNightCount, b: EmployeeNightCount): number => b.count - a.count,
  );
  const maxCount: number = sorted.length > 0 ? sorted[0].count : 0;
  const minCount: number = sorted.length > 0 ? sorted[sorted.length - 1].count : 0;

  return (
    <div className="rounded-[10px] border border-[#e8e6e5] bg-white p-6 shadow-[rgba(0_0_0_0.05)_0px_4px_16px_0px]">
      <div className="flex items-center justify-between gap-2 border-b border-[#e8e6e5] pb-3">
        <h2 className="text-sm font-semibold text-[#0c0a09]">晚班天数</h2>
        <span className="text-[11px] text-muted-foreground">
          月度上限 {nightLimit} 天 · 极差 {maxCount - minCount}
        </span>
      </div>
      <div className="max-h-56 overflow-auto py-2">
        {sorted.map((item: EmployeeNightCount) => (
          <div
            key={item.employeeId}
            className="flex items-center justify-between gap-2 border-b border-[#e8e6e5] py-1.5 last:border-b-0"
          >
            <span className="truncate text-xs text-[#0c0a09]">{item.employeeName}</span>
            <Badge
              variant={item.count > nightLimit ? "destructive" : "secondary"}
              className="rounded-full font-mono"
            >
              {item.count} 天
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleNightCounts;
