import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { toast } from "sonner";
import { Link as ReactRouterLink } from "react-router-dom";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Grid3X3,
  Loader2,
  Redo2,
  Send,
  Sparkles,
  Undo2,
  Upload,
} from "lucide-react";
import { listEmployees } from "@client/src/api/employees";
import {
  checkExportSchedule,
  exportScheduleExcel,
  generateProposals,
  generateSchedule,
  getHolidays,
  getRuleConfig,
  optimizeSchedule,
  updateScheduleCell,
} from "@client/src/api/schedules";
import type {
  Employee,
  EmployeeListResponse,
  GenerateProposalsResponse,
  Holiday,
  OptimizeScheduleResponse,
  RuleConfig,
  ScheduleProposal,
  ScheduleWarning,
  ShiftCode,
} from "@shared/api.interface";
import { Button } from "@client/src/components/ui/button";
import ExportCheckDialog from "./ExportCheckDialog";
import ImportHistoryPanel from "./ImportHistoryPanel";
import ImportScheduleDialog from "./ImportScheduleDialog";
import ScheduleCalendar from "./ScheduleCalendar";
import ScheduleChangeLogPanel from "./ScheduleChangeLogPanel";
import ScheduleDayDetail, {
  type CellChangeDetail,
} from "./ScheduleDayDetail";
import ScheduleDailyStats from "./ScheduleDailyStats";
import ScheduleNightCounts from "./ScheduleNightCounts";
import SchedulePublishBar from "./SchedulePublishBar";
import ScheduleWarningsPanel from "./ScheduleWarningsPanel";
import { extractApiErrorMessage, formatMonthLabel, SHIFT_META, SHIFT_ORDER } from "./schedule-utils";
import { type DayHighlight } from "./ScheduleCalendar";
import { useScheduleOverview } from "./useScheduleOverview";
import ProposalsDialog from "./ProposalsDialog";

interface CellChangeHistoryItem extends CellChangeDetail {
  timestamp: number;
}

const SchedulePage: React.FC = () => {
  const { currentDepartment } = useDepartment();
  const [month, setMonth] = useState<string>(() => dayjs().format("YYYY-MM"));
  const { overview, loading, reload } = useScheduleOverview(
    month,
    currentDepartment,
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [generating, setGenerating] = useState<boolean>(false);
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [highlight, setHighlight] = useState<DayHighlight | null>(null);
  const [importOpen, setImportOpen] = useState<boolean>(false);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [publishRefreshKey, setPublishRefreshKey] = useState<number>(0);
  const [importHistoryRefreshKey, setImportHistoryRefreshKey] = useState<number>(0);
  const [ruleConfig, setRuleConfig] = useState<RuleConfig | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [proposals, setProposals] = useState<ScheduleProposal[]>([]);
  const [proposalsOpen, setProposalsOpen] = useState<boolean>(false);
  const [exportCheck, setExportCheck] = useState<{
    open: boolean;
    errors: string[];
    warnings: string[];
  }>({ open: false, errors: [], warnings: [] });
  const [historyPast, setHistoryPast] = useState<CellChangeHistoryItem[]>([]);
  const [historyFuture, setHistoryFuture] = useState<CellChangeHistoryItem[]>([]);
  const [historyBusy, setHistoryBusy] = useState<boolean>(false);

  useEffect(() => {
    const loadRuleConfigData = async (): Promise<void> => {
      try {
        const config = await getRuleConfig(currentDepartment);
        setRuleConfig(config);
      } catch (error: unknown) {
        logger.error("获取规则配置失败", error);
      }
    };
    void loadRuleConfigData();
  }, [currentDepartment]);

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
  }, []);

  useEffect(() => {
    const loadHolidaysData = async (): Promise<void> => {
      try {
        const response = await getHolidays(month);
        setHolidays(response.items);
      } catch (error: unknown) {
        logger.error("获取节假日失败", error);
      }
    };
    void loadHolidaysData();
  }, [month, currentDepartment]);

  useEffect(() => {
    if (!highlight) return;
    const timer: ReturnType<typeof setTimeout> = setTimeout(
      () => setHighlight(null),
      2600,
    );
    return () => clearTimeout(timer);
  }, [highlight]);

  const cellMap: Map<string, ShiftCode> = useMemo(() => {
    const map: Map<string, ShiftCode> = new Map<string, ShiftCode>();
    for (const cell of overview?.cells ?? []) {
      map.set(`${cell.employeeId}|${cell.date}`, cell.shiftCode);
    }
    return map;
  }, [overview]);

  const lockedMap: Map<string, boolean> = useMemo(() => {
    const map: Map<string, boolean> = new Map<string, boolean>();
    for (const cell of overview?.cells ?? []) {
      if (cell.locked) {
        map.set(`${cell.employeeId}|${cell.date}`, true);
      }
    }
    return map;
  }, [overview]);

  const prefixDates: string[] = useMemo(() => {
    const set: Set<string> = new Set<string>();
    for (const cell of overview?.prefixCells ?? []) set.add(cell.date);
    return Array.from(set).sort();
  }, [overview]);

  const prefixCellMap: Map<string, ShiftCode> = useMemo(() => {
    const map: Map<string, ShiftCode> = new Map<string, ShiftCode>();
    for (const cell of overview?.prefixCells ?? []) {
      map.set(`${cell.employeeId}|${cell.date}`, cell.shiftCode);
    }
    return map;
  }, [overview]);

  const violationDates: Set<string> = useMemo(() => {
    const set: Set<string> = new Set<string>();
    for (const warning of overview?.warnings ?? []) {
      if (warning.date) set.add(warning.date);
    }
    return set;
  }, [overview]);

  const hasSchedule: boolean = (overview?.cells.length ?? 0) > 0;
  const prevMonth: string = dayjs(`${month}-01`)
    .subtract(1, "month")
    .format("YYYY-MM");

  const refreshPublishStatus = useCallback((): void => {
    setPublishRefreshKey((prev: number) => prev + 1);
  }, []);

  const changeMonth = useCallback((delta: number): void => {
    setHighlight(null);
    setMonth((prev: string) =>
      dayjs(`${prev}-01`).add(delta, "month").format("YYYY-MM"),
    );
  }, []);

  const handleGenerate = useCallback(async (): Promise<void> => {
    setGenerating(true);
    try {
      const response: GenerateProposalsResponse = await generateProposals({
        month,
        department: currentDepartment,
      });
      logger.log({
        level: "info",
        args: [
          "智能排班 proposals",
          {
            month,
            department: currentDepartment,
            count: response.proposals?.length ?? 0,
          },
        ],
      });
      if (response.proposals && response.proposals.length > 0) {
        setProposals(response.proposals);
        setProposalsOpen(true);
        return;
      }
      // 候选方案为空时兜底直接生成当月班表
      const generateResponse = await generateSchedule({
        month,
        department: currentDepartment,
      });
      if (generateResponse.success) {
        toast.success(generateResponse.message || "排班生成完成");
        await reload();
        refreshPublishStatus();
      } else {
        toast.error(
          generateResponse.message || "排班生成失败，请检查员工与班次配置",
        );
      }
    } catch (error: unknown) {
      logger.error("排班生成失败", error);
      toast.error(extractApiErrorMessage(error, "排班生成失败，请重试"));
    } finally {
      setGenerating(false);
    }
  }, [month, currentDepartment, reload, refreshPublishStatus]);

  const handleProposalApplied = useCallback(async (): Promise<void> => {
    setProposalsOpen(false);
    await reload();
    refreshPublishStatus();
  }, [reload, refreshPublishStatus]);

  const handleOptimize = useCallback(async (): Promise<void> => {
    setOptimizing(true);
    try {
      const response: OptimizeScheduleResponse = await optimizeSchedule({
        month,
        department: currentDepartment,
      });
      if (response.success) {
        toast.success(
          response.message || `优化完成，变动 ${response.changedCount} 格`,
        );
        await reload();
        refreshPublishStatus();
      } else {
        toast.error(response.message || "优化失败，请检查约束条件");
      }
    } catch (error: unknown) {
      logger.error("排班优化失败", error);
      toast.error(extractApiErrorMessage(error, "排班优化失败，请重试"));
    } finally {
      setOptimizing(false);
    }
  }, [month, reload, refreshPublishStatus, currentDepartment]);

  const doExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const blob: Blob = await exportScheduleExcel(month, currentDepartment);
      const url: string = URL.createObjectURL(blob);
      const anchor: HTMLAnchorElement = document.createElement("a");
      anchor.href = url;
      anchor.download = `排班表-${month}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("排班表导出完成");
    } catch (error: unknown) {
      logger.error("导出排班表失败", error);
      toast.error("导出排班表失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  const handleExport = useCallback(async (): Promise<void> => {
    setExporting(true);
    try {
      const check = await checkExportSchedule(month, currentDepartment);
      if (!check.valid || check.warnings.length > 0) {
        setExportCheck({
          open: true,
          errors: check.errors,
          warnings: check.warnings,
        });
        return;
      }
      await doExport();
    } catch (error: unknown) {
      logger.error("导出校验失败", error);
      toast.error(extractApiErrorMessage(error, "导出前检查失败"));
    } finally {
      setExporting(false);
    }
  }, [month, currentDepartment]);

  const handleConfirmExport = useCallback(async (): Promise<void> => {
    setExportCheck((prev) => ({ ...prev, open: false }));
    await doExport();
  }, []);

  const handleImported = useCallback(async (): Promise<void> => {
    await reload();
    refreshPublishStatus();
    setImportHistoryRefreshKey((prev: number) => prev + 1);
  }, [reload, refreshPublishStatus]);

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
      if (!preview) {
        await reload();
        refreshPublishStatus();
      }
      return response.warnings;
    },
    [reload, refreshPublishStatus, currentDepartment],
  );

  const handleCellSaved = useCallback((change: CellChangeDetail): void => {
    const item: CellChangeHistoryItem = { ...change, timestamp: Date.now() };
    setHistoryPast((prev: CellChangeHistoryItem[]) => [...prev, item]);
    setHistoryFuture([]);
  }, []);

  const applyHistoryItem = useCallback(
    async (item: CellChangeHistoryItem): Promise<void> => {
      setHistoryBusy(true);
      try {
        await updateScheduleCell({
          employeeId: item.employeeId,
          date: item.date,
          shiftCode: item.oldCode,
          department: currentDepartment,
        });
        await reload();
        refreshPublishStatus();
      } catch (error: unknown) {
        logger.error("撤销班次调整失败", error);
        toast.error(extractApiErrorMessage(error, "撤销失败，请重试"));
      } finally {
        setHistoryBusy(false);
      }
    },
    [reload, refreshPublishStatus, currentDepartment],
  );

  const handleUndo = useCallback(async (): Promise<void> => {
    if (historyPast.length === 0 || historyBusy) return;
    const item: CellChangeHistoryItem = historyPast[historyPast.length - 1];
    setHistoryPast((prev: CellChangeHistoryItem[]) => prev.slice(0, -1));
    setHistoryFuture((prev: CellChangeHistoryItem[]) => [
      ...prev,
      {
        ...item,
        oldCode: item.newCode,
        newCode: item.oldCode,
      },
    ]);
    await applyHistoryItem(item);
  }, [historyPast, historyBusy, applyHistoryItem]);

  const handleRedo = useCallback(async (): Promise<void> => {
    if (historyFuture.length === 0 || historyBusy) return;
    const item: CellChangeHistoryItem = historyFuture[historyFuture.length - 1];
    setHistoryFuture((prev: CellChangeHistoryItem[]) => prev.slice(0, -1));
    setHistoryPast((prev: CellChangeHistoryItem[]) => [...prev, item]);
    await applyHistoryItem(item);
  }, [historyFuture, historyBusy, applyHistoryItem]);

  const handleLockChange = useCallback(
    async (
      employeeId: string,
      date: string,
      locked: boolean,
    ): Promise<void> => {
      const currentCode: ShiftCode =
        cellMap.get(`${employeeId}|${date}`) ?? "rest";
      await updateScheduleCell({
        employeeId,
        date,
        shiftCode: currentCode,
        locked,
        department: currentDepartment,
      });
      await reload();
      refreshPublishStatus();
    },
    [cellMap, reload, refreshPublishStatus, currentDepartment],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          void handleRedo();
        } else {
          void handleUndo();
        }
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "y" &&
        !e.shiftKey
      ) {
        e.preventDefault();
        void handleRedo();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  const handleLocate = useCallback((warning: ScheduleWarning): void => {
    if (!warning.date) return;
    setHighlight({ date: warning.date, nonce: Date.now() });
  }, []);

  const handleDayClick = useCallback((date: string): void => {
    setDetailDate(date);
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0c0a09]">
          排班工作台
        </h1>
        <p className="text-sm text-[#78716c]">
          一键智能排班与合规监控，日历视图查看每日各班次人数，支持导出排班表 Excel。
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8e6e5] bg-white p-3 shadow-[rgba(0_0_0_0.05)_0px_4px_16px_0px]">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="上个月"
            disabled={loading}
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-28 text-center font-mono text-sm font-semibold text-[#0c0a09]">
            {formatMonthLabel(month)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="下个月"
            disabled={loading}
            onClick={() => changeMonth(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={historyBusy || historyPast.length === 0}
            onClick={() => void handleUndo()}
            data-ai-section-type="button"
          >
            <Undo2 className="h-4 w-4" />
            撤销
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={historyBusy || historyFuture.length === 0}
            onClick={() => void handleRedo()}
            data-ai-section-type="button"
          >
            <Redo2 className="h-4 w-4" />
            重做
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => setImportOpen(true)}
            data-ai-section-type="button"
          >
            <Upload className="h-4 w-4" />
            导入上月班表
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={optimizing || loading || !hasSchedule}
            onClick={() => void handleOptimize()}
            data-ai-section-type="button"
          >
            {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            增量优化
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting || loading || !hasSchedule}
            onClick={() => void handleExport()}
            data-ai-section-type="button"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            导出排班表
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={loading}
            data-ai-section-type="button"
          >
            <ReactRouterLink to="/schedule/matrix">
              <Grid3X3 className="h-4 w-4" />
              人工排班矩阵
            </ReactRouterLink>
          </Button>
          <Button
            size="sm"
            disabled={generating || loading}
            onClick={() => void handleGenerate()}
            data-ai-section-type="button"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "智能排班求解中…" : "一键智能排班"}
          </Button>
          <SchedulePublishBar month={month} refreshKey={publishRefreshKey} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-[#78716c]">
        {SHIFT_ORDER.map((code: ShiftCode) => (
          <div key={code} className="flex items-center gap-1.5">
            <span className={`inline-block h-3.5 w-3.5 rounded-sm ${SHIFT_META[code].cellClass}`} />
            <span>{SHIFT_META[code].label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-3.5 rounded-sm bg-schedule-weekend" />
          <span>周末</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-danger" />
          <span>存在合规警告</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-[#e8e6e5] bg-white p-3 shadow-[rgba(0_0_0_0.05)_0px_4px_16px_0px]">
          {loading || !overview ? (
            <div className="flex h-96 items-center justify-center text-sm text-[#78716c]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在加载班表…
            </div>
          ) : !hasSchedule ? (
            <div className="flex h-96 flex-col items-center justify-center gap-3 text-sm text-[#78716c]">
              <span>暂无排班数据，点击「一键智能排班」生成当月班表</span>
            </div>
          ) : (
            <ScheduleCalendar
              month={month}
              roster={employees}
              cellMap={cellMap}
              prefixDates={prefixDates}
              prefixCellMap={prefixCellMap}
              violationDates={violationDates}
              highlight={highlight}
              holidays={holidays}
              onDayClick={handleDayClick}
            />
          )}
        </div>

        <div className="space-y-4">
          <ScheduleDailyStats dailyStats={overview?.dailyStats ?? []} />
          <ScheduleNightCounts
            nightCounts={overview?.nightCounts ?? []}
            nightLimit={ruleConfig?.nightLimit ?? 10}
          />
          <ScheduleWarningsPanel
            warnings={overview?.warnings ?? []}
            onLocate={handleLocate}
          />
          <ScheduleChangeLogPanel month={month} />
          <ImportHistoryPanel month={month} refreshKey={importHistoryRefreshKey} />
        </div>
      </div>

      <ImportScheduleDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        defaultMonth={prevMonth}
        onImported={handleImported}
      />

      <ScheduleDayDetail
        open={detailDate !== null}
        onOpenChange={(open: boolean): void => {
          if (!open) setDetailDate(null);
        }}
        date={detailDate}
        employees={employees}
        cellMap={cellMap}
        lockedMap={lockedMap}
        onShiftChange={handleShiftChange}
        onSaved={handleCellSaved}
        onLockChange={handleLockChange}
      />

      <ExportCheckDialog
        open={exportCheck.open}
        errors={exportCheck.errors}
        warnings={exportCheck.warnings}
        onOpenChange={(open: boolean): void =>
          setExportCheck((prev) => ({ ...prev, open }))
        }
        onConfirm={() => void handleConfirmExport()}
      />

      <ProposalsDialog
        open={proposalsOpen}
        month={month}
        proposals={proposals}
        onClose={() => setProposalsOpen(false)}
        onApplied={handleProposalApplied}
      />
    </div>
  );
};

export default SchedulePage;
