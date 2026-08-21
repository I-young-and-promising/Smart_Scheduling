import React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@client/src/components/ui/button";
import { Calendar } from "@client/src/components/ui/calendar";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/src/components/ui/form";
import { Input } from "@client/src/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@client/src/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
import { cn } from "@/lib/utils";
import type { EmployeeFormData } from "./employee-form-types";

interface EmployeeBasicFieldsProps {
  form: UseFormReturn<EmployeeFormData>;
}

const EmployeeBasicFields: React.FC<EmployeeBasicFieldsProps> = ({ form }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>
                姓名 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="请输入姓名" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="employeeNo"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>
                工号 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="如 E001" className="font-mono" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <FormField
          control={form.control}
          name="uid"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>
                UID <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="平台用户 ID" className="font-mono" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>
                平台 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="如 飞书" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>
                部门 <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cs1">客服 1 部</SelectItem>
                  <SelectItem value="cs2">客服 2 部</SelectItem>
                  <SelectItem value="change">改签部</SelectItem>
                  <SelectItem value="ticket">出票部</SelectItem>
                  <SelectItem value="refund">退票部</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>
                状态 <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">在岗</SelectItem>
                  <SelectItem value="probation">试用期</SelectItem>
                  <SelectItem value="leave">休假中</SelectItem>
                  <SelectItem value="resigned">离职</SelectItem>
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
          name="hireDate"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>入职时间</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value ? (
                        format(new Date(field.value), "yyyy-MM-dd")
                      ) : (
                        <span>选择日期</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date: Date | undefined) =>
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="userRole"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>
                系统角色 <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择系统角色" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="employee">普通员工</SelectItem>
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
          name="role"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>
                业务角色 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="如 客服专员" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preference"
          render={({ field }) => (
            <FormItem className="min-w-[160px] flex-1">
              <FormLabel>
                偏好标签 <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择偏好标签" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">无偏好</SelectItem>
                  <SelectItem value="prefer_day">偏好白班</SelectItem>
                  <SelectItem value="prefer_night">多排晚班</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default EmployeeBasicFields;
