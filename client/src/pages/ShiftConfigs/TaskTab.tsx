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

interface TaskTabProps {
  form: UseFormReturn<ShiftFormValues>;
}

const TaskTab: React.FC<TaskTabProps> = ({ form }) => (
  <div className="space-y-4 pt-2">
    <FormField
      control={form.control}
      name="isNightShift"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel>是否夜班</FormLabel>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="isOvernight"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel>是否通宵班</FormLabel>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="taskCodes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>任务编码（JSON 数组）</FormLabel>
          <FormControl>
            <Textarea
              placeholder='如 [{"code":"task-a","name":"任务A"}]'
              rows={6}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

export default TaskTab;
