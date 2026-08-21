import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import SchedulePage from './pages/Schedule/SchedulePage';
import ScheduleMatrixPage from './pages/Schedule/ScheduleMatrixPage';
import EmployeesPage from './pages/Employees/EmployeesPage';
import ShiftConfigsPage from './pages/ShiftConfigs/ShiftConfigsPage';
import LeaveRequestsPage from './pages/LeaveRequests/LeaveRequestsPage';
import HolidaysPage from './pages/Holidays/HolidaysPage';
import MySchedulePage from './pages/MySchedule/MySchedulePage';
import NotFound from './pages/NotFound/NotFound';
import { useIdentity } from './hooks/useIdentity';
import { DepartmentProvider } from './contexts/DepartmentContext';

const RoleLoading: React.FC = () => (
  <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
    正在加载…
  </div>
);

/** 首页路由：员工直达我的班表，管理员进入排班工作台 */
const IndexRoute: React.FC = () => {
  const { identity, loading } = useIdentity();
  if (loading) return <RoleLoading />;
  if (identity?.role === 'employee') {
    return <Navigate to="/my-schedule" replace />;
  }
  return <SchedulePage />;
};

/** 管理端路由守卫：员工角色重定向到我的班表 */
const AdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { identity, loading } = useIdentity();
  if (loading) return <RoleLoading />;
  if (identity?.role === 'employee') {
    return <Navigate to="/my-schedule" replace />;
  }
  return <>{children}</>;
};

const RoutesComponent = () => {
  return (
    <DepartmentProvider>
      <Routes>
        <Route element={<Layout />}>
        <Route index element={<IndexRoute />} />
        <Route path="my-schedule" element={<MySchedulePage />} />
        <Route
          path="schedule/matrix"
          element={
            <AdminOnly>
              <ScheduleMatrixPage />
            </AdminOnly>
          }
        />
        <Route
          path="employees"
          element={
            <AdminOnly>
              <EmployeesPage />
            </AdminOnly>
          }
        />
        <Route
          path="shift-configs"
          element={
            <AdminOnly>
              <ShiftConfigsPage />
            </AdminOnly>
          }
        />
        <Route
          path="holidays"
          element={
            <AdminOnly>
              <HolidaysPage />
            </AdminOnly>
          }
        />
        <Route path="leave-requests" element={<LeaveRequestsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </DepartmentProvider>
  );
};

export default RoutesComponent;
