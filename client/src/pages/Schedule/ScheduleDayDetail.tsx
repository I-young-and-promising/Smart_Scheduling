import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { toast } from "sonner";
import { Lock, Pencil, Unlock, X } from "lucide-react";
import type { Employee, ScheduleWarning, ShiftCode } from "@shared/api.interface";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import { ScrollArea } from "@client/src/components/ui/scroll-area";
import { Button } from "@client/src/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
import { cn } from "@/lib/utils";
import { cellKey, SHIFT_META, SHIFT_ORDER } from "./schedule-utils";

export interface CellChangeDetail {
  employeeId: string;
  employeeName: string;
  date: string;
  oldCode: ShiftCode;
  newCode: ShiftCode;
}

interface ScheduleDayDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  employees: Employee[];
  cellMap: Map<string, ShiftCode>;
  lockedMap?: Map<string, boolean>;
  onShiftChange?: (
    employeeId: string,
    date: string,
    shiftCode: ShiftCode,
    preview: boolean,
  ) => Promise<ScheduleWarning[]>;
  onSaved?: (change: CellChangeDetail) => void;
  onLockChange?: (
    employeeId: string,
    date: string,
    locked: boolean,
  ) => Promise<void>;
}

const ScheduleDayDetail: React.FC<ScheduleDayDetailProps> = ({
  open,
  onOpenChange,
  date,
  employees,
  cellMap,
  lockedMap,
  onShiftChange,
  onSaved,
  onLockChange,
}) => {
  const [busy, setBusy] = useState<Set<string>>(new Set<string>());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [confirmState, setConfirmState] = useState<{
    employeeId: string;
    employeeName: string;
    oldCode: ShiftCode;
    newCode: ShiftCode;
    relevantWarnings: ScheduleWarning[];
  } | null>(null);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setConfirmOpen(false);
      setConfirmState(null);
      setEditingId(null);
    }
    onOpenChange(nextOpen);
  };

  const handleShiftChange = async (
    employeeId: string,
    employeeName: string,
    newCode: ShiftCode,
  ): Promise<void> => {
    if (!date || !onShiftChange) return;
    const oldCode: ShiftCode = cellMap.get(cellKey(employeeId, date)) ?? "rest";
    if (newCode === oldCode) return;

    setBusy((prev: Set<string>) => new Set<string>([...prev, employeeId]));
    try {
      const warnings: ScheduleWarning[] = await onShiftChange(
        employeeId,
        date,
        newCode,
        true,
      );
      const relevantWarnings: ScheduleWarning[] = warnings.filter(
        (w: ScheduleWarning) =>
          w.employeeId === employeeId ||
          (w.employeeId === null && w.date === date),
      );
      setConfirmState({
        employeeId,
        employeeName,
        oldCode,
        newCode,
        relevantWarnings,
      });
      setConfirmOpen(true);
    } catch (error: unknown) {
      logger.error("调整班次失败", error);
      toast.error(
        error instanceof Error ? error.message : "调整班次失败，请重试",
      );
    } finally {
      setBusy((prev: Set<string>) => {
        const next = new Set<string>(prev);
        next.delete(employeeId);
        return next;
      });
    }
  };

  const handleCancelConfirm = (): void => {
    setConfirmOpen(false);
    setConfirmState(null);
    setEditingId(null);
  };

  const handleConfirmSave = async (): Promise<void> => {
    if (!date || !onShiftChange || !confirmState) return;
    const { employeeId, employeeName, oldCode, newCode } = confirmState;
    setBusy((prev: Set<string>) => new Set<string>([...prev, employeeId]));
    try {
      await onShiftChange(employeeId, date, newCode, false);
      onSaved?.({ employeeId, employeeName, date, oldCode, newCode });
      setConfirmOpen(false);
      setConfirmState(null);
      setEditingId(null);
    } catch (error: unknown) {
      logger.error("保存班次调整失败", error);
      toast.error(
        error instanceof Error ? error.message : "保存班次调整失败，请重试",
      );
    } finally {
      setBusy((prev: Set<string>) => {
        const next = new Set<string>(prev);
        next.delete(employeeId);
        return next;
      });
    }
  };

  const handleToggleLock = async (
    employeeId: string,
    employeeName: string,
  ): Promise<void> => {
    if (!date || !onLockChange) return;
    const locked: boolean = !(lockedMap?.get(cellKey(employeeId, date)) ?? false);
    setBusy((prev: Set<string>) => new Set<string>([...prev, employeeId]));
    try {
      await onLockChange(employeeId, date, locked);
      toast.success(
        `${employeeName} ${date} 已${locked ? "锁定" : "解锁"}`,
      );
    } catch (error: unknown) {
      logger.error("切换单元格锁定状态失败", error);
      toast.error(
        error instanceof Error ? error.message : "切换锁定状态失败，请重试",
      );
    } finally {
      setBusy((prev: Set<string>) => {
        const next = new Set<string>(prev);
        next.delete(employeeId);
        return next;
      });
    }
  };

  const handleStartEdit = (employeeId: string): void => {
    setEditingId(employeeId);
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
  };
  const groups: Record<ShiftCode, Employee[]> = useMemo(() => {
    const map: Record<ShiftCode, Employee[]> = {
      day: [],
      middle: [],
      night: [],
      rest: [],
    };
    if (!date) return map;
    for (const emp of employees) {
      const code: ShiftCode = cellMap.get(cellKey(emp.id, date)) ?? "rest";
      map[code].push(emp);
    }
    for (const code of SHIFT_ORDER) {
      map[code].sort((a: Employee, b: Employee): number =>
        a.employeeNo.localeCompare(b.employeeNo),
      );
    }
    return map;
  }, [date, employees, cellMap]);

  const title: string = date
    ? `${dayjs(date).format("M月D日")} 排班明细`
    : "排班明细";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-md p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            查看当日全部员工班次分布
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[55vh] px-6 pb-6">
          <div className="space-y-4">
            {SHIFT_ORDER.map((code: ShiftCode) => {
              const list: Employee[] = groups[code];
              const meta = SHIFT_META[code];
              return (
                <div key={code} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-[2rem] items-center justify-center rounded-sm px-1.5 text-[11px] font-medium",
                        meta.cellClass,
                      )}
                    >
                      {meta.short}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {meta.label}
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {list.length} 人
                    </span>
                  </div>
                  {list.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground">
                      无
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5">
                      {list.map((emp: Employee) => {
                        const currentCode: ShiftCode =
                          cellMap.get(cellKey(emp.id, date!)) ?? "rest";
                        const isLocked: boolean =
                          lockedMap?.get(cellKey(emp.id, date!)) ?? false;
                        const isBusy: boolean = busy.has(emp.id);
                        const isEditing: boolean = editingId === emp.id;
                        return (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between gap-2 rounded-sm border border-border bg-card px-2 py-1.5"
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {emp.employeeNo}
                              </span>
                              <span className="truncate text-xs">
                                {emp.name}
                              </span>
                            </div>
                            {onShiftChange && isEditing ? (
                              <div className="flex items-center gap-1">
                                <Select
                                  value={currentCode}
                                  disabled={isBusy}
                                  onValueChange={(value: string) =>
                                    handleShiftChange(
                                      emp.id,
                                      emp.name,
                                      value as ShiftCode,
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    className="h-6 w-[4.5rem] px-1.5 text-xs"
                                    size="sm"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SHIFT_ORDER.map((code: ShiftCode) => (
                                      <SelectItem
                                        key={code}
                                        value={code}
                                        className="text-xs"
                                      >
                                        {SHIFT_META[code].label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={isBusy}
                                  onClick={handleCancelEdit}
                                  aria-label="取消编辑"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span
                                  className={cn(
                                    "inline-flex h-5 min-w-[2rem] items-center justify-center rounded-sm px-1.5 text-[11px] font-medium",
                                    SHIFT_META[currentCode].cellClass,
                                  )}
                                >
                                  {SHIFT_META[currentCode].short}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={isBusy}
                                  onClick={() => handleStartEdit(emp.id)}
                                  aria-label="编辑班次"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleToggleLock(emp.id, emp.name)
                                  }
                                  aria-label={isLocked ? "解锁班次" : "锁定班次"}
                                >
                                  {isLocked ? (
                                    <Lock className="h-3 w-3 text-warning" />
                                  ) : (
                                    <Unlock className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmState && confirmState.relevantWarnings.length > 0
                ? "存在合规违规"
                : "确认调整"}
            </DialogTitle>
            <DialogDescription>
              {confirmState && confirmState.relevantWarnings.length > 0 ? (
                <>
                  调整 {confirmState.employeeName} 到「
                  {SHIFT_META[confirmState.newCode].label}」后，本次调整会产生以下警告：
                </>
              ) : (
                <>
                  确认将 {confirmState?.employeeName} 的班次从「
                  {confirmState && SHIFT_META[confirmState.oldCode].label}」调整为「
                  {confirmState && SHIFT_META[confirmState.newCode].label}」？
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {confirmState && confirmState.relevantWarnings.length > 0 && (
            <ScrollArea className="max-h-[40vh]">
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {confirmState.relevantWarnings.map((w: ScheduleWarning) => (
                  <li key={w.id}>{w.message}</li>
                ))}
              </ul>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelConfirm}
              disabled={
                confirmState ? busy.has(confirmState.employeeId) : false
              }
            >
              取消
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => void handleConfirmSave()}
              disabled={
                confirmState ? busy.has(confirmState.employeeId) : false
              }
            >
              {confirmState && confirmState.relevantWarnings.length > 0
                ? "仍要保存"
                : "确认调整"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default ScheduleDayDetail;
