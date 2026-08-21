import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, Trophy } from "lucide-react";
import type { ScheduleProposal } from "@shared/api.interface";
import { applyProposal } from "@client/src/api/schedules";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
import { Button } from "@client/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import { Progress } from "@client/src/components/ui/progress";
import { toast } from "sonner";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { extractApiErrorMessage } from "@client/src/utils/api-error";

interface ProposalsDialogProps {
  open: boolean;
  month: string;
  proposals: ScheduleProposal[];
  onClose: () => void;
  onApplied: () => void;
}

const ProposalsDialog: React.FC<ProposalsDialogProps> = ({
  open,
  month,
  proposals,
  onClose,
  onApplied,
}) => {
  const { currentDepartment } = useDepartment();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [applying, setApplying] = useState<boolean>(false);

  const toggleExpand = (index: number): void => {
    setExpanded((prev: Record<number, boolean>) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleApply = async (): Promise<void> => {
    const proposal: ScheduleProposal | undefined = proposals[selectedIndex];
    if (!proposal) return;
    setApplying(true);
    try {
      await applyProposal({
        month,
        strategy: proposal.strategy,
        cells: proposal.cells,
        department: currentDepartment,
      });
      toast.success(`已应用「${proposal.name}」`);
      onApplied();
    } catch (error: unknown) {
      logger.error("应用排班方案失败", error);
      toast.error(extractApiErrorMessage(error, "应用方案失败"));
    } finally {
      setApplying(false);
    }
  };

  if (proposals.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>智能排班方案</DialogTitle>
            <DialogDescription>
              当前约束下未能生成可行方案，请放宽规则后重试。
              <br />
              若后端已可正常生成，请尝试刷新页面后再次点击。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>关闭</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            智能排班方案对比
          </DialogTitle>
          <DialogDescription>
            已按规则权重综合评分，选择最优方案应用
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {proposals.map((proposal: ScheduleProposal, index: number) => {
            const isSelected: boolean = selectedIndex === index;
            const scoreLabel: string = proposal.totalScore.toFixed(1);
            return (
              <div
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`cursor-pointer rounded-[10px] border p-4 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-[#e8e6e5] bg-white hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">{proposal.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {proposal.description}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>

                <div className="mt-4 text-center">
                  <div className="text-3xl font-semibold text-primary">{scoreLabel}</div>
                  <div className="text-xs text-muted-foreground">综合得分</div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">合规警告</span>
                    <span>{proposal.metrics.warningCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">偏好满足</span>
                    <span>{proposal.metrics.preferenceHits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">平均晚班/人</span>
                    <span>{proposal.metrics.avgNightsPerEmployee.toFixed(1)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    toggleExpand(index);
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-1 text-xs text-primary hover:underline"
                >
                  {expanded[index] ? (
                    <>
                      收起得分明细 <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      查看得分明细 <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>

                {expanded[index] && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    {proposal.ruleScores.map((rs) => {
                      const max: number = Math.max(rs.weight, Math.abs(rs.weightedScore));
                      const ratio: number = max > 0 ? Math.max(0, 1 - Math.abs(rs.rawScore) / (Math.abs(rs.rawScore) + max / Math.max(rs.weight, 1))) : 1;
                      return (
                        <div key={rs.code} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate" title={rs.name}>
                              {rs.name}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {rs.weightedScore.toFixed(1)}
                            </span>
                          </div>
                          <Progress value={Math.max(0, Math.min(100, ratio * 100))} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={applying}>
            取消
          </Button>
          <Button onClick={() => void handleApply()} disabled={applying}>
            {applying ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            应用选中方案
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProposalsDialog;
