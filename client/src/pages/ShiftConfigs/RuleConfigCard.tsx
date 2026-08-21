import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Settings2 } from "lucide-react";
import { logger } from "@lark-apaas/client-toolkit/logger";
import type { RuleConfig, RuleItem } from "@shared/api.interface";
import { getRuleConfig, updateRuleConfig } from "@client/src/api/schedules";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
import { Button } from "@client/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@client/src/components/ui/card";
import { Checkbox } from "@client/src/components/ui/checkbox";
import { Input } from "@client/src/components/ui/input";
import { extractApiErrorMessage } from "@client/src/utils/api-error";
import RuleItemRow from "./RuleItemRow";
import TransitionMatrix from "./TransitionMatrix";

const DEFAULT_RULE_CONFIG: RuleConfig = {
  nightLimit: 10,
  weekWorkLimit: 6,
  maxConsecutiveRestDays: 3,
  maxConsecutiveDayShifts: 3,
  nightRestDays: 1,
  prevPrefixStartDay: 16,
  minRestBlockDays: 2,
  minWorkBlockDays: 2,
  nightBiasThreshold: 1,
  baseMonthOffDays: 8,
  seniorJuniorMixEnabled: true,
  supervisorCoverageEnabled: true,
  supervisorNoNightEnabled: true,
  mentorSyncEnabled: true,
  efficiencyMixEnabled: true,
  efficiencyMixWeight: 30,
  workBalanceEnabled: true,
  weeklyDoubleRestEnabled: true,
  workdayDistributionEnabled: true,
  nightPreferenceEnabled: true,
  fixedLeaveEnabled: true,
  transitionMatrix: {
    day: ["day", "middle", "night", "rest"],
    middle: ["middle", "night", "rest"],
    night: ["rest"],
    rest: ["day", "middle", "night", "rest"],
  },
  rules: [],
};

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  min,
  max,
  onChange,
}) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium">{label}</label>
    <Input
      type="number"
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = Number.parseInt(e.target.value, 10);
        onChange(Number.isNaN(parsed) ? 0 : parsed);
      }}
      className="h-8"
    />
  </div>
);

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleField: React.FC<ToggleFieldProps> = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#e8e6e5] bg-white px-3 py-2.5">
    <span className="text-sm font-medium">{label}</span>
    <Checkbox
      checked={checked}
      onCheckedChange={(value: boolean | "indeterminate") => onChange(value === true)}
      aria-label={label}
    />
  </label>
);

const RuleConfigCard: React.FC = () => {
  const { currentDepartment } = useDepartment();
  const [config, setConfig] = useState<RuleConfig>(DEFAULT_RULE_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const data = await getRuleConfig(currentDepartment);
        setConfig(data);
      } catch (error: unknown) {
        logger.error("加载规则配置失败", error);
        toast.error(extractApiErrorMessage(error, "规则配置加载失败"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [currentDepartment]);

  const updateField = <K extends keyof RuleConfig>(
    key: K,
    value: RuleConfig[K],
  ): void => {
    setConfig((prev: RuleConfig) => ({ ...prev, [key]: value }));
  };

  const updateRuleItem = (index: number, item: RuleItem): void => {
    setConfig((prev: RuleConfig) => {
      const rules: RuleItem[] = [...(prev.rules ?? [])];
      rules[index] = item;
      return { ...prev, rules };
    });
  };

  const validate = (config: RuleConfig): string | null => {
    if (config.nightLimit < 1) return "月度晚班上限至少为 1";
    if (config.weekWorkLimit < 1) return "单周工作上限至少为 1";
    if (config.maxConsecutiveRestDays < 1) return "连续休息上限至少为 1";
    if (config.maxConsecutiveDayShifts < 1) return "连续白班上限至少为 1";
    if (config.nightRestDays < 1) return "夜班后休息天数至少为 1";
    if (config.prevPrefixStartDay < 1 || config.prevPrefixStartDay > 31) {
      return "上月前缀起始日号应在 1~31 之间";
    }
    if ((config.minRestBlockDays ?? 0) < 1) return "最小休息块天数至少为 1";
    if ((config.minWorkBlockDays ?? 0) < 1) return "最小工作块天数至少为 1";
    if ((config.nightBiasThreshold ?? 0) < 0) return "晚班偏差阈值不能为负数";
    if ((config.baseMonthOffDays ?? 0) < 0) return "基础月休天数不能为负数";
    for (const from of Object.keys(config.transitionMatrix)) {
      const allowed = config.transitionMatrix[from] ?? [];
      if (allowed.length === 0) {
        return `${from} 后至少允许一种衔接班次`;
      }
    }
    return null;
  };

  const handleSave = async (): Promise<void> => {
    const error = validate(config);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      await updateRuleConfig(config, currentDepartment);
      toast.success("规则配置已保存，下次排班生效");
    } catch (error: unknown) {
      logger.error("保存规则配置失败", error);
      toast.error(extractApiErrorMessage(error, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const rules: RuleItem[] = config.rules ?? [];

  return (
    <Card className="border shadow-none">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">规则引擎配置</CardTitle>
        </div>
        <Button
          size="sm"
          disabled={loading || saving}
          onClick={() => void handleSave()}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          保存规则
        </Button>
      </CardHeader>
      <CardContent className="space-y-5 p-4 pt-0">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载规则配置…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <NumberField
                label="月度晚班上限"
                value={config.nightLimit}
                min={1}
                onChange={(value: number) => updateField("nightLimit", value)}
              />
              <NumberField
                label="单周工作上限"
                value={config.weekWorkLimit}
                min={1}
                max={7}
                onChange={(value: number) => updateField("weekWorkLimit", value)}
              />
              <NumberField
                label="最大连续休息天数"
                value={config.maxConsecutiveRestDays}
                min={1}
                onChange={(value: number) =>
                  updateField("maxConsecutiveRestDays", value)
                }
              />
              <NumberField
                label="最大连续白班天数"
                value={config.maxConsecutiveDayShifts}
                min={1}
                onChange={(value: number) =>
                  updateField("maxConsecutiveDayShifts", value)
                }
              />
              <NumberField
                label="夜班后休息天数"
                value={config.nightRestDays}
                min={1}
                max={3}
                onChange={(value: number) => updateField("nightRestDays", value)}
              />
              <NumberField
                label="上月前缀起始日"
                value={config.prevPrefixStartDay}
                min={1}
                max={31}
                onChange={(value: number) =>
                  updateField("prevPrefixStartDay", value)
                }
              />
              <NumberField
                label="最小休息块天数"
                value={config.minRestBlockDays ?? 1}
                min={1}
                onChange={(value: number) =>
                  updateField("minRestBlockDays", value)
                }
              />
              <NumberField
                label="最小工作块天数"
                value={config.minWorkBlockDays ?? 2}
                min={1}
                onChange={(value: number) =>
                  updateField("minWorkBlockDays", value)
                }
              />
              <NumberField
                label="晚班偏差阈值"
                value={config.nightBiasThreshold ?? 1}
                min={0}
                onChange={(value: number) =>
                  updateField("nightBiasThreshold", value)
                }
              />
              <NumberField
                label="基础月休天数"
                value={config.baseMonthOffDays ?? 8}
                min={0}
                onChange={(value: number) =>
                  updateField("baseMonthOffDays", value)
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ToggleField
                label="新老搭配"
                checked={config.seniorJuniorMixEnabled ?? false}
                onChange={(checked: boolean) =>
                  updateField("seniorJuniorMixEnabled", checked)
                }
              />
              <ToggleField
                label="主管覆盖"
                checked={config.supervisorCoverageEnabled ?? false}
                onChange={(checked: boolean) =>
                  updateField("supervisorCoverageEnabled", checked)
                }
              />
              <ToggleField
                label="主管不排夜班"
                checked={config.supervisorNoNightEnabled ?? false}
                onChange={(checked: boolean) =>
                  updateField("supervisorNoNightEnabled", checked)
                }
              />
              <ToggleField
                label="每周双休连续"
                checked={config.weeklyDoubleRestEnabled ?? false}
                onChange={(checked: boolean) =>
                  updateField("weeklyDoubleRestEnabled", checked)
                }
              />
              <ToggleField
                label="工作日分布均匀"
                checked={config.workdayDistributionEnabled ?? false}
                onChange={(checked: boolean) =>
                  updateField("workdayDistributionEnabled", checked)
                }
              />
              <ToggleField
                label="固定周期休假"
                checked={config.fixedLeaveEnabled ?? false}
                onChange={(checked: boolean) =>
                  updateField("fixedLeaveEnabled", checked)
                }
              />
            </div>

            <TransitionMatrix config={config} onChange={setConfig} />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">规则权重与类型</label>
                <span className="text-xs text-muted-foreground">
                  硬性约束必须满足，软性约束按权重评分
                </span>
              </div>
              <div className="space-y-2">
                {rules.map((rule: RuleItem, index: number) => (
                  <RuleItemRow
                    key={rule.code}
                    rule={rule}
                    onChange={(item: RuleItem) => updateRuleItem(index, item)}
                  />
                ))}
                {rules.length === 0 && (
                  <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                    暂无规则配置，保存后将生成默认规则列表
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RuleConfigCard;
