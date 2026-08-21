import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import {
  createShiftConfig,
  deleteShiftConfig,
  listShiftConfigs,
  updateShiftConfig,
} from "@client/src/api/shift-configs";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
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
import { extractApiErrorMessage } from "@client/src/utils/api-error";
import type {
  CreateShiftConfigRequest,
  ShiftConfig,
  ShiftCode,
} from "@shared/api.interface";
import RuleConfigCard from "./RuleConfigCard";
import ShiftConfigCard, { type ShiftConfigWithId } from "./ShiftConfigCard";
import ShiftConfigForm, {
  buildRequestPayload,
  formatArrayField,
  formatTaskCodes,
} from "./ShiftConfigForm";
import { SHIFT_CODE_ORDER } from "./constants";
import { shiftFormSchema, type ShiftFormValues } from "./types";
import { showConfirm } from '@lark-apaas/client-toolkit';

const defaultFormValues: ShiftFormValues = {
  name: "",
  shiftType: "day",
  startTime: "09:00",
  endTime: "18:00",
  crossDay: false,
  standardHours: "8",
  minCount: 1,
  maxCount: 1,
  holidayMinCount: 1,
  holidayMaxCount: 1,
  priority: 0,
  isActive: true,
  isNightShift: false,
  isOvernight: false,
  requireSupervisor: false,
  requireSeniorJuniorMix: false,
  requiredRoles: "",
  requiredSkills: "",
  taskCodes: "[]",
};

const ShiftConfigsPage: React.FC = () => {
  const { currentDepartment } = useDepartment();
  const [configs, setConfigs] = useState<ShiftConfigWithId[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ShiftConfigWithId | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: defaultFormValues,
  });

  const normalizeConfig = (item: ShiftConfig): ShiftConfigWithId =>
    item as ShiftConfigWithId;

  const loadConfigs = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listShiftConfigs(currentDepartment);
      const ordered: ShiftConfigWithId[] = [...response.items]
        .map(normalizeConfig)
        .sort(
          (a: ShiftConfigWithId, b: ShiftConfigWithId): number =>
            SHIFT_CODE_ORDER.indexOf(a.code) -
            SHIFT_CODE_ORDER.indexOf(b.code),
        );
      setConfigs(ordered);
    } catch (error: unknown) {
      const message: string = extractApiErrorMessage(
        error,
        "班次配置加载失败，请重试",
      );
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [currentDepartment]);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const resetFormForCreate = useCallback((): void => {
    form.reset(defaultFormValues);
  }, [form]);

  const resetFormForEdit = useCallback(
    (config: ShiftConfigWithId): void => {
      form.reset({
        name: config.name,
        shiftType: config.shiftType ?? "day",
        startTime: config.startTime,
        endTime: config.endTime,
        crossDay: config.crossDay,
        standardHours: config.standardHours ?? "",
        minCount: config.minCount ?? 0,
        maxCount: config.maxCount ?? 0,
        holidayMinCount: config.holidayMinCount ?? 0,
        holidayMaxCount: config.holidayMaxCount ?? 0,
        priority: config.priority ?? 0,
        isActive: config.isActive,
        isNightShift: config.isNightShift,
        isOvernight: config.isOvernight,
        requireSupervisor: config.requireSupervisor,
        requireSeniorJuniorMix: config.requireSeniorJuniorMix,
        requiredRoles: formatArrayField(config.requiredRoles),
        requiredSkills: formatArrayField(config.requiredSkills),
        taskCodes: formatTaskCodes(config.taskCodes),
      });
    },
    [form],
  );

  const handleCreate = useCallback((): void => {
    setEditing(null);
    resetFormForCreate();
    setDialogOpen(true);
  }, [resetFormForCreate]);

  const handleEdit = useCallback(
    (config: ShiftConfigWithId): void => {
      setEditing(config);
      resetFormForEdit(config);
      setDialogOpen(true);
    },
    [resetFormForEdit],
  );

  const handleDialogChange = useCallback((open: boolean): void => {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
    }
  }, []);

  const onSubmit = async (data: ShiftFormValues): Promise<void> => {
    setSaving(true);
    try {
      if (editing) {
        await updateShiftConfig(
          editing.id,
          buildRequestPayload(data, currentDepartment),
        );
        toast.success(`${data.name} 配置已保存`);
      } else {
        const nextCode = SHIFT_CODE_ORDER.find(
          (code: ShiftCode) =>
            !configs.some(
              (config: ShiftConfigWithId) => config.code === code,
            ),
        );
        if (!nextCode) {
          toast.error("系统班次类型已用完，无法继续新建");
          return;
        }
        await createShiftConfig({
          ...(buildRequestPayload(
            data,
            currentDepartment,
          ) as CreateShiftConfigRequest &
            Required<
              Pick<
                CreateShiftConfigRequest,
                "department" | "name" | "code" | "startTime" | "endTime"
              >
            >),
          code: nextCode,
        });
        toast.success(`${data.name} 班次已创建`);
      }
      setDialogOpen(false);
      setEditing(null);
      await loadConfigs();
    } catch (error: unknown) {
      const message: string = extractApiErrorMessage(
        error,
        "保存失败，请重试",
      );
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (config: ShiftConfigWithId): Promise<void> => {
    if (!await showConfirm(`确定删除班次「${config.name}」吗？`)) {
      return;
    }
    setDeleting(config.id);
    try {
      await deleteShiftConfig(config.id);
      toast.success(`${config.name} 已删除`);
      await loadConfigs();
    } catch (error: unknown) {
      const message: string = extractApiErrorMessage(
        error,
        "删除失败，请重试",
      );
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  const dialogTitle: string = editing ? `编辑${editing.name}` : "新建班次";

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[320px] max-w-6xl items-center justify-center px-4 py-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载班次配置...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-[320px] max-w-6xl flex-col items-center justify-center gap-3 px-4 py-6">
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          {loadError}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadConfigs()}
        >
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">班次配置</h1>
          <p className="text-sm text-muted-foreground">
            维护白班 / 中班 / 晚班的时间区间与每日人数，休班为系统固定班次。
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          onClick={() => void handleCreate()}
        >
          <Plus className="h-3.5 w-3.5" />
          新建班次
        </Button>
      </div>

      <div
        data-ai-section-type="card-list"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {configs.map((config: ShiftConfigWithId) => (
          <ShiftConfigCard
            key={config.id}
            config={config}
            onEdit={handleEdit}
            onDelete={(item: ShiftConfigWithId) => void handleDelete(item)}
          />
        ))}
      </div>

      <RuleConfigCard />

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              调整班次属性与人数区间，保存后立即生效。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data: ShiftFormValues) =>
                void onSubmit(data),
              )}
              className="space-y-4"
            >
              <ShiftConfigForm form={form} />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                  disabled={saving}
                >
                  取消
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  保存
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftConfigsPage;
