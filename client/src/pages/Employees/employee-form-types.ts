import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  employeeNo: z.string().min(1, "工号不能为空"),
  uid: z.string().min(1, "UID 不能为空"),
  platform: z.string().min(1, "平台不能为空"),
  preference: z.enum(["none", "prefer_day", "prefer_night"]),
  role: z.string().min(1, "角色不能为空"),
  userRole: z.enum(["admin", "employee"]),
  department: z.string().min(1, "部门不能为空"),
  status: z.enum(["active", "probation", "leave", "resigned"]),
  hireDate: z.string().optional(),
  roleTags: z.string().optional(),
  abilityTags: z.string().optional(),
  skillTags: z.string().optional(),
  efficiencyTag: z.string().optional(),
  mentorNos: z.string().optional(),
  shiftPreferences: z.string().optional(),
  allowedShifts: z.string().optional(),
  dailyStandardWorkload: z.coerce.number().optional(),
  capacityLevel: z.string().optional(),
  capacityRatio: z.string().optional(),
  owedDays: z.coerce.number().default(0),
  surplusDays: z.coerce.number().default(0),
  isIndividualScheduling: z.boolean().default(false),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

export const EMPTY_FORM_VALUES: EmployeeFormData = {
  name: "",
  employeeNo: "",
  uid: "",
  platform: "飞书",
  preference: "none",
  role: "",
  userRole: "employee",
  department: "",
  status: "active",
  hireDate: "",
  roleTags: "",
  abilityTags: "",
  skillTags: "",
  efficiencyTag: "",
  mentorNos: "",
  shiftPreferences: "",
  allowedShifts: "",
  dailyStandardWorkload: undefined,
  capacityLevel: "",
  capacityRatio: "",
  owedDays: 0,
  surplusDays: 0,
  isIndividualScheduling: false,
};

export function joinTags(tags?: string[]): string {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

export function splitTags(value?: string): string[] {
  return value
    ? value
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}
