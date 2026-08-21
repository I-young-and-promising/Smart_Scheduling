import React, { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { createEmployee, updateEmployee } from "@client/src/api/employees";
import { extractApiErrorMessage } from "@client/src/utils/api-error";
import type { Employee, SaveEmployeeRequest } from "@shared/api.interface";
import { Button } from "@client/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import { Form } from "@client/src/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@client/src/components/ui/tabs";
import EmployeeBasicFields from "./EmployeeBasicFields";
import EmployeeScheduleFields from "./EmployeeScheduleFields";
import EmployeeTagsFields from "./EmployeeTagsFields";
import {
  employeeSchema,
  EMPTY_FORM_VALUES,
  joinTags,
  splitTags,
  type EmployeeFormData,
} from "./employee-form-types";

interface EmployeeFormDialogProps {
  open: boolean;
  employee: Employee | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  defaultDepartment: string;
}

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  open,
  employee,
  onOpenChange,
  onSaved,
  defaultDepartment,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const isEdit: boolean = employee !== null;

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const initialValues: EmployeeFormData = useMemo(() => {
    if (!employee) {
      return { ...EMPTY_FORM_VALUES, department: defaultDepartment };
    }
    return {
      name: employee.name,
      employeeNo: employee.employeeNo,
      uid: employee.uid,
      platform: employee.platform,
      preference: employee.preference,
      role: employee.role,
      userRole: employee.userRole,
      department: employee.department,
      status: employee.status,
      hireDate: employee.hireDate ?? "",
      roleTags: joinTags(employee.roleTags),
      abilityTags: joinTags(employee.abilityTags),
      skillTags: joinTags(employee.skillTags),
      efficiencyTag: employee.efficiencyTag ?? "",
      mentorNos: joinTags(employee.mentorNos),
      shiftPreferences: joinTags(employee.shiftPreferences),
      allowedShifts: joinTags(employee.allowedShifts),
      dailyStandardWorkload: employee.dailyStandardWorkload,
      capacityLevel: employee.capacityLevel ?? "",
      capacityRatio: employee.capacityRatio ?? "",
      owedDays: employee.owedDays,
      surplusDays: employee.surplusDays,
      isIndividualScheduling: employee.isIndividualScheduling,
    };
  }, [employee, defaultDepartment]);

  useEffect(() => {
    if (open) {
      form.reset(initialValues);
    }
  }, [open, initialValues, form]);

  const onSubmit = async (data: EmployeeFormData): Promise<void> => {
    const payload: SaveEmployeeRequest = {
      name: data.name,
      employeeNo: data.employeeNo,
      uid: data.uid,
      platform: data.platform,
      preference: data.preference,
      role: data.role,
      userRole: data.userRole,
      department: data.department,
      status: data.status,
      hireDate: data.hireDate || undefined,
      roleTags: splitTags(data.roleTags),
      abilityTags: splitTags(data.abilityTags),
      skillTags: splitTags(data.skillTags),
      efficiencyTag: data.efficiencyTag || undefined,
      mentorNos: splitTags(data.mentorNos),
      shiftPreferences: splitTags(data.shiftPreferences),
      allowedShifts: splitTags(data.allowedShifts),
      dailyStandardWorkload: data.dailyStandardWorkload,
      capacityLevel: data.capacityLevel || undefined,
      capacityRatio: data.capacityRatio || undefined,
      owedDays: data.owedDays,
      surplusDays: data.surplusDays,
      isIndividualScheduling: data.isIndividualScheduling,
    };
    setSubmitting(true);
    try {
      if (employee) {
        await updateEmployee(employee.id, payload);
        toast.success("员工信息已更新");
      } else {
        await createEmployee(payload);
        toast.success("员工创建成功");
      }
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      logger.error("保存员工失败", error);
      toast.error(extractApiErrorMessage(error, "保存失败，请稍后重试"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑员工" : "新建员工"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "维护员工档案、角色标签与排班权限"
              : "添加一名团队成员并设置排班属性"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data: EmployeeFormData) =>
              void onSubmit(data),
            )}
            className="space-y-4"
            noValidate
          >
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">基础信息</TabsTrigger>
                <TabsTrigger value="tags">标签与能力</TabsTrigger>
                <TabsTrigger value="schedule">排班偏好</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="pt-2">
                <EmployeeBasicFields form={form} />
              </TabsContent>
              <TabsContent value="tags" className="pt-2">
                <EmployeeTagsFields form={form} />
              </TabsContent>
              <TabsContent value="schedule" className="pt-2">
                <EmployeeScheduleFields form={form} />
              </TabsContent>
            </Tabs>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
