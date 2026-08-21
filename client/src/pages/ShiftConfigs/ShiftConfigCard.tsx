import React from "react";
import { Clock, Moon, Pencil, Sparkles, Sun, Trash2, Users } from "lucide-react";
import { Badge } from "@client/src/components/ui/badge";
import { Button } from "@client/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/src/components/ui/card";
import type { ShiftConfig } from "@shared/api.interface";
import { SHIFT_STRIP_CLASS } from "./constants";

export type ShiftConfigWithId = ShiftConfig & { id: string };

interface ShiftTagProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

const ShiftTag: React.FC<ShiftTagProps> = ({ icon, label, active }) => {
  if (!active) return null;
  return (
    <Badge
      variant="secondary"
      className="gap-1 rounded-full bg-accent font-normal text-accent-foreground"
    >
      {icon}
      {label}
    </Badge>
  );
};

interface ShiftConfigCardProps {
  config: ShiftConfigWithId;
  onEdit: (config: ShiftConfigWithId) => void;
  onDelete: (config: ShiftConfigWithId) => void;
}

const ShiftConfigCard: React.FC<ShiftConfigCardProps> = ({
  config,
  onEdit,
  onDelete,
}) => {
  const isRest: boolean = config.code === "rest";
  const timeRange: string = config.crossDay
    ? `${config.startTime} - 次日 ${config.endTime}`
    : `${config.startTime} - ${config.endTime}`;
  const countText: string =
    config.minCount !== null && config.maxCount !== null
      ? `${config.minCount} ~ ${config.maxCount} 人`
      : "—";
  const holidayCountText: string =
    config.holidayMinCount !== null && config.holidayMaxCount !== null
      ? `${config.holidayMinCount} ~ ${config.holidayMaxCount} 人`
      : "—";
  const taskCodeCount: number = config.taskCodes?.length ?? 0;

  return (
    <Card className="overflow-hidden border shadow-none">
      <div className={`h-1.5 w-full ${SHIFT_STRIP_CLASS[config.code]}`} />
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-sm ${SHIFT_STRIP_CLASS[config.code]}`}
          />
          <CardTitle className="text-base font-semibold">{config.name}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {!isRest && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              aria-label={`编辑${config.name}`}
              onClick={() => onEdit(config)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {!isRest && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
              aria-label={`删除${config.name}`}
              onClick={() => onDelete(config)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="font-mono text-foreground">{timeRange}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>每日人数</span>
          <span className="ml-auto font-mono text-foreground">{countText}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>节假日人数</span>
          <span className="ml-auto font-mono text-foreground">
            {holidayCountText}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <ShiftTag icon={<Moon className="h-3 w-3" />} label="夜班" active={config.isNightShift} />
          <ShiftTag icon={<Sparkles className="h-3 w-3" />} label="通宵" active={config.isOvernight} />
          <ShiftTag icon={<Users className="h-3 w-3" />} label="需主管" active={config.requireSupervisor} />
          <ShiftTag icon={<Users className="h-3 w-3" />} label="新老搭配" active={config.requireSeniorJuniorMix} />
          <ShiftTag
            icon={<Sun className="h-3 w-3" />}
            label={`优先级 ${config.priority}`}
            active={config.priority > 0}
          />
          {taskCodeCount > 0 && (
            <Badge
              variant="secondary"
              className="rounded-full bg-accent font-normal text-accent-foreground"
            >
              {taskCodeCount} 个任务编码
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShiftConfigCard;
