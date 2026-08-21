import { axiosForBackend } from "@lark-apaas/client-toolkit/utils/getAxiosForBackend";
import type { CurrentIdentity } from "@shared/api.interface";

export async function getCurrentIdentity(): Promise<CurrentIdentity> {
  const response = await axiosForBackend.get<CurrentIdentity>("/api/me");
  return response.data;
}
