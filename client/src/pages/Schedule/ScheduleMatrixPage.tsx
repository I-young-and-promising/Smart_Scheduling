import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, Table2 } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@lark-apaas/client-toolkit/logger";
import type {
  Employee,
  EmployeeListResponse,
  GenerateScheduleResponse,
  ScheduleWarning,
  ShiftCode,
} from "@shared/api.interface";
import { listEmployees } from "@client/src/api/employees";
import {
  generateSchedule,
  getScheduleOverview,
  updateScheduleCell,
} from "@client/src/api/schedules";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
import { Button } from "@client/src/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@client/src/components/ui/empty";
import type { ScheduleOverviewResponse } from "@shared/api.interface";
import { extractApiErrorMessage, formatMonthLabel } from "./schedule-utils";
import ScheduleMatrixCellEditor from "./ScheduleMatrixCellEditor";
import ScheduleMatrixTable from "./ScheduleMatrixTable";

const ScheduleMatrixPage: React.FC = () => {
  const { currentDepartment } = useDepartment();
  const [month, setMonth] = useState<string>(() => dayjs().format("YYYY-MM"));
  const [overview, setOverview] = useState<ScheduleOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [generating, setGenerating] = useState<boolean>(false);
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [editorState, setEditorState] = useState<{
    employee: Employee | null;
    date: string | null;
    currentCode: ShiftCode;
  }>({ employee: null, date: null, currentCode: "rest" });

  const loadOverview = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data: ScheduleOverviewResponse = await getScheduleOverview(
        month,
        currentDepartment,
      );
      setOverview(data);
    } catch (error: unknown) {
      logger.error("获取排班总览失败", error);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [month, currentDepartment]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const loadEmployees = async (): Promise<void> => {
      try {
        const response: EmployeeListResponse = await listEmployees(
          undefined,
          currentDepartment,
        );
        setEmployees(response.items);
      } catch (error: unknown) {
        logger.error("获取员工列表失败", error);
        toast.error("员工列表加载失败，请刷新重试");
      }
    };
    void loadEmployees();
  }, [currentDepartment]);

  const cellMap: Map<string, ShiftCode> = useMemo(() => {
    const map: Map<string, ShiftCode> = new Map<string, ShiftCode>();
    for (const cell of overview?.cells ?? []) {
      map.set(`${cell.employeeId}|${cell.date}`, cell.shiftCode);
    }
    return map;
  }, [overview]);

  const changeMonth = (delta: number): void => {
    setMonth((prev: string) =>
      dayjs(`${prev}-01`).add(delta, "month").format("YYYY-MM"),
    );
  };

  const handleGenerate = useCallback(async (): Promise<void> => {
    setGenerating(true);
    try {
      const response: GenerateScheduleResponse = await generateSchedule({
        month,
        department: currentDepartment,
      });
      if (response.success) {
        toast.success(response.message || "排班生成完成");
        await loadOverview();
      } else {
        toast.error(response.message || "排班生成失败，请检查员工与班次配置");
      }
    } catch (error: unknown) {
      logger.error("排班生成失败", error);
      toast.error(extractApiErrorMessage(error, "排班生成失败，请重试"));
    } finally {
      setGenerating(false);
    }
  }, [month, loadOverview, currentDepartment]);

  const handleCellClick = useCallback(
    (employee: Employee, date: string): void => {
      const code: ShiftCode =
        cellMap.get(`${employee.id}|${date}`) ?? "rest";
      setEditorState({ employee, date, currentCode: code });
      setEditorOpen(true);
    },
    [cellMap],
  );

  const handleShiftChange = useCallback(
    async (
      employeeId: string,
      date: string,
      shiftCode: ShiftCode,
      preview: boolean,
    ): Promise<ScheduleWarning[]> => {
      const response = await updateScheduleCell({
        employeeId,
        date,
        shiftCode,
        preview,
        department: currentDepartment,
      });
      return response.warnings;
    },
    [currentDepartment],
  );

  const handleSaved = useCallback(async (): Promise<void> => {
    toast.success("班次调整已保存");
    await loadOverview();
  }, [loadOverview]);

  const hasSchedule: boolean = (overview?.cells.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">人工排班矩阵</h1>
        <p className="text-sm text-muted-foreground">
          行 = 员工，列 = 日期，点击单元格即可快速调整班次。
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="上个月"
            disabled={generating || loading}
            onClick={() => changeMonth(-1)}
            data-ai-section-type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-32 text-center font-mono text-sm font-semibold">
            {formatMonthLabel(month)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="下个月"
            disabled={generating || loading}
            onClick={() => changeMonth(1)}
            data-ai-section-type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild data-ai-section-type="button">
            <Link to="/">
              <Table2 className="h-4 w-4" />
              返回日历视图
            </Link>
          </Button>
          <Button
            disabled={generating || loading}
            onClick={() => void handleGenerate()}
            data-ai-section-type="button"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "智能排班求解中…" : "一键智能排班"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2 rounded-sm border border-border bg-card text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载排班数据…
        </div>
      ) : !overview ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-sm border border-border bg-card text-sm text-muted-foreground">
          <span>排班数据加载失败</span>
          <Button variant="outline" onClick={() => void loadOverview()}>
            重新加载
          </Button>
        </div>
      ) : !hasSchedule ? (
        <div className="rounded-sm border border-border bg-card">
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Table2 className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>{formatMonthLabel(month)}暂无排班</EmptyTitle>
              <EmptyDescription>
                点击下方按钮，由智能引擎一键生成整月排班后再进行人工微调
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                onClick={() => void handleGenerate()}
                disabled={generating}
                data-ai-section-type="button"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating ? "智能排班求解中…" : "一键智能排班"}
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <ScheduleMatrixTable
          month={month}
          employees={employees}
          cellMap={cellMap}
          onCellClick={handleCellClick}
        />
      )}

      <ScheduleMatrixCellEditor
        open={editorOpen}
        employee={editorState.employee}
        date={editorState.date}
        currentCode={editorState.currentCode}
        onClose={() => setEditorOpen(false)}
        onShiftChange={handleShiftChange}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default ScheduleMatrixPage;
