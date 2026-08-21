import React from "react";
import { Link, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  Employee,
  Holiday,
  ScheduleOverviewResponse,
  ShiftCode,
} from "@shared/api.interface";
import { Button } from "@client/src/components/ui/button";
import { formatMonthLabel } from "./schedule-utils";
import ScheduleCalendar, { type DayHighlight } from "./ScheduleCalendar";

interface DashboardPreviewProps {
  month: string;
  loading: boolean;
  overview: ScheduleOverviewResponse | null;
  employees: Employee[];
  holidays: Holiday[];
  highlight: DayHighlight | null;
  onMonthChange: (delta: number) => void;
  onDayClick: (date: string) => void;
  extraActions?: React.ReactNode;
}

const PREVIEW_TABS: { label: string; path: string }[] = [
  { label: "Dashboard", path: "/" },
  { label: "矩阵", path: "/schedule/matrix" },
  { label: "员工", path: "/employees" },
  { label: "设置", path: "/shift-configs" },
];

const DashboardPreview: React.FC<DashboardPreviewProps> = ({
  month,
  loading,
  overview,
  employees,
  holidays,
  highlight,
  onMonthChange,
  onDayClick,
  extraActions,
}) => {
  const cellMap: Map<string, ShiftCode> = React.useMemo(() => {
    const map: Map<string, ShiftCode> = new Map<string, ShiftCode>();
    for (const cell of overview?.cells ?? []) {
      map.set(`${cell.employeeId}|${cell.date}`, cell.shiftCode);
    }
    return map;
  }, [overview]);

  const prefixDates: string[] = React.useMemo(() => {
    const set: Set<string> = new Set<string>();
    for (const cell of overview?.prefixCells ?? []) set.add(cell.date);
    return Array.from(set).sort();
  }, [overview]);

  const prefixCellMap: Map<string, ShiftCode> = React.useMemo(() => {
    const map: Map<string, ShiftCode> = new Map<string, ShiftCode>();
    for (const cell of overview?.prefixCells ?? []) {
      map.set(`${cell.employeeId}|${cell.date}`, cell.shiftCode);
    }
    return map;
  }, [overview]);

  const violationDates: Set<string> = React.useMemo(() => {
    const set: Set<string> = new Set<string>();
    for (const warning of overview?.warnings ?? []) {
      if (warning.date) set.add(warning.date);
    }
    return set;
  }, [overview]);

  const hasData: boolean = (overview?.cells.length ?? 0) > 0;
  const { pathname } = useLocation();

  return (
    <div className="relative z-20 -mb-24 rounded-2xl border border-[#e8e6e5] bg-white p-2 shadow-[rgba(17_12_46_0.12)_0px_12px_45px_0px]">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fafaf9] px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="上个月"
            disabled={loading}
            onClick={() => onMonthChange(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-28 text-center font-mono text-sm font-semibold text-[#0c0a09]">
            {formatMonthLabel(month)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="下个月"
            disabled={loading}
            onClick={() => onMonthChange(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">{extraActions}</div>
      </div>

      <div
        className="mt-2 overflow-hidden rounded-xl"
        style={{ filter: "grayscale(1) contrast(0.94)" }}
      >
        {loading || !overview ? (
          <div className="flex h-80 items-center justify-center rounded-xl border border-[#e8e6e5] bg-white text-sm text-[#78716c]">
            正在加载预览…
          </div>
        ) : !hasData ? (
          <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-xl border border-[#e8e6e5] bg-white text-sm text-[#78716c]">
            <span>暂无排班数据，生成后在此处预览</span>
          </div>
        ) : (
          <ScheduleCalendar
            month={month}
            roster={employees}
            cellMap={cellMap}
            prefixDates={prefixDates}
            prefixCellMap={prefixCellMap}
            violationDates={violationDates}
            highlight={highlight}
            holidays={holidays}
            onDayClick={onDayClick}
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {PREVIEW_TABS.map((tab: { label: string; path: string }) => {
          const active: boolean =
            tab.path === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.label}
              to={tab.path}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-[#1c1917] text-white"
                  : "border border-[#e8e6e5] bg-transparent text-[#0c0a09] hover:bg-[#f5f5f4]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardPreview;
