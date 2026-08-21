import dayjs from "dayjs";
import type {
  ScheduleWarningType,
  ShiftCode,
} from "@shared/api.interface";

export interface ShiftMeta {
  label: string;
  short: string;
  cellClass: string;
}

export const SHIFT_META: Record<ShiftCode, ShiftMeta> = {
  day: {
    label: "白班",
    short: "白",
    cellClass: "bg-shift-day text-shift-day-foreground",
  },
  middle: {
    label: "中班",
    short: "中",
    cellClass: "bg-shift-mid text-shift-mid-foreground",
  },
  night: {
    label: "晚班",
    short: "晚",
    cellClass: "bg-shift-night text-shift-night-foreground",
  },
  rest: {
    label: "休班",
    short: "休",
    cellClass: "bg-schedule-weekend text-foreground",
  },
};

export const SHIFT_ORDER: ShiftCode[] = ["day", "middle", "night", "rest"];

export const WARNING_TYPE_LABELS: Record<ScheduleWarningType, string> = {
  transition: "班次衔接违规",
  night_rest: "晚班后未休班",
  night_limit: "夜班超上限",
  week_limit: "周工作超限",
  daily_limit: "每日人数越界",
  rest_limit: "连续休息超限",
  day_limit: "连续白班超限",
  night_rest_days: "夜班后休息不足",
  mentor_sync: "新员工带教班次不同步",
  efficiency_mix: "高低效率员工未搭配",
  work_balance: "工时结余安排不均衡",
  supervisor_missing: "主管缺位",
  senior_junior_mix: "新老搭配不足",
  fixed_leave: "固定休假冲突",
  unavailable_time: "员工不可用时间",
  min_rest_block: "连续休息不足",
  min_work_block: "连续工作不足",
  night_preference: "晚班偏好冲突",
  double_rest: "连续双休不足",
  workday_distribution: "工作日分布不均",
};

export const cellKey = (employeeId: string, date: string): string =>
  `${employeeId}|${date}`;

export const getMonthDateList = (month: string): string[] => {
  const start = dayjs(`${month}-01`);
  const days: number = start.daysInMonth();
  const dates: string[] = [];
  for (let i: number = 0; i < days; i += 1) {
    dates.push(start.add(i, "day").format("YYYY-MM-DD"));
  }
  return dates;
};

const WEEKDAY_SHORT: string[] = ["日", "一", "二", "三", "四", "五", "六"];

export const isWeekendDate = (date: string): boolean => {
  const day: number = dayjs(date).day();
  return day === 0 || day === 6;
};

export const getWeekdayShort = (date: string): string =>
  WEEKDAY_SHORT[dayjs(date).day()] ?? "";

export const formatMonthLabel = (month: string): string => {
  const m = dayjs(`${month}-01`);
  return `${m.year()} 年 ${m.month() + 1} 月`;
};

export { extractApiErrorMessage } from "@client/src/utils/api-error";
