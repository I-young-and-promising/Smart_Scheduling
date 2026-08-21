import React from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/src/components/ui/form";
import { Switch } from "@client/src/components/ui/switch";
import { Textarea } from "@client/src/components/ui/textarea";
import type { ShiftFormValues } from "./types";

interface PersonnelTabProps {
  form: UseFormReturn<ShiftFormValues>;
}

const PersonnelTab: React.FC<PersonnelTabProps> = ({ form }) => (
  <div className="space-y-4 pt-2">
    <FormField
      control={form.control}
      name="requiredRoles"
      render={({ field }) => (
        <FormItem>
          <FormLabel>所需岗位</FormLabel>
          <FormControl>
            <Textarea placeholder="多个岗位用逗号或换行分隔" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="requiredSkills"
      render={({ field }) => (
        <FormItem>
          <FormLabel>所需技能</FormLabel>
          <FormControl>
            <Textarea placeholder="多个技能用逗号或换行分隔" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="requireSupervisor"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel>需要主管在岗</FormLabel>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="requireSeniorJuniorMix"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel>需要新老搭配</FormLabel>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  </div>
);

export default PersonnelTab;
