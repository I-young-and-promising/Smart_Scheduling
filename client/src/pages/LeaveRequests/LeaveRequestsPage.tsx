import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Clock3, Inbox, Loader2, Plus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logger } from "@lark-apaas/client-toolkit/logger";
import {
  Table,
  type TableProps,
} from "@lark-apaas/client-toolkit/antd-table";
import {
  approveLeaveRequest,
  listLeaveRequests,
  rejectLeaveRequest,
} from "@client/src/api/leave-requests";
import type {
  LeaveRequest,
  LeaveRequestListResponse,
  LeaveRequestStatus,
} from "@shared/api.interface";
import { cn } from "@client/src/lib/utils";
import { useIdentity } from "@client/src/hooks/useIdentity";
import { Badge } from "@client/src/components/ui/badge";
import { Button } from "@client/src/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@client/src/components/ui/tabs";
import CreateLeaveDialog from "./CreateLeaveDialog";
import { getErrorMessage } from "./utils";

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
}

const STATUS_META: Record<LeaveRequestStatus, StatusMeta> = {
  pending: {
    label: "待审批",
    icon: Clock3,
    badgeClassName: "border-transparent bg-amber-50 text-amber-700",
  },
  approved: {
    label: "已通过",
    icon: Check,
    badgeClassName: "border-transparent bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "已驳回",
    icon: X,
    badgeClassName: "border-transparent bg-red-50 text-red-700",
  },
};

type TabValue = "all" | LeaveRequestStatus;

const TAB_ITEMS: { value: TabValue; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待审批" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已驳回" },
];

const StatusBadge: React.FC<{ status: LeaveRequestStatus }> = ({
  status,
}) => {
  const meta: StatusMeta = STATUS_META[status];
  const Icon: LucideIcon = meta.icon;
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1", meta.badgeClassName)}
    >
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
};

const LeaveRequestsPage: React.FC = () => {
  const { identity } = useIdentity();
  const isEmployee: boolean = identity?.role === "employee";
  const selfEmployeeId: string | null = identity?.employeeId ?? null;
  const [tab, setTab] = useState<TabValue>("all");
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const loadList = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const statusFilter: LeaveRequestStatus | undefined =
        tab === "all" ? undefined : tab;
      const response: LeaveRequestListResponse =
        await listLeaveRequests(statusFilter);
      setItems(response.items);
      setTotal(response.total);
    } catch (error: unknown) {
      logger.error("加载排休申请列表失败", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleReview = async (
    record: LeaveRequest,
    action: "approve" | "reject",
  ): Promise<void> => {
    setReviewingId(record.id);
    try {
      if (action === "approve") {
        await approveLeaveRequest(record.id);
        toast.success("已通过该申请");
      } else {
        await rejectLeaveRequest(record.id);
        toast.success("已驳回该申请");
      }
      await loadList();
    } catch (error: unknown) {
      logger.error("审批排休申请失败", error);
      toast.error(getErrorMessage(error));
    } finally {
      setReviewingId(null);
    }
  };

  const reviewing: boolean = reviewingId !== null;

  const columns: TableProps<LeaveRequest>["columns"] = [
    {
      title: "申请人",
      dataIndex: "employeeName",
      key: "employeeName",
      width: 160,
      render: (value: string) => (
        <span className="font-medium">{value}</span>
      ),
    },
    {
      title: "开始日期",
      dataIndex: "startDate",
      key: "startDate",
      width: 140,
      render: (value: string) => (
        <span className="font-mono text-xs">{value}</span>
      ),
    },
    {
      title: "结束日期",
      dataIndex: "endDate",
      key: "endDate",
      width: 140,
      render: (value: string) => (
        <span className="font-mono text-xs">{value}</span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: LeaveRequestStatus) => <StatusBadge status={status} />,
    },
    {
      title: "操作",
      key: "action",
      width: 170,
      render: (_: unknown, record: LeaveRequest) => {
        if (isEmployee || record.status !== "pending") {
          return <span className="text-muted-foreground">—</span>;
        }
        const busy: boolean = reviewingId === record.id;
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={reviewing}
              onClick={() => void handleReview(record, "approve")}
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check />
              )}
              通过
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={reviewing}
              onClick={() => void handleReview(record, "reject")}
            >
              <X />
              驳回
            </Button>
          </div>
        );
      },
    },
  ];

  const emptyContent: React.ReactNode = (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
      <Inbox className="size-8" />
      <p className="text-sm">
        {tab === "all" ? "暂无排休申请" : `暂无${STATUS_META[tab as LeaveRequestStatus].label}的申请`}
      </p>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">
            排休申请管理
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEmployee
              ? `仅展示您本人的排休申请，共 ${total} 条记录`
              : `审批员工排休申请，共 ${total} 条记录`}
          </p>
        </div>
        <Button
          data-ai-section-type="button"
          onClick={() => setCreateOpen(true)}
        >
          <Plus />
          新建申请
        </Button>
      </div>

      <div className="mt-4 rounded-[10px] border bg-card overflow-hidden">
        <div className="px-3 pt-2 sm:px-4">
          <Tabs
            value={tab}
            onValueChange={(value: string) => setTab(value as TabValue)}
          >
            <TabsList>
              {TAB_ITEMS.map(
                (item: { value: TabValue; label: string }) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}

                  >
                    {item.label}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
          </Tabs>
        </div>
        <Table<LeaveRequest>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{ emptyText: emptyContent }}
        />
      </div>

      <CreateLeaveDialog
        open={createOpen}
        isEmployee={isEmployee}
        selfEmployeeId={selfEmployeeId}
        onOpenChange={setCreateOpen}
        onCreated={loadList}
      />
    </div>
  );
};

export default LeaveRequestsPage;
