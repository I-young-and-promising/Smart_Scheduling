import { useEffect, useState } from "react";
import { getCurrentIdentity } from "@client/src/api/identity";
import type { CurrentIdentity } from "@shared/api.interface";

interface IdentityState {
  identity: CurrentIdentity | null;
  loading: boolean;
}

/** 未登录/获取失败时的兜底身份：按最小权限展示员工端（接口层自行返回 401） */
const GUEST_IDENTITY: CurrentIdentity = {
  userId: "",
  role: "employee",
  employeeId: null,
  name: "",
};

let identityPromise: Promise<CurrentIdentity> | null = null;

function fetchIdentity(): Promise<CurrentIdentity> {
  if (!identityPromise) {
    identityPromise = getCurrentIdentity().catch(
      (): CurrentIdentity => GUEST_IDENTITY,
    );
  }
  return identityPromise;
}

/** 当前登录用户角色（admin/employee），模块级缓存避免重复请求 */
export function useIdentity(): IdentityState {
  const [state, setState] = useState<IdentityState>({
    identity: null,
    loading: true,
  });

  useEffect(() => {
    let active: boolean = true;
    void fetchIdentity().then((identity: CurrentIdentity) => {
      if (active) {
        setState({ identity, loading: false });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
