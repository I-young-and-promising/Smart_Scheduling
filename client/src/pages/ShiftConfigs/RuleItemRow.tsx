import React from "react";
import { Lock, Scale } from "lucide-react";
import type { RuleItem, RuleType } from "@shared/api.interface";
import { Checkbox } from "@client/src/components/ui/checkbox";
import { Input } from "@client/src/components/ui/input";

interface RuleItemRowProps {
  rule: RuleItem;
  onChange: (rule: RuleItem) => void;
}

const TYPE_OPTIONS: { value: RuleType; label: string; icon: React.ReactNode }[] = [
  { value: "hard", label: "硬性", icon: <Lock className="h-3.5 w-3.5" /> },
  { value: "soft", label: "软性", icon: <Scale className="h-3.5 w-3.5" /> },
];

const RuleItemRow: React.FC<RuleItemRowProps> = ({ rule, onChange }) => {
  const isSoft: boolean = rule.type === "soft";

  const update = (patch: Partial<RuleItem>): void => {
    onChange({ ...rule, ...patch });
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!isSoft) return;
    const parsed = Number.parseInt(e.target.value, 10);
    const weight = Number.isNaN(parsed)
      ? 0
      : Math.max(1, Math.min(100, parsed));
    update({ weight });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#e8e6e5] bg-white px-3 py-2.5">
      <Checkbox
        checked={rule.enabled}
        onCheckedChange={(checked: boolean | "indeterminate") =>
          update({ enabled: checked === true })
        }
        aria-label={`启用 ${rule.name}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#78716c]">{rule.code}</span>
          <span className="truncate text-sm font-medium">{rule.name}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {TYPE_OPTIONS.map((option) => {
          const active: boolean = rule.type === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => update({ type: option.value })}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/80"
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="w-20">
        <Input
          type="number"
          min={0}
          max={100}
          step={1}
          disabled={!isSoft}
          value={isSoft ? rule.weight : 0}
          onChange={handleWeightChange}
          className="h-8 text-right"
        />
      </div>
    </div>
  );
};

export default RuleItemRow;
