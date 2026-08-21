import React, { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { toast } from "sonner";
import { CheckCircle2, Loader2, PencilLine, Send } from "lucide-react";
import { getPublishStatus, publishSchedule } from "@client/src/api/schedules";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
import type {
  PublishScheduleResponse,
  SchedulePublishInfo,
} from "@shared/api.interface";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@client/src/components/ui/alert-dialog";
import { Badge } from "@client/src/components/ui/badge";
import { Button } from "@client/src/components/ui/button";
import { extractApiErrorMessage } from "./schedule-utils";

interface SchedulePublishBarProps {
  month: string;
  /** 页面编排操作（生成/改单元格/导入/删除导入）成功后递增，触发重新拉取发布状态 */
  refreshKey: number;
}

const SchedulePublishBar: React.FC<SchedulePublishBarProps> = ({
  month,
  refreshKey,
}) => {
  const { currentDepartment } = useDepartment();
  const [publishInfo, setPublishInfo] = useState<SchedulePublishInfo | null>(
    null,
  );
  const [publishing, setPublishing] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const requestId: number = requestRef.current + 1;
    requestRef.current = requestId;
    const loadPublishStatus = async (): Promise<void> => {
      try {
        const info: SchedulePublishInfo = await getPublishStatus(
          month,
          currentDepartment,
        );
        if (requestRef.current === requestId) {
          setPublishInfo(info);
        }
      } catch (error: unknown) {
        logger.error("获取发布状态失败", error);
        if (requestRef.current === requestId) {
          setPublishInfo(null);
        }
      }
    };
    void loadPublishStatus();
  }, [month, refreshKey, currentDepartment]);

  const handlePublish = useCallback(async (): Promise<void> => {
    setPublishing(true);
    try {
      const response: PublishScheduleResponse = await publishSchedule(
        month,
        currentDepartment,
      );
      if (response.success) {
        setPublishInfo({
          month,
          status: response.status,
          publishedAt: response.publishedAt,
        });
        toast.success(response.message || "班表已发布");
        setConfirmOpen(false);
      } else {
        toast.error(response.message || "发布失败，请重试");
      }
    } catch (error: unknown) {
      logger.error("发布班表失败", error);
      toast.error(extractApiErrorMessage(error, "发布失败，请重试"));
    } finally {
      setPublishing(false);
    }
  }, [month, currentDepartment]);

  const publishedAtLabel: string | null =
    publishInfo?.status === "published" && publishInfo.publishedAt
      ? `${dayjs(publishInfo.publishedAt).format("M月D日 HH:mm")} 发布`
      : null;

  const monthLabel: string = dayjs(`${month}-01`).format("YYYY年M月");

  return (
    <>
      {publishInfo?.status === "published" ? (
        <Badge
          variant="outline"
          title={publishedAtLabel ?? undefined}
          className="rounded-full border-success/30 bg-success/10 text-success"
        >
          <CheckCircle2 className="h-3 w-3" />
          已发布
          {publishedAtLabel && (
            <span className="font-normal">{publishedAtLabel}</span>
          )}
        </Badge>
      ) : publishInfo?.status === "draft" ? (
        <Badge
          variant="outline"
          title="班表有编排改动且尚未发布，员工端暂不可见"
          className="rounded-full border-warning/30 bg-warning/10 text-warning"
        >
          <PencilLine className="h-3 w-3" />
          草稿
        </Badge>
      ) : null}
      <Button
        size="sm"
        disabled={publishing}
        onClick={() => setConfirmOpen(true)}
        data-ai-section-type="button"
      >
        {publishing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {publishing ? "发布中…" : "发布班表"}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>发布班表</AlertDialogTitle>
            <AlertDialogDescription>
              确认发布 {monthLabel} 班表？发布后员工即可在「我的班表」查看。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>取消</AlertDialogCancel>
            <Button
              disabled={publishing}
              onClick={() => void handlePublish()}
              data-ai-section-type="button"
            >
              {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
              {publishing ? "发布中…" : "确认发布"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SchedulePublishBar;
