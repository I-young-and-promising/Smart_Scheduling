import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, UserRound } from "lucide-react";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { getMySchedule } from "@client/src/api/schedules";
import { Button } from "@client/src/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@client/src/components/ui/empty";
import { extractApiErrorMessage } from "@client/src/utils/api-error";
import { cn } from "@/lib/utils";
import type { MyScheduleDay, MyScheduleResponse } from "@shared/api.interface";
import { formatMonthLabel, SHIFT_META } from "../Schedule/schedule-utils";

const WEEK_HEADERS: string[] = ["一", "二", "三", "四", "五", "六", "日"];

const MySchedulePage: React.FC = () => {
  const [month, setMonth] = useState<string>(() => dayjs().format("YYYY-MM"));
  const [data, setData] = useState<MyScheduleResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestRef = useRef<number>(0);

  const reload = useCallback(async (): Promise<void> => {
    const requestId: number = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setErrorMessage(null);
    try {
      const response: MyScheduleResponse = await getMySchedule(month);
      if (requestRef.current === requestId) {
        setData(response);
      }
    } catch (error: unknown) {
      logger.error("获取我的班表失败", error);
      if (requestRef.current === requestId) {
        setData(null);
        setErrorMessage(
          extractApiErrorMessage(error, "班表加载失败，请刷新重试"),
        );
      }
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [month]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const stats = useMemo(() => {
    const days: MyScheduleDay[] = data?.days ?? [];
    return {
      work: days.filter((day: MyScheduleDay): boolean => day.status === "work")
        .length,
      night: days.filter(
        (day: MyScheduleDay): boolean =>
          day.status === "work" && day.shiftCode === "night",
      ).length,
      off: days.filter(
        (day: MyScheduleDay): boolean => day.status !== "work",
      ).length,
    };
  }, [data]);

  const leadingBlanks = useMemo(() => {
    const offset: number = (dayjs(`${month}-01`).day() + 6) % 7;
    return Array.from(
      { length: offset },
      (_: unknown, index: number): number => index,
    );
  }, [month]);

  const today: string = dayjs().format("YYYY-MM-DD");

  const changeMonth = (delta: number): void => {
    setMonth((prev: string) =>
      dayjs(`${prev}-01`).add(delta, "month").format("YYYY-MM"),
    );
  };

  const noProfile: boolean =
    !!data && data.employeeName === null && data.days.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">我的班表</h1>
        <p className="text-sm text-muted-foreground">
          {data?.employeeName
            ? `${data.employeeName} · ${formatMonthLabel(month)}`
            : "查看您的月度排班与班次时段"}
        </p>
      </div>

      <div className="rounded-sm border border-border bg-accent/50 px-4 py-2.5 text-xs text-muted-foreground">
        如需调整班次，请通过「我的排休」提交申请，管理员审批通过后会自动更新班表。
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="上个月"
            disabled={loading}
            onClick={() => changeMonth(-1)}
            data-ai-section-type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-28 text-center font-mono text-sm font-semibold">
            {formatMonthLabel(month)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="下个月"
            disabled={loading}
            onClick={() => changeMonth(1)}
            data-ai-section-type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {data && !loading && !noProfile && data.isPublished && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>上班 {stats.work} 天</span>
            <span>·</span>
            <span>晚班 {stats.night} 天</span>
            <span>·</span>
            <span>休假 {stats.off} 天</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2 rounded-sm border border-border bg-card text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中…
        </div>
      ) : errorMessage !== null ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-sm border border-border bg-card text-sm text-muted-foreground">
          <span>{errorMessage}</span>
          <Button
            variant="outline"
            onClick={() => void reload()}
            data-ai-section-type="button"
          >
            重新加载
          </Button>
        </div>
      ) : noProfile ? (
        <div className="rounded-sm border border-border bg-card">
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserRound className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>未关联员工档案</EmptyTitle>
              <EmptyDescription>
                未关联员工档案，请联系 HR 在员工管理中绑定您的账号
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : data && !data.isPublished ? (
        <div className="rounded-sm border border-border bg-card">
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>班表尚未发布</EmptyTitle>
              <EmptyDescription>
                本月班表尚未发布，请在 HR 发布后查看
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : data ? (
        <div className="rounded-sm border border-border bg-card p-3">
          <div className="grid grid-cols-7 gap-1">
            {WEEK_HEADERS.map((label: string) => (
              <div
                key={label}
                className="py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {leadingBlanks.map((index: number) => (
              <div key={`blank-${index}`} />
            ))}
            {data.days.map((day: MyScheduleDay) => {
              const isToday: boolean = day.date === today;
              const isOff: boolean = day.status !== "work";
              const isWork: boolean = day.status === "work";
              return (
                <div
                  key={day.date}
                  className={cn(
                    "flex min-h-[76px] flex-col gap-1 rounded-sm border border-border bg-background p-1.5 sm:min-h-[92px]",
                    isToday && "border-primary",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-xs font-medium",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground",
                    )}
                  >
                    {dayjs(day.date).date()}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-sm py-0.5 text-xs font-medium",
                      isOff
                        ? "bg-shift-leave text-shift-leave-foreground"
                        : SHIFT_META[day.shiftCode].cellClass,
                    )}
                  >
                    {isOff
                      ? "休假"
                      : day.shiftName || SHIFT_META[day.shiftCode].label}
                  </span>
                  {isWork && day.startTime && day.endTime && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {day.startTime}-{day.endTime}
                      {day.crossDay ? " +1天" : ""}
                    </span>
                  )}
                  {day.teammates && day.teammates.length > 0 && (
                    <span className="mt-auto line-clamp-1 text-[10px] text-muted-foreground">
                      搭档：{day.teammates.join("、")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MySchedulePage;
