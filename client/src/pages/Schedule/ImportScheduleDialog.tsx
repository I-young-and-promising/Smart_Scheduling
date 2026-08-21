import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";
import {
  deleteImportedSchedule,
  importHistorySchedule,
} from "@client/src/api/schedules";
import { listEmployees } from "@client/src/api/employees";
import { listShiftConfigs } from "@client/src/api/shift-configs";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
import type {
  DeleteImportedScheduleResponse,
  Employee,
  EmployeeListResponse,
  ImportHistoryScheduleResponse,
  ShiftCode,
  ShiftConfig,
  ShiftConfigListResponse,
} from "@shared/api.interface";
import { Button } from "@client/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import { Input } from "@client/src/components/ui/input";
import { extractApiErrorMessage } from "./schedule-utils";
import {
  buildShiftCodeMap,
  parseScheduleXlsx,
  type ParseScheduleXlsxResult,
} from "./parse-schedule-xlsx";

const MONTH_RE: RegExp = /^\d{4}-(0[1-9]|1[0-2])$/u;

interface ImportScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 默认目标月份（当前查看月的上一个月） */
  defaultMonth: string;
  onImported: () => Promise<void>;
}

const ImportScheduleDialog: React.FC<ImportScheduleDialogProps> = ({
  open,
  onOpenChange,
  defaultMonth,
  onImported,
}) => {
  const { currentDepartment } = useDepartment();
  const [month, setMonth] = useState<string>(defaultMonth);
  const [configs, setConfigs] = useState<ShiftConfig[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parsed, setParsed] = useState<ParseScheduleXlsxResult | null>(null);
  const [parseError, setParseError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteArmed, setDeleteArmed] = useState<boolean>(false);
  const fileInputRef: React.RefObject<HTMLInputElement | null> =
    useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMonth(defaultMonth);
    setFileName("");
    setParsed(null);
    setParseError("");
    setDeleteArmed(false);
  }, [open, defaultMonth]);

  useEffect(() => {
    const loadConfigs = async (): Promise<void> => {
      try {
        const response: ShiftConfigListResponse = await listShiftConfigs(
          currentDepartment,
        );
        setConfigs(response.items);
      } catch (error: unknown) {
        logger.error("获取班次配置失败", error);
      }
    };
    const loadEmployees = async (): Promise<void> => {
      try {
        const response: EmployeeListResponse = await listEmployees();
        setEmployees(response.items);
      } catch (error: unknown) {
        logger.error("获取员工列表失败", error);
      }
    };
    void loadConfigs();
    void loadEmployees();
  }, []);

  useEffect(() => {
    if (!deleteArmed) return;
    const timer: ReturnType<typeof setTimeout> = setTimeout(
      () => setDeleteArmed(false),
      3000,
    );
    return () => clearTimeout(timer);
  }, [deleteArmed]);

  const codeMap: Map<string, ShiftCode> = useMemo(
    () => buildShiftCodeMap(configs),
    [configs],
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file: File | undefined = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setParsed(null);
    try {
      const result: ParseScheduleXlsxResult = await parseScheduleXlsx(
        file,
        codeMap,
        employees,
      );
      setParsed(result);
    } catch (error: unknown) {
      logger.error("解析排班表失败", error);
      setParseError(error instanceof Error ? error.message : "文件解析失败");
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!MONTH_RE.test(month)) {
      toast.error("月份格式应为 YYYY-MM");
      return;
    }
    if (!parsed || parsed.rows.length === 0) {
      toast.error("请先选择并解析班表文件");
      return;
    }
    setSubmitting(true);
    try {
      const response: ImportHistoryScheduleResponse = await importHistorySchedule({
        month,
        fileName,
        rows: parsed.rows,
        department: currentDepartment,
      });
      toast.success(response.message);
      if (parsed.skippedCells.length > 0) {
        toast.warning(`${parsed.skippedCells.length} 个单元格无法识别，已跳过`, {
          description: parsed.skippedCells.slice(0, 3).join("；"),
        });
      }
      await onImported();
      onOpenChange(false);
    } catch (error: unknown) {
      logger.error("导入历史班表失败", error);
      toast.error(extractApiErrorMessage(error, "导入失败，请重试"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!MONTH_RE.test(month)) {
      toast.error("月份格式应为 YYYY-MM");
      return;
    }
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setDeleting(true);
    try {
      const response: DeleteImportedScheduleResponse =
        await deleteImportedSchedule(month, currentDepartment);
      toast.success(`已删除该月 ${response.deleted} 条导入数据`);
      setDeleteArmed(false);
      await onImported();
    } catch (error: unknown) {
      logger.error("删除导入班表失败", error);
      toast.error(extractApiErrorMessage(error, "删除失败，请重试"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>导入历史班表</DialogTitle>
          <DialogDescription>
            将上月班表导入作为新班表的固定开头：对应月份数据将被锁定，一键排班与合规校验会以其为跨月边界，避免跨月连续上班。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              班表所属月份
            </span>
            <Input
              value={month}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setMonth(e.target.value)
              }
              placeholder="YYYY-MM"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Excel 文件
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => fileInputRef.current?.click()}
                data-ai-section-type="button"
              >
                <Upload className="h-3.5 w-3.5" />
                选择文件
              </Button>
              <span className="truncate text-xs text-muted-foreground">
                {fileName || "需包含「工号」列与「1日~31日」日期列，单元格填班次名称"}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                void handleFileChange(e)
              }
            />
          </div>

          {parseError && <p className="text-xs text-danger">{parseError}</p>}
          {parsed && (
            <div className="rounded-sm border border-border bg-accent/50 px-3 py-2 text-xs">
              <p>
                解析成功：{parsed.rows.length} 名员工、共 {parsed.totalShifts} 条班次
              </p>
              {parsed.skippedCells.length > 0 && (
                <p className="mt-1 text-warning">
                  {parsed.skippedCells.length} 个单元格无法识别（将跳过）：
                  {parsed.skippedCells.slice(0, 3).join("；")}
                  {parsed.skippedCells.length > 3 ? " 等" : ""}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(deleteArmed && "text-danger")}
            disabled={deleting || submitting}
            onClick={() => void handleDelete()}
            data-ai-section-type="button"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {deleteArmed ? "再次点击确认删除" : "删除该月导入"}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              data-ai-section-type="button"
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={submitting || !parsed}
              onClick={() => void handleSubmit()}
              data-ai-section-type="button"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "导入中…" : "确认导入"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportScheduleDialog;
