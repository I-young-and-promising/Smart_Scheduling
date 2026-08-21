import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { FileSpreadsheet, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { listImportHistory, deleteImportedSchedule } from "@client/src/api/schedules";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
import type {
  ListImportHistoryResponse,
  ScheduleImportHistoryRecord,
} from "@shared/api.interface";
import { Button } from "@client/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/src/components/ui/card";
import { Badge } from "@client/src/components/ui/badge";
import { extractApiErrorMessage } from "./schedule-utils";

interface ImportHistoryPanelProps {
  month: string;
  refreshKey?: number;
}

const ImportHistoryPanel: React.FC<ImportHistoryPanelProps> = ({
  month,
  refreshKey,
}) => {
  const { currentDepartment } = useDepartment();
  const [items, setItems] = useState<ScheduleImportHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [deletingMonth, setDeletingMonth] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const response: ListImportHistoryResponse = await listImportHistory(
        month,
        currentDepartment,
      );
      setItems(response.items);
    } catch (error: unknown) {
      logger.error("获取导入历史失败", error);
      toast.error(extractApiErrorMessage(error, "获取导入历史失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [month, refreshKey]);

  const handleDelete = async (targetMonth: string): Promise<void> => {
    setDeletingMonth(targetMonth);
    try {
      const response = await deleteImportedSchedule(
        targetMonth,
        currentDepartment,
      );
      toast.success(`已删除 ${response.deleted} 条导入数据，锁定状态已解除`);
      await load();
    } catch (error: unknown) {
      logger.error("删除导入班表失败", error);
      toast.error(extractApiErrorMessage(error, "删除失败"));
    } finally {
      setDeletingMonth(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-[#0c0a09]">历史导入班表</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[#78716c]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            加载中…
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-[#78716c]">
            该月份暂无导入记录
          </p>
        ) : (
          items.map((item: ScheduleImportHistoryRecord) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-sm border border-[#e8e6e5] p-2"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate text-xs font-medium">
                    {item.fileName}
                  </span>
                  {item.status === "active" ? (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      生效中
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      已删除
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-[#78716c]">
                  {item.employeeCount} 人 / {item.entryCount} 条班次 ·{" "}
                  {item.importedAt
                    ? dayjs(item.importedAt).format("MM-DD HH:mm")
                    : "时间未知"}
                </p>
              </div>
              {item.status === "active" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-danger"
                  disabled={deletingMonth === item.month}
                  onClick={() => void handleDelete(item.month)}
                  data-ai-section-type="button"
                >
                  {deletingMonth === item.month ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ImportHistoryPanel;
