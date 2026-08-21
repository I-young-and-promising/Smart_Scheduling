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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
import type { EmployeeFormData } from "./employee-form-types";

interface EmployeeTagsFieldsProps {
  form: UseFormReturn<EmployeeFormData>;
}

const EmployeeTagsFields: React.FC<EmployeeTagsFieldsProps> = ({ form }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <FormField
          control={form.control}
          name="roleTags"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>角色标签</FormLabel>
              <FormControl>
                <Input
                  placeholder="如 supervisor,mentor,flexible，逗号分隔"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="abilityTags"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>能力等级标签</FormLabel>
              <FormControl>
                <Input
                  placeholder="如 veteran,level_2，逗号分隔"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <FormField
          control={form.control}
          name="skillTags"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>技能标签</FormLabel>
              <FormControl>
                <Input
                  placeholder="如 all_round,specialist，逗号分隔"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="efficiencyTag"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>效率标签</FormLabel>
              <Select
                onValueChange={(value: string) =>
                  field.onChange(value === "_empty" ? "" : value)
                }
                value={field.value || "_empty"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择效率标签" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_empty">未设置</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <FormField
          control={form.control}
          name="mentorNos"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>带教老师工号</FormLabel>
              <FormControl>
                <Input placeholder="多个工号逗号分隔" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="capacityLevel"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>产能等级</FormLabel>
              <FormControl>
                <Input placeholder="如 S / A / B / improving" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <FormField
          control={form.control}
          name="dailyStandardWorkload"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>日均标准处理量</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="如 120"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    field.onChange(
                      e.target.value === "" ? undefined : Number(e.target.value),
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="capacityRatio"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>产能系数</FormLabel>
              <FormControl>
                <Input placeholder="如 1.2" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default EmployeeTagsFields;
