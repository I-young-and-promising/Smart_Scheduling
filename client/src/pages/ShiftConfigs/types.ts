import { z } from "zod";

const TIME_PATTERN: RegExp = /^([01]\d|2[0-3]):[0-5]\d$/u;

export const shiftFormSchema = z
  .object({
    name: z.string().min(1, "请输入班次名称"),
    shiftType: z.enum([
      "day",
      "middle",
      "night",
      "overnight",
      "admin",
      "special",
    ]),
    startTime: z.string().regex(TIME_PATTERN, "时间格式需为 HH:mm"),
    endTime: z.string().regex(TIME_PATTERN, "时间格式需为 HH:mm"),
    crossDay: z.boolean(),
    standardHours: z.string().optional(),
    minCount: z.coerce
      .number({ invalid_type_error: "请输入人数" })
      .int("请输入整数")
      .min(0, "人数不能为负数"),
    maxCount: z.coerce
      .number({ invalid_type_error: "请输入人数" })
      .int("请输入整数")
      .min(0, "人数不能为负数"),
    holidayMinCount: z.coerce
      .number({ invalid_type_error: "请输入人数" })
      .int("请输入整数")
      .min(0, "人数不能为负数"),
    holidayMaxCount: z.coerce
      .number({ invalid_type_error: "请输入人数" })
      .int("请输入整数")
      .min(0, "人数不能为负数"),
    priority: z.coerce
      .number({ invalid_type_error: "请输入优先级" })
      .int("请输入整数")
      .min(0, "优先级不能为负数"),
    isActive: z.boolean(),
    isNightShift: z.boolean(),
    isOvernight: z.boolean(),
    requireSupervisor: z.boolean(),
    requireSeniorJuniorMix: z.boolean(),
    requiredRoles: z.string(),
    requiredSkills: z.string(),
    taskCodes: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.minCount > data.maxCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minCount"],
        message: "人数下限不能大于上限",
      });
    }
    if (data.holidayMinCount > data.holidayMaxCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["holidayMinCount"],
        message: "节假日人数下限不能大于上限",
      });
    }
    const hours = data.standardHours ? Number(data.standardHours) : NaN;
    if (
      data.standardHours !== undefined &&
      data.standardHours !== "" &&
      (Number.isNaN(hours) || hours < 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["standardHours"],
        message: "标准工时格式不正确",
      });
    }
  });

export type ShiftFormValues = z.infer<typeof shiftFormSchema>;
