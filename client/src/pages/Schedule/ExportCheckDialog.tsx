import React from "react";
import { AlertTriangle, Ban, FileDown } from "lucide-react";
import { Button } from "@client/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import { ScrollArea } from "@client/src/components/ui/scroll-area";

interface ExportCheckDialogProps {
  open: boolean;
  errors: string[];
  warnings: string[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const ExportCheckDialog: React.FC<ExportCheckDialogProps> = ({
  open,
  errors,
  warnings,
  onOpenChange,
  onConfirm,
}) => {
  const hasErrors: boolean = errors.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {hasErrors ? (
              <Ban className="h-4 w-4 text-destructive" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warning" />
            )}
            导出前检查
          </DialogTitle>
          <DialogDescription>
            {hasErrors
              ? "发现阻塞问题，请先修正后再导出，避免飞书导入失败。"
              : "发现以下警告，确认后继续导出。"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-72 rounded-sm border">
          <div className="space-y-3 p-3 text-sm">
            {hasErrors && (
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">
                  阻塞错误（{errors.length}）
                </h4>
                <ul className="space-y-1">
                  {errors.map((item: string, index: number) => (
                    <li
                      key={`err-${index}`}
                      className="flex gap-2 rounded-sm bg-destructive/10 px-2 py-1.5 text-destructive"
                    >
                      <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-warning">
                  警告（{warnings.length}）
                </h4>
                <ul className="space-y-1">
                  {warnings.map((item: string, index: number) => (
                    <li
                      key={`warn-${index}`}
                      className="flex gap-2 rounded-sm bg-warning/10 px-2 py-1.5 text-warning"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {errors.length === 0 && warnings.length === 0 && (
              <p className="text-muted-foreground">未发现异常，可以导出。</p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          {!hasErrors && (
            <Button
              size="sm"
              className="rounded-sm"
              onClick={() => {
                onOpenChange(false);
                onConfirm();
              }}
            >
              <FileDown className="mr-1 h-3.5 w-3.5" />
              仍要导出
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportCheckDialog;
