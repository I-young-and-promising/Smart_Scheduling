import type { ShiftCode, ShiftType } from "@shared/api.interface";

export const SHIFT_CODE_ORDER: ShiftCode[] = ["day", "middle", "night", "rest"];

export const SHIFT_STRIP_CLASS: Record<ShiftCode, string> = {
  day: "bg-shift-day",
  middle: "bg-shift-mid",
  night: "bg-shift-night",
  rest: "bg-shift-rest",
};

export const SHIFT_LABELS: Record<ShiftCode, string> = {
  day: "白班",
  middle: "中班",
  night: "晚班",
  rest: "休班",
};

export const SHIFT_TYPE_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: "day", label: "早班" },
  { value: "middle", label: "中班" },
  { value: "night", label: "晚班" },
  { value: "overnight", label: "通宵班" },
  { value: "admin", label: "行政班" },
  { value: "special", label: "特殊班" },
];

export const TIME_PATTERN: RegExp = /^([01]\d|2[0-3]):[0-5]\d$/u;
