import React from "react";
import type { UseFormReturn } from "react-hook-form";
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
import { Switch } from "@client/src/components/ui/switch";
import type { ShiftFormValues } from "./types";
import { SHIFT_TYPE_OPTIONS } from "./constants";

interface BasicTabProps {
  form: UseFormReturn<ShiftFormValues>;
}

const BasicTab: React.FC<BasicTabProps> = ({ form }) => (
  <div className="space-y-4 pt-2">
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            班次名称 <span className="text-destructive">*</span>
          </FormLabel>
          <FormControl>
            <Input placeholder="如 白班" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="shiftType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>班次类型</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="选择班次类型" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {SHIFT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
    <div className="grid grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name="startTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              开始时间 <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="如 08:00" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="endTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              结束时间 <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="如 16:00" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
    <FormField
      control={form.control}
      name="crossDay"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel>是否跨日</FormLabel>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
    <div className="grid grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name="standardHours"
        render={({ field }) => (
          <FormItem>
            <FormLabel>标准工时（小时）</FormLabel>
            <FormControl>
              <Input placeholder="如 8" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="priority"
        render={({ field }) => (
          <FormItem>
            <FormLabel>优先级</FormLabel>
            <FormControl>
              <Input type="number" min={0} step={1} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
    <FormField
      control={form.control}
      name="isActive"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel>是否启用</FormLabel>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  </div>
);

export default BasicTab;
