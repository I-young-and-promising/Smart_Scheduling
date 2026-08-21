import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { listDepartments } from "@client/src/api/departments";
import type { Department } from "@shared/api.interface";
import { logger } from "@lark-apaas/client-toolkit/logger";

const STORAGE_KEY = "schedule-selected-department";
const DEFAULT_DEPARTMENT = "cs1";

interface DepartmentContextValue {
  departments: Department[];
  currentDepartment: string;
  setCurrentDepartment: (code: string) => void;
  loading: boolean;
}

const DepartmentContext = createContext<DepartmentContextValue | null>(null);

export const DepartmentProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentDepartment, setCurrentDepartment] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_DEPARTMENT,
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDepartments()
      .then((response) => {
        if (cancelled) return;
        setDepartments(response.items);
        const exists = response.items.some(
          (item: Department) => item.code === currentDepartment,
        );
        if (!exists && response.items.length > 0) {
          setCurrentDepartment(response.items[0].code);
        }
      })
      .catch((error: unknown) => {
        logger.error("加载部门列表失败", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSetDepartment = useCallback((code: string): void => {
    setCurrentDepartment(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const value = useMemo(
    (): DepartmentContextValue => ({
      departments,
      currentDepartment,
      setCurrentDepartment: handleSetDepartment,
      loading,
    }),
    [departments, currentDepartment, handleSetDepartment, loading],
  );

  return (
    <DepartmentContext.Provider value={value}>
      {children}
    </DepartmentContext.Provider>
  );
};

export function useDepartment(): DepartmentContextValue {
  const context = useContext(DepartmentContext);
  if (!context) {
    throw new Error("useDepartment must be used within DepartmentProvider");
  }
  return context;
}
