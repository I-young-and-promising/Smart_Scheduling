import React from "react";
import type { RuleConfig, ShiftCode } from "@shared/api.interface";
import { Checkbox } from "@client/src/components/ui/checkbox";

const SHIFT_CODES: ShiftCode[] = ["day", "middle", "night", "rest"];

const SHIFT_LABELS: Record<ShiftCode, string> = {
  day: "白班",
  middle: "中班",
  night: "晚班",
  rest: "休班",
};

interface TransitionMatrixProps {
  config: RuleConfig;
  onChange: (config: RuleConfig) => void;
}

const TransitionMatrix: React.FC<TransitionMatrixProps> = ({ config, onChange }) => {
  const toggle = (from: ShiftCode, to: ShiftCode): void => {
    const current: ShiftCode[] = config.transitionMatrix[from] ?? [];
    const next: ShiftCode[] = current.includes(to)
      ? current.filter((code: ShiftCode) => code !== to)
      : [...current, to];
    onChange({ ...config, transitionMatrix: { ...config.transitionMatrix, [from]: next } });
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">班次衔接矩阵</label>
      <div className="overflow-x-auto rounded-[10px] border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-accent/50">
              <th className="rounded-tl-[10px] px-3 py-2 text-left font-medium text-muted-foreground">
                前一日班次
              </th>
              {SHIFT_CODES.map((code: ShiftCode, index: number) => (
                <th
                  key={code}
                  className={`px-3 py-2 text-center font-medium text-muted-foreground ${
                    index === SHIFT_CODES.length - 1 ? "rounded-tr-[10px]" : ""
                  }`}
                >
                  后接{SHIFT_LABELS[code]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHIFT_CODES.map((from: ShiftCode, rowIndex: number) => (
              <tr key={from} className={`border-b last:border-b-0 ${rowIndex === SHIFT_CODES.length - 1 ? "[&>td:first-child]:rounded-bl-[10px] [&>td:last-child]:rounded-br-[10px]" : ""}`}>
                <td className="px-3 py-2 font-medium">{SHIFT_LABELS[from]}</td>
                {SHIFT_CODES.map((to: ShiftCode) => {
                  const checked: boolean = (config.transitionMatrix[from] ?? []).includes(to);
                  return (
                    <td key={to} className="px-3 py-2 text-center">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(from, to)}
                        aria-label={`${SHIFT_LABELS[from]} 后接 ${SHIFT_LABELS[to]}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        勾选表示允许前一日班次后直接衔接后一日班次，未勾选则视为违规。
      </p>
    </div>
  );
};

export default TransitionMatrix;
