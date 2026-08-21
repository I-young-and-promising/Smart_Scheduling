import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { getScheduleOverview } from "@client/src/api/schedules";
import type { ScheduleOverviewResponse } from "@shared/api.interface";

export interface UseScheduleOverviewResult {
  overview: ScheduleOverviewResponse | null;
  loading: boolean;
  reload: () => Promise<void>;
}

export const useScheduleOverview = (
  month: string,
  department: string,
): UseScheduleOverviewResult => {
  const [overview, setOverview] = useState<ScheduleOverviewResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const requestRef = useRef<number>(0);

  const reload = useCallback(async (): Promise<void> => {
    const requestId: number = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    try {
      const data: ScheduleOverviewResponse = await getScheduleOverview(
        month,
        department,
      );
      if (requestRef.current === requestId) {
        setOverview(data);
      }
    } catch (error: unknown) {
      logger.error("获取排班总览失败", error);
      if (requestRef.current === requestId) {
        setOverview(null);
      }
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [month, department]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { overview, loading, reload };
};
