import React, { useMemo } from "react";
import dayjs from "dayjs";
import type { Employee, ShiftCode } from "@shared/api.interface";
import { cn } from "@/lib/utils";
import {
  cellKey,
  getMonthDateList,
  getWeekdayShort,
  isWeekendDate,
  SHIFT_META,
} from "./schedule-utils";

interface PlatformGroup {
  platform: string;
  members: Employee[];
}

interface ScheduleMatrixTableProps {
  month: string;
  employees: Employee[];
  cellMap: Map<string, ShiftCode>;
  onCellClick: (employee: Employee, date: string) => void;
}

const ScheduleMatrixTable: React.FC<ScheduleMatrixTableProps> = ({
  month,
  employees,
  cellMap,
  onCellClick,
}) => {
  const dates: string[] = useMemo(() => getMonthDateList(month), [month]);

  const groups: PlatformGroup[] = useMemo(() => {
    const sorted: Employee[] = [...employees].sort(
      (a: Employee, b: Employee): number => {
        if (a.platform !== b.platform) {
          return a.platform.localeCompare(b.platform);
        }
        return a.employeeNo.localeCompare(b.employeeNo);
      },
    );
    const result: PlatformGroup[] = [];
    for (const emp of sorted) {
      const last: PlatformGroup | undefined = result[result.length - 1];
      if (last && last.platform === emp.platform) {
        last.members.push(emp);
      } else {
        result.push({ platform: emp.platform, members: [emp] });
      }
    }
    return result;
  }, [employees]);

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-card">
      <div className="max-h-[calc(100vh-240px)] overflow-auto">
        <table className="border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th className="sticky left-0 z-20 min-w-[120px] border border-border bg-card px-2 py-1.5 text-left font-semibold">
                平台
              </th>
              <th className="sticky left-[120px] z-20 min-w-[80px] border border-border bg-card px-2 py-1.5 text-left font-semibold">
                姓名
              </th>
              {dates.map((date: string) => {
                const weekend: boolean = isWeekendDate(date);
                return (
                  <th
                    key={date}
                    className={cn(
                      "min-w-[44px] border border-border px-1 py-1 text-center font-semibold",
                      weekend &&
                        "bg-schedule-weekend text-schedule-weekend-foreground",
                    )}
                  >
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-xs">{date.slice(8)}</span>
                      <span className="text-[10px]">
                        {getWeekdayShort(date)}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((group: PlatformGroup) =>
              group.members.map((emp: Employee, memberIndex: number) => (
                <tr key={emp.id} className="hover:bg-accent/30">
                  {memberIndex === 0 && (
                    <td
                      rowSpan={group.members.length}
                      className="sticky left-0 z-10 border border-border bg-card px-2 py-1 align-middle text-xs font-medium text-muted-foreground"
                    >
                      {group.platform}
                    </td>
                  )}
                  <td className="sticky left-[120px] z-10 border border-border bg-card px-2 py-1">
                    <div className="flex flex-col">
                      <span className="truncate text-xs font-medium">
                        {emp.name}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {emp.employeeNo}
                      </span>
                    </div>
                  </td>
                  {dates.map((date: string) => {
                    const code: ShiftCode =
                      cellMap.get(cellKey(emp.id, date)) ?? "rest";
                    const weekend: boolean = isWeekendDate(date);
                    return (
                      <td
                        key={`${emp.id}-${date}`}
                        className={cn(
                          "border border-border p-0 text-center",
                          weekend && "bg-schedule-weekend/10",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onCellClick(emp, date)}
                          className={cn(
                            "flex h-8 w-full items-center justify-center text-xs font-medium transition-colors hover:brightness-95",
                            SHIFT_META[code].cellClass,
                          )}
                        >
                          {SHIFT_META[code].short}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleMatrixTable;
