import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/src/components/ui/form";
import { Input } from "@client/src/components/ui/input";
import { Switch } from "@client/src/components/ui/switch";
import type { EmployeeFormData } from "./employee-form-types";

interface EmployeeScheduleFieldsProps {
  form: UseFormReturn<EmployeeFormData>;
}

const EmployeeScheduleFields: React.FC<EmployeeScheduleFieldsProps> = ({
  form,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <FormField
          control={form.control}
          name="shiftPreferences"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>班次偏好白名单</FormLabel>
              <FormControl>
                <Input placeholder="如 day,night，逗号分隔" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowedShifts"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>班次权限白名单</FormLabel>
              <FormControl>
                <Input placeholder="如 day,middle,night，逗号分隔" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <FormField
          control={form.control}
          name="owedDays"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>欠工时天数</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="surplusDays"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>富余工时天数</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="isIndividualScheduling"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel>单独排班</FormLabel>
              <p className="text-xs text-muted-foreground">
                开启后该员工作为机动岗/病退组独立安排，不参与常规轮班
              </p>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
};

export default EmployeeScheduleFields;
