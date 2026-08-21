import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  Clock3,
  Flame,
  LogIn,
  LogOut,
  Users,
} from "lucide-react";
import { useAppInfo } from "@lark-apaas/client-toolkit/hooks/useAppInfo";
import { useCurrentUserProfile } from "@lark-apaas/client-toolkit/hooks/useCurrentUserProfile";
import { getDataloom } from "@lark-apaas/client-toolkit/dataloom";
import { logger } from "@lark-apaas/client-toolkit/logger";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@client/src/components/ui/avatar";
import { Button } from "@client/src/components/ui/button";
import { cn } from "@/lib/utils";
import { useIdentity } from "@client/src/hooks/useIdentity";
import { useDepartment } from "@client/src/contexts/DepartmentContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { path: "/", label: "排班工作台", icon: CalendarRange },
  { path: "/employees", label: "员工管理", icon: Users },
  { path: "/shift-configs", label: "班次配置", icon: Clock3 },
  { path: "/holidays", label: "节假日", icon: Calendar },
  { path: "/leave-requests", label: "排休申请管理", icon: CalendarOff },
];

const EMPLOYEE_NAV_ITEMS: NavItem[] = [
  { path: "/my-schedule", label: "我的班表", icon: CalendarDays },
  { path: "/leave-requests", label: "我的排休", icon: CalendarOff },
];

const CURRENT_USER_AVATAR: { name: string; fallback: string } = {
  name: "当前用户",
  fallback: "我",
};

const TopNavUser: React.FC = () => {
  const userInfo = useCurrentUserProfile();
  const [logoutOpen, setLogoutOpen] = useState<boolean>(false);
  const isLoggedIn: boolean = Boolean(userInfo.user_id);

  const handleLogout = async (): Promise<void> => {
    const dataloom = await getDataloom();
    const result = await dataloom.service.session.signOut();
    if (result.error) {
      logger.error(`退出登录失败: ${result.error.message}`);
      return;
    }
    window.location.reload();
  };

  const handleLogin = async (): Promise<void> => {
    const dataloom = await getDataloom();
    dataloom.service.session.redirectToLogin();
  };

  return (
    <>
      {isLoggedIn ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[#78716c] hover:text-[#0c0a09]"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="h-4 w-4" />
          退出
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[#78716c] hover:text-[#0c0a09]"
          onClick={() => void handleLogin()}
        >
          <LogIn className="h-4 w-4" />
          登录
        </Button>
      )}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
            <AlertDialogDescription>
              退出后需要重新登录才能继续使用操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleLogout()}>
              退出登录
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const Layout: React.FC = () => {
  const { appName } = useAppInfo();
  const { identity } = useIdentity();
  const { departments, currentDepartment, setCurrentDepartment, loading } =
    useDepartment();
  const userInfo = useCurrentUserProfile();
  const { pathname } = useLocation();
  const isAdmin = identity?.role !== "employee";
  const navItems: NavItem[] =
    identity?.role === "employee" ? EMPLOYEE_NAV_ITEMS : ADMIN_NAV_ITEMS;

  return (
    <div className="flex min-h-screen flex-col bg-stone-canvas">
      <header className="sticky top-0 z-50 border-b border-[#e8e6e5] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0c0a09] text-white">
                <Flame className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-[#0c0a09]">
                {appName || "智能排班系统"}
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item: NavItem) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }: { isActive: boolean }): string =>
                    cn(
                      "rounded-full px-3 py-1.5 text-sm font-normal transition-colors",
                      isActive
                        ? "text-[#0c0a09]"
                        : "text-[#78716c] hover:text-[#0c0a09]",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Select
                value={currentDepartment}
                onValueChange={setCurrentDepartment}
                disabled={loading || departments.length === 0}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="选择部门" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.code} value={dept.code}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="hidden items-center md:flex">
              <Avatar
                className="h-6 w-6 border-2 border-white"
                title={CURRENT_USER_AVATAR.name}
              >
                <AvatarImage
                  src={userInfo.avatar}
                  alt={userInfo.name || CURRENT_USER_AVATAR.name}
                />
                <AvatarFallback className="text-[10px]">
                  {userInfo.name ? userInfo.name.slice(0, 1) : CURRENT_USER_AVATAR.fallback}
                </AvatarFallback>
              </Avatar>
            </div>
            <TopNavUser />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
