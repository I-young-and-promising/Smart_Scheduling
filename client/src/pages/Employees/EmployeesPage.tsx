import React, { useCallback, useEffect, useState } from "react";
import {
  Table,
  type TableProps,
} from "@lark-apaas/client-toolkit/antd-table";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { toast } from "sonner";
import {
  AlertTriangle,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { listEmployees, deleteEmployee } from "@client/src/api/employees";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
import type {
  Employee,
  EmployeeListResponse,
  EmployeePreference,
  EmployeeStatus,
  UserRole,
} from "@shared/api.interface";
import { Badge } from "@client/src/components/ui/badge";
import { Button } from "@client/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@client/src/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@client/src/components/ui/empty";
import { Input } from "@client/src/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@client/src/components/ui/alert-dialog";
import EmployeeFormDialog from "./EmployeeFormDialog";

const EMPLOYEE_PREFERENCE_LABELS: Record<EmployeePreference, string> = {
  prefer_day: "偏好白班",
  prefer_night: "多排晚班",
  none: "无偏好",
};

const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "在岗",
  probation: "试用期",
  leave: "休假中",
  resigned: "离职",
};

const EMPLOYEE_PREFERENCE_BADGE_CLASS: Record<EmployeePreference, string> = {
  prefer_day: "border-transparent bg-shift-day/15 text-shift-day-foreground",
  prefer_night:
    "border-transparent bg-shift-night/15 text-[hsl(262_60%_32%)]",
  none: "border-transparent bg-muted text-muted-foreground",
};

const EMPLOYEE_STATUS_BADGE_CLASS: Record<EmployeeStatus, string> = {
  active: "border-transparent bg-emerald-100 text-emerald-700",
  probation: "border-transparent bg-amber-100 text-amber-700",
  leave: "border-transparent bg-sky-100 text-sky-700",
  resigned: "border-transparent bg-stone-200 text-stone-600",
};

interface PreferenceBadgeProps {
  preference: EmployeePreference;
}

const PreferenceBadge: React.FC<PreferenceBadgeProps> = ({ preference }) => {
  const label: string =
    EMPLOYEE_PREFERENCE_LABELS[preference] ?? EMPLOYEE_PREFERENCE_LABELS.none;
  const badgeClass: string =
    EMPLOYEE_PREFERENCE_BADGE_CLASS[preference] ??
    EMPLOYEE_PREFERENCE_BADGE_CLASS.none;
  return (
    <Badge variant="outline" className={`rounded-full ${badgeClass}`}>
      {label}
    </Badge>
  );
};

interface StatusBadgeProps {
  status: EmployeeStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const label: string =
    EMPLOYEE_STATUS_LABELS[status] ?? EMPLOYEE_STATUS_LABELS.active;
  const badgeClass: string =
    EMPLOYEE_STATUS_BADGE_CLASS[status] ?? EMPLOYEE_STATUS_BADGE_CLASS.active;
  return (
    <Badge variant="outline" className={`rounded-full ${badgeClass}`}>
      {label}
    </Badge>
  );
};

interface UserRoleBadgeProps {
  userRole: UserRole;
}

const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ userRole }) => {
  if (userRole === "admin") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-transparent bg-primary/10 text-primary"
      >
        管理员
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full border-transparent bg-muted text-muted-foreground"
    >
      员工
    </Badge>
  );
};

const EmployeesPage: React.FC = () => {
  const { currentDepartment } = useDepartment();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchInput, setSearchInput] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(
    null,
  );

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setKeyword(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchEmployees = useCallback(
    async (activeKeyword: string, department: string): Promise<void> => {
      setLoading(true);
      try {
        const response: EmployeeListResponse = await listEmployees(
          activeKeyword || undefined,
          department,
        );
        setEmployees(response.items);
        if (!activeKeyword) {
          setTotalCount(response.total);
        }
      } catch (error: unknown) {
        logger.error("获取员工列表失败", error);
        toast.error("员工列表加载失败，请重试");
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchEmployees(keyword, currentDepartment);
  }, [keyword, currentDepartment, reloadKey, fetchEmployees]);

  const handleCreate = (): void => {
    setEditingEmployee(null);
    setDialogOpen(true);
  };

  const handleEdit = (record: Employee): void => {
    setEditingEmployee(record);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean): void => {
    setDialogOpen(open);
    if (!open) {
      setEditingEmployee(null);
    }
  };

  const handleSaved = (): void => {
    setReloadKey((prev: number) => prev + 1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingEmployee) return;
    try {
      await deleteEmployee(deletingEmployee.id);
      toast.success("员工已删除");
      setReloadKey((prev: number) => prev + 1);
    } catch (error: unknown) {
      logger.error("删除员工失败", error);
      toast.error("删除失败，请重试");
    } finally {
      setDeletingEmployee(null);
    }
  };

  const columns: TableProps<Employee>["columns"] = [
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 110,
    },
    {
      title: "UID",
      dataIndex: "uid",
      key: "uid",
      width: 160,
      ellipsis: true,
      render: (value: string) => (
        <span className="font-mono text-xs">{value}</span>
      ),
    },
    {
      title: "部门",
      dataIndex: "department",
      key: "department",
      width: 100,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (value: EmployeeStatus) => <StatusBadge status={value} />,
    },
    {
      title: "偏好标签",
      dataIndex: "preference",
      key: "preference",
      width: 110,
      render: (value: EmployeePreference) => (
        <PreferenceBadge preference={value} />
      ),
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 110,
    },
    {
      title: "效率",
      dataIndex: "efficiencyTag",
      key: "efficiencyTag",
      width: 80,
      render: (value?: string) => value || "-",
    },
    {
      title: "产能等级",
      dataIndex: "capacityLevel",
      key: "capacityLevel",
      width: 90,
      render: (value?: string) => value || "-",
    },
    {
      title: "系统角色",
      dataIndex: "userRole",
      key: "userRole",
      width: 90,
      render: (value: UserRole) => <UserRoleBadge userRole={value} />,
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 110,
      render: (_: unknown, record: Employee) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleEdit(record)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeletingEmployee(record)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display text-2xl font-normal tracking-tight text-[#0c0a09]">
            员工管理
          </h1>
          <p className="mt-1 text-sm text-[#78716c]">
            维护团队成员档案、角色标签与排班权限
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          新建员工
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-[#78716c]">当前部门人数</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium text-[#0c0a09]">
              {totalCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c]" />
            <Input
              placeholder="搜索姓名、工号或 UID"
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchInput(e.target.value)
              }
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {employees.length === 0 && !loading ? (
            <Empty className="py-12">
              <EmptyMedia>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  {keyword ? (
                    <SearchX className="h-7 w-7 text-[#78716c]" />
                  ) : (
                    <Users className="h-7 w-7 text-[#78716c]" />
                  )}
                </div>
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>
                  {keyword ? "未找到匹配员工" : "暂无员工数据"}
                </EmptyTitle>
                <EmptyDescription>
                  {keyword
                    ? "请尝试更换关键词"
                    : "点击右上角按钮添加团队成员"}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={employees}
              rowKey="id"
              loading={loading}
              scroll={{ x: "max-content" }}
              pagination={false}
              size="small"
            />
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog
        open={dialogOpen}
        employee={editingEmployee}
        onOpenChange={handleDialogChange}
        onSaved={handleSaved}
        defaultDepartment={currentDepartment}
      />

      <AlertDialog
        open={deletingEmployee !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingEmployee(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              确认删除员工？
            </AlertDialogTitle>
            <AlertDialogDescription>
              删除后不可恢复，相关的排班记录可能受到影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeesPage;
