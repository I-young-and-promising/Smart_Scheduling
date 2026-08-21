import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { getHolidaysByYear } from "@client/src/api/schedules";
import { Button } from "@client/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@client/src/components/ui/card";
import { Badge } from "@client/src/components/ui/badge";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { cn } from "@/lib/utils";
import type { Holiday } from "@shared/api.interface";

const MONTH_LABELS: string[] = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

const WEEKDAYS: string[] = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

interface HolidayItem {
  holiday: Holiday;
  label: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  isRest: boolean;
}

const describeHoliday = (h: Holiday): HolidayItem => {
  if (h.type === "legal_holiday") {
    return h.mustWork
      ? { holiday: h, label: "法定上班", badgeVariant: "default", isRest: false }
      : { holiday: h, label: "法定节假日", badgeVariant: "destructive", isRest: true };
  }
  if (h.type === "workday_swap") {
    return { holiday: h, label: "调休上班", badgeVariant: "secondary", isRest: false };
  }
  return { holiday: h, label: "其他", badgeVariant: "outline", isRest: false };
};

const HolidaysPage: React.FC = () => {
  const [year, setYear] = useState<string>(() => dayjs().format("YYYY"));
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await getHolidaysByYear(year);
        setHolidays(response.items);
      } catch (error: unknown) {
        logger.error("获取节假日失败", error);
        setHolidays([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [year]);

  const handlePrev = (): void => {
    setYear((prev: string) => String(Number(prev) - 1));
  };

  const handleNext = (): void => {
    setYear((prev: string) => String(Number(prev) + 1));
  };

  const months = useMemo(() => {
    const result: { label: string; index: number; items: HolidayItem[] }[] = [];
    for (let i = 1; i <= 12; i += 1) {
      const monthKey = `${year}-${String(i).padStart(2, "0")}`;
      const items: HolidayItem[] = holidays
        .filter((h: Holiday) => h.date.startsWith(monthKey))
        .map((h: Holiday) => describeHoliday(h));
      result.push({ label: MONTH_LABELS[i - 1], index: i, items });
    }
    return result;
  }, [holidays, year]);

  const totalCount: number = holidays.length;
  const restCount: number = holidays.filter(
    (h: Holiday) => h.type === "legal_holiday" && !h.mustWork,
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">节假日一览</h1>
          <p className="text-sm text-muted-foreground">
            按年查看全年法定节假日与调休安排，便于统一规划休假。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePrev}
            aria-label="上一年"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[80px] text-center text-sm font-medium">
            {year}年
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNext}
            aria-label="下一年"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-[10px] border border-border bg-card p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p>
            数据来源：国务院办公厅发布的官方放假调休安排。当前已录入 2025、2026
            年法定节假日与调休上班日期，用于排班计算与休假判断。
          </p>
          <p>当前展示 {year} 年共 {totalCount} 条记录，其中法定节假日 {restCount} 天。</p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
          正在加载节假日…
        </div>
      ) : totalCount === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-[10px] border border-dashed border-border bg-card text-sm text-muted-foreground">
          {year} 年暂无节假日记录
        </div>
      ) : (
        <div
          data-ai-section-type="card-list"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {months.map((month) => (
            <Card key={month.index} className="border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border px-3 py-2">
                <span className="text-sm font-semibold">{month.label}</span>
                <span className="text-xs text-muted-foreground">
                  {month.items.length} 天
                </span>
              </CardHeader>
              <CardContent className="space-y-1 p-2">
                {month.items.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    无节假日
                  </div>
                ) : (
                  month.items.map(({ holiday, label, badgeVariant, isRest }) => {
                    const d: dayjs.Dayjs = dayjs(holiday.date);
                    return (
                      <div
                        key={holiday.date}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="w-8 text-center text-sm font-semibold">
                            {d.date()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {WEEKDAYS[d.day()]}
                          </span>
                          <span
                            className={cn(
                              "truncate text-sm",
                              isRest ? "text-danger" : "text-foreground",
                            )}
                            title={holiday.name}
                          >
                            {holiday.name}
                          </span>
                        </div>
                        <Badge variant={badgeVariant} className="shrink-0 text-[10px]">
                          {label}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HolidaysPage;
