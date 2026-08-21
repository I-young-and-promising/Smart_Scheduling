import { extractApiErrorMessage } from "@client/src/utils/api-error";

/**
 * 从接口错误中提取可读的提示信息。
 */
export function getErrorMessage(error: unknown): string {
  return extractApiErrorMessage(error, "操作失败，请稍后重试");
}
