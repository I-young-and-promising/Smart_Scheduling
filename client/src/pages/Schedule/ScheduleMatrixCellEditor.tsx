import React, { useEffect, useState } from "react";
import type { Employee, ScheduleWarning, ShiftCode } from "@shared/api.interface";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import { Button } from "@client/src/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
import { ScrollArea } from "@client/src/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { SHIFT_META, SHIFT_ORDER } from "./schedule-utils";

interface ScheduleMatrixCellEditorProps {
  open: boolean;
  employee: Employee | null;
  date: string | null;
  currentCode: ShiftCode;
  onClose: () => void;
  onShiftChange: (
    employeeId: string,
    date: string,
    shiftCode: ShiftCode,
    preview: boolean,
  ) => Promise<ScheduleWarning[]>;
  onSaved: () => void;
}

const ScheduleMatrixCellEditor: React.FC<ScheduleMatrixCellEditorProps> = ({
  open,
  employee,
  date,
  currentCode,
  onClose,
  onShiftChange,
  onSaved,
}) => {
  const [selectedCode, setSelectedCode] = useState<ShiftCode>(currentCode);
  const [busy, setBusy] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [confirmWarnings, setConfirmWarnings] = useState<ScheduleWarning[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedCode(currentCode);
      setConfirmOpen(false);
      setConfirmWarnings([]);
    }
  }, [open, currentCode]);

  const handleValueChange = async (code: ShiftCode): Promise<void> => {
    if (!employee || !date || code === currentCode) return;
    setSelectedCode(code);
    setBusy(true);
    try {
      const warnings: ScheduleWarning[] = await onShiftChange(
        employee.id,
        date,
        code,
        true,
      );
      if (warnings.length > 0) {
        setConfirmWarnings(warnings);
        setConfirmOpen(true);
      } else {
        await handleSave(code);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (code: ShiftCode = selectedCode): Promise<void> => {
    if (!employee || !date) return;
    setBusy(true);
    try {
      await onShiftChange(employee.id, date, code, false);
      onSaved();
      handleClose();
    } finally {
      setBusy(false);
    }
  };

  const handleClose = (): void => {
    setConfirmOpen(false);
    setConfirmWarnings([]);
    onClose();
  };

  const title: string = employee && date
    ? `${employee.name} · ${dayjs(date).format("M月D日")} 班次调整`
    : "班次调整";

  return (
    <>
      <Dialog open={open && !confirmOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>选择要切换到的班次</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select
              value={selectedCode}
              disabled={busy}
              onValueChange={(value: string) =>
                void handleValueChange(value as ShiftCode)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_ORDER.map((code: ShiftCode) => (
                  <SelectItem key={code} value={code}>
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-5 w-8 items-center justify-center rounded-sm text-xs font-medium ${SHIFT_META[code].cellClass}`}
                      >
                        {SHIFT_META[code].short}
                      </span>
                      {SHIFT_META[code].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose} disabled={busy}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>存在合规警告</DialogTitle>
            <DialogDescription>
              调整后可能产生以下合规问题，确认仍要保存吗？
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[40vh]">
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {confirmWarnings.map((w: ScheduleWarning) => (
                <li key={w.id}>{w.message}</li>
              ))}
            </ul>
          </ScrollArea>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setSelectedCode(currentCode);
              }}
              disabled={busy}
            >
              取消
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={busy}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              仍要保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScheduleMatrixCellEditor;
