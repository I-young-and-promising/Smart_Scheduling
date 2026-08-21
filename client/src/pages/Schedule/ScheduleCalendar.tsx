import React, { useEffect, useMemo, useRef } from "react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import type { Employee, Holiday, ShiftCode } from "@shared/api.interface";
import {
  cellKey,
  getMonthDateList,
  SHIFT_META,
} from "./schedule-utils";

export interface DayHighlight {
  date: string;
  nonce: number;
}

interface ScheduleCalendarProps {
  month: string;
  roster: Employee[];
  cellMap: Map<string, ShiftCode>;
  /** 上月下半旬日期（锁定前缀） */
  prefixDates: string[];
  prefixCellMap: Map<string, ShiftCode>;
  violationDates: Set<string>;
  highlight: DayHighlight | null;
  holidays?: Holiday[];
  onDayClick?: (date: string) => void;
}

interface DayAgg {
  day: number;
  middle: number;
  night: number;
  rest: number;
}

const WEEK_HEADERS: string[] = ["一", "二", "三", "四", "五", "六", "日"];

const emptyAgg = (): DayAgg => ({ day: 0, middle: 0, night: 0, rest: 0 });

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  month,
  roster,
  cellMap,
  prefixDates,
  prefixCellMap,
  violationDates,
  highlight,
  holidays = [],
  onDayClick,
}) => {
  const dates: string[] = useMemo(() => getMonthDateList(month), [month]);
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const holidayMap: Map<string, Holiday> = useMemo(() => {
    const map: Map<string, Holiday> = new Map<string, Holiday>();
    for (const h of holidays) {
      map.set(h.date, h);
    }
    return map;
  }, [holidays]);

  useEffect(() => {
    if (!highlight) return;
    const el: HTMLDivElement | undefined = dayRefs.current.get(highlight.date);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight]);

  const aggMap: Map<string, DayAgg> = useMemo(() => {
    const map: Map<string, DayAgg> = new Map<string, DayAgg>();
    const add = (date: string, code: ShiftCode): void => {
      let agg: DayAgg | undefined = map.get(date);
      if (!agg) {
        agg = emptyAgg();
        map.set(date, agg);
      }
      if (code === "day") agg.day += 1;
      else if (code === "middle") agg.middle += 1;
      else if (code === "night") agg.night += 1;
      else agg.rest += 1;
    };
    for (const emp of roster) {
      for (const date of dates) {
        add(date, cellMap.get(cellKey(emp.id, date)) ?? "rest");
      }
      for (const date of prefixDates) {
        add(date, prefixCellMap.get(cellKey(emp.id, date)) ?? "rest");
      }
    }
    return map;
  }, [roster, dates, prefixDates, cellMap, prefixCellMap]);

  const leadingBlanks: number = useMemo(
    () => (dayjs(`${month}-01`).day() + 6) % 7,
    [month],
  );
  const totalCells: number = Math.ceil((leadingBlanks + dates.length) / 7) * 7;
  const today: string = dayjs().format("YYYY-MM-DD");

  const renderCountCell = (
    date: string,
    dimmed: boolean,
  ): React.ReactElement => {
    const agg: DayAgg = aggMap.get(date) ?? emptyAgg();
    const onDuty: number = agg.day + agg.middle + agg.night;
    const weekend: boolean = [0, 6].includes(dayjs(date).day());
    const violated: boolean = violationDates.has(date);
    const isToday: boolean = date === today;
    const isHighlighted: boolean = highlight?.date === date;
    const clickable: boolean = onDayClick !== undefined;
    const holiday: Holiday | undefined = holidayMap.get(date);
    return (
      <div
        key={date}
        ref={(el: HTMLDivElement | null) => {
          if (el) dayRefs.current.set(date, el);
          else dayRefs.current.delete(date);
        }}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? () => onDayClick?.(date) : undefined}
        onKeyDown={
          clickable
            ? (e: React.KeyboardEvent<HTMLDivElement>): void => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDayClick?.(date);
                }
              }
            : undefined
        }
        className={cn(
          "relative flex min-h-[104px] flex-col gap-1 rounded-sm border border-border bg-card p-1.5",
          clickable && "cursor-pointer hover:border-primary/60 hover:bg-accent/40",
          weekend && "bg-schedule-weekend/20",
          dimmed && "opacity-60",
          isToday && "border-primary",
          violated && !isHighlighted && "ring-2 ring-danger ring-inset",
          isHighlighted && "animate-pulse ring-2 ring-primary ring-inset",
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-semibold",
              isToday
                ? "bg-primary text-primary-foreground"
                : weekend
                  ? "bg-schedule-weekend text-schedule-weekend-foreground"
                  : "text-foreground",
            )}
          >
            {Number(date.slice(8))}
          </span>
          {holiday && (
            <span
              className={cn(
                "truncate text-[10px] font-medium",
                holiday.type === "workday_swap"
                  ? "text-primary"
                  : "text-danger",
              )}
              title={holiday.name}
            >
              {holiday.name}
            </span>
          )}
          {dimmed && !holiday && (
            <span className="text-[10px] text-muted-foreground">上月</span>
          )}
          {violated && (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <span
            className={cn(
              "flex items-center justify-between rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
              SHIFT_META.day.cellClass,
            )}
          >
            <span>早</span>
            <span className="font-mono">{agg.day}</span>
          </span>
          <span
            className={cn(
              "flex items-center justify-between rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
              SHIFT_META.middle.cellClass,
            )}
          >
            <span>中</span>
            <span className="font-mono">{agg.middle}</span>
          </span>
          <span
            className={cn(
              "flex items-center justify-between rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
              SHIFT_META.night.cellClass,
            )}
          >
            <span>晚</span>
            <span className="font-mono">{agg.night}</span>
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            休 <span className="font-mono">{agg.rest}</span>
          </span>
          <span>
            在岗 <span className="font-mono font-medium text-foreground">{onDuty}</span>
          </span>
        </div>
      </div>
    );
  };

  const prefixSet: Set<string> = new Set<string>(prefixDates);

  return (
    <div className="rounded-sm border border-border bg-card p-3">
      <div className="grid grid-cols-7 gap-1">
        {WEEK_HEADERS.map((label: string, idx: number) => (
          <div
            key={label}
            className={cn(
              "py-1 text-center text-xs font-semibold",
              idx >= 5
                ? "rounded-sm bg-schedule-weekend text-schedule-weekend-foreground"
                : "text-foreground",
            )}
          >
            {label}
          </div>
        ))}
        {Array.from(
          { length: totalCells },
          (_: unknown, index: number): React.ReactElement => {
            const dayOffset: number = index - leadingBlanks;
            if (dayOffset < 0) {
              const prevDate: string = dayjs(`${month}-01`)
                .add(dayOffset, "day")
                .format("YYYY-MM-DD");
              if (prefixSet.has(prevDate)) return renderCountCell(prevDate, true);
              return <div key={`blank-${index}`} />;
            }
            if (dayOffset >= dates.length) {
              return <div key={`blank-${index}`} />;
            }
            return renderCountCell(dates[dayOffset], false);
          },
        )}
      </div>
    </div>
  );
};

export default ScheduleCalendar;
