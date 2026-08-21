import React from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@client/src/components/ui/tabs";
import type {
  CreateShiftConfigRequest,
  ShiftTaskCode,
  UpdateShiftConfigRequest,
} from "@shared/api.interface";
import BasicTab from "./BasicTab";
import CountTab from "./CountTab";
import PersonnelTab from "./PersonnelTab";
import TaskTab from "./TaskTab";
import type { ShiftFormValues } from "./types";

const parseArrayField = (value: string): string[] =>
  value
    .split(/[,，\n]/u)
    .map((item: string) => item.trim())
    .filter((item: string) => item.length > 0);

export const formatArrayField = (value: string[] | undefined): string =>
  (value ?? []).join(", ");

const parseTaskCodes = (value: string): ShiftTaskCode[] => {
  if (!value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item: unknown): item is ShiftTaskCode =>
          typeof item === "object" && item !== null && "code" in item,
      );
    }
  } catch {
    // fallthrough to line parsing
  }
  return parseArrayField(value).map((code: string) => ({
    code,
    name: code,
    minCount: null,
    maxCount: null,
  }));
};

export const formatTaskCodes = (codes: ShiftTaskCode[] | undefined): string => {
  if (!codes || codes.length === 0) return "[]";
  return JSON.stringify(
    codes.map((item: ShiftTaskCode) => ({
      code: item.code,
      name: item.name ?? item.code,
      minCount: item.minCount ?? null,
      maxCount: item.maxCount ?? null,
    })),
    null,
    2,
  );
};

export const buildRequestPayload = (
  data: ShiftFormValues,
  department: string,
): UpdateShiftConfigRequest & { department: string } => ({
  name: data.name,
  shiftType: data.shiftType,
  startTime: data.startTime,
  endTime: data.endTime,
  crossDay: data.crossDay,
  standardHours:
    data.standardHours === undefined || data.standardHours === ""
      ? undefined
      : data.standardHours,
  minCount: data.minCount,
  maxCount: data.maxCount,
  holidayMinCount: data.holidayMinCount,
  holidayMaxCount: data.holidayMaxCount,
  priority: data.priority,
  isActive: data.isActive,
  isNightShift: data.isNightShift,
  isOvernight: data.isOvernight,
  requireSupervisor: data.requireSupervisor,
  requireSeniorJuniorMix: data.requireSeniorJuniorMix,
  requiredRoles: parseArrayField(data.requiredRoles),
  requiredSkills: parseArrayField(data.requiredSkills),
  taskCodes: parseTaskCodes(data.taskCodes),
  department,
});

interface ShiftConfigFormProps {
  form: UseFormReturn<ShiftFormValues>;
}

const ShiftConfigForm: React.FC<ShiftConfigFormProps> = ({ form }) => (
  <Tabs defaultValue="basic" className="w-full">
    <TabsList className="grid w-full grid-cols-4 rounded-full">
      <TabsTrigger value="basic">基础信息</TabsTrigger>
      <TabsTrigger value="count">人数约束</TabsTrigger>
      <TabsTrigger value="personnel">人员要求</TabsTrigger>
      <TabsTrigger value="task">任务属性</TabsTrigger>
    </TabsList>
    <TabsContent value="basic">
      <BasicTab form={form} />
    </TabsContent>
    <TabsContent value="count">
      <CountTab form={form} />
    </TabsContent>
    <TabsContent value="personnel">
      <PersonnelTab form={form} />
    </TabsContent>
    <TabsContent value="task">
      <TaskTab form={form} />
    </TabsContent>
  </Tabs>
);

export default ShiftConfigForm;
