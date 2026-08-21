import React from "react";
import { cn } from "@/lib/utils";
import type { DailyShiftStat } from "@shared/api.interface";
import { Badge } from "@client/src/components/ui/badge";
import { getWeekdayShort, isWeekendDate, SHIFT_META } from "./schedule-utils";

interface ScheduleDailyStatsProps {
  dailyStats: DailyShiftStat[];
}

const ScheduleDailyStats: React.FC<ScheduleDailyStatsProps> = ({
  dailyStats,
}) => {
  const overLimitCount: number = dailyStats.filter(
    (stat: DailyShiftStat) => stat.overLimit,
  ).length;

  return (
    <div className="rounded-[10px] border border-[#e8e6e5] bg-white p-6 shadow-[rgba(0_0_0_0.05)_0px_4px_16px_0px]">
      <div className="flex items-center justify-between gap-2 border-b border-[#e8e6e5] pb-3">
        <h2 className="text-sm font-semibold text-[#0c0a09]">每日在岗统计</h2>
        {overLimitCount > 0 ? (
          <Badge variant="destructive" className="rounded-full font-mono">
            {overLimitCount} 天越界
          </Badge>
        ) : (
          <Badge variant="secondary" className="rounded-full">
            人数全部达标
          </Badge>
        )}
      </div>
        {dailyStats.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#78716c]">
            暂无排班数据，生成排班后展示统计
          </p>
        ) : (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-[#e8e6e5] text-[#78716c]">
                  <th className="py-2 pl-0 pr-2 text-left font-medium">日期</th>
                  <th className="px-2 py-2 text-center font-medium">白班</th>
                  <th className="px-2 py-2 text-center font-medium">中班</th>
                  <th className="py-2 pl-2 pr-0 text-center font-medium">晚班</th>
              </tr>
            </thead>
            <tbody>
              {dailyStats.map((stat: DailyShiftStat) => (
                <tr
                  key={stat.date}
                  className={cn(
                    "border-b border-[#e8e6e5] last:border-b-0",
                    stat.overLimit && "bg-danger/10",
                  )}
                >
                  <td
                    className={cn(
                      "py-1.5 pl-0 pr-2 font-mono",
                      stat.overLimit
                        ? "font-medium text-danger"
                        : isWeekendDate(stat.date)
                          ? "text-[#78716c]"
                          : "text-[#0c0a09]",
                    )}
                  >
                    {stat.date.slice(5)} 周{getWeekdayShort(stat.date)}
                  </td>
                  <td className="py-1.5 text-center">
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-7 items-center justify-center rounded-sm px-1 font-mono text-[11px]",
                        SHIFT_META.day.cellClass,
                      )}
                    >
                      {stat.dayCount}
                    </span>
                  </td>
                  <td className="py-1.5 text-center">
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-7 items-center justify-center rounded-sm px-1 font-mono text-[11px]",
                        SHIFT_META.middle.cellClass,
                      )}
                    >
                      {stat.middleCount}
                    </span>
                  </td>
                  <td className="py-1.5 pl-2 pr-0 text-center">
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-7 items-center justify-center rounded-sm px-1 font-mono text-[11px]",
                        SHIFT_META.night.cellClass,
                      )}
                    >
                      {stat.nightCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ScheduleDailyStats;
