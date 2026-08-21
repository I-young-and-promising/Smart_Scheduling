import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { toast } from "sonner";
import { CalendarDays, Loader2 } from "lucide-react";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { listEmployees } from "@client/src/api/employees";
import { createLeaveRequest } from "@client/src/api/leave-requests";
import type {
  Employee,
  EmployeeListResponse,
} from "@shared/api.interface";
import { cn } from "@client/src/lib/utils";
import { Button } from "@client/src/components/ui/button";
import { Calendar } from "@client/src/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/src/components/ui/form";
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
import { getErrorMessage } from "./utils";

const leaveFormSchema = z
  .object({
    employeeId: z.string().min(1, "请选择员工"),
    startDate: z.date({ required_error: "请选择开始日期" }),
    endDate: z.date({ required_error: "请选择结束日期" }),
  })
  .refine(
    (data) => data.startDate.getTime() <= data.endDate.getTime(),
    {
      message: "开始日期不能晚于结束日期",
      path: ["endDate"],
    },
  );

type LeaveFormData = z.infer<typeof leaveFormSchema>;

interface CreateLeaveDialogProps {
  open: boolean;
  isEmployee: boolean;
  selfEmployeeId?: string | null;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}

const CreateLeaveDialog: React.FC<CreateLeaveDialogProps> = ({
  open,
  isEmployee,
  selfEmployeeId,
  onOpenChange,
  onCreated,
}) => {
  const selfBlocked: boolean = isEmployee && !selfEmployeeId;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<LeaveFormData>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      employeeId: "",
      startDate: undefined,
      endDate: undefined,
    },
  });

  const startDateValue: Date | undefined = form.watch("startDate");

  const loadEmployees = useCallback(async (): Promise<void> => {
    setEmployeesLoading(true);
    try {
      const response: EmployeeListResponse = await listEmployees();
      setEmployees(response.items);
    } catch (error: unknown) {
      logger.error("加载员工列表失败", error);
      toast.error(getErrorMessage(error));
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (isEmployee) {
      form.setValue("employeeId", selfEmployeeId ?? "");
    } else {
      void loadEmployees();
    }
  }, [open, isEmployee, selfEmployeeId, loadEmployees, form]);

  const handleOpenChange = (nextOpen: boolean): void => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      form.reset();
    }
  };

  const onSubmit = async (data: LeaveFormData): Promise<void> => {
    setSubmitting(true);
    try {
      await createLeaveRequest({
        employeeId: isEmployee ? (selfEmployeeId ?? "") : data.employeeId,
        startDate: dayjs(data.startDate).format("YYYY-MM-DD"),
        endDate: dayjs(data.endDate).format("YYYY-MM-DD"),
      });
      toast.success("申请创建成功");
      onOpenChange(false);
      form.reset();
      await onCreated();
    } catch (error: unknown) {
      logger.error("创建排休申请失败", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>新建排休申请</DialogTitle>
          <DialogDescription>
            {isEmployee
              ? "提交您本人的排休申请，提交后进入待审批状态"
              : "为员工提交排休申请，提交后进入待审批状态"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {isEmployee ? (
              selfEmployeeId ? (
                <div className="rounded-sm border border-border bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
                  申请人：您本人（员工账号仅可为本人提交排休）
                </div>
              ) : (
                <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  未关联员工档案，请联系管理员完善后再提交
                </div>
              )
            ) : (
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      申请人 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={employeesLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-sm shadow-none">
                          <SelectValue
                            placeholder={
                              employeesLoading ? "加载中..." : "请选择员工"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((emp: Employee) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}（{emp.employeeNo}）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!employeesLoading && employees.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        暂无员工，请先在员工管理中添加
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex min-w-[180px] flex-1 flex-col">
                    <FormLabel>
                      开始日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "justify-start rounded-sm text-left font-normal shadow-none",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarDays />
                            {field.value
                              ? dayjs(field.value).format("YYYY-MM-DD")
                              : "请选择日期"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex min-w-[180px] flex-1 flex-col">
                    <FormLabel>
                      结束日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "justify-start rounded-sm text-left font-normal shadow-none",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarDays />
                            {field.value
                              ? dayjs(field.value).format("YYYY-MM-DD")
                              : "请选择日期"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={
                            startDateValue
                              ? (date: Date) =>
                                  date.getTime() <
                                  dayjs(startDateValue)
                                    .startOf("day")
                                    .valueOf()
                              : undefined
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting || selfBlocked}>
                {submitting && <Loader2 className="animate-spin" />}
                提交
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLeaveDialog;
