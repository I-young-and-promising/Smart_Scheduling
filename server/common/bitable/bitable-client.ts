import { Injectable, Logger } from "@nestjs/common";
import { CapabilityService } from "@lark-apaas/fullstack-nestjs-core";

export interface BitableRecord {
  id: string;
  record: Record<string, unknown>;
}

export interface BitableSearchResponse {
  records: BitableRecord[];
  hasMore: boolean;
  pageToken?: string;
  total: number;
}

export interface BitableFilter {
  conjunction?: "and" | "or";
  conditions: Array<{
    fieldName: string;
    operator:
      | "is"
      | "isNot"
      | "contains"
      | "doesNotContain"
      | "isEmpty"
      | "isNotEmpty"
      | "isGreater"
      | "isGreaterEqual"
      | "isLess"
      | "isLessEqual";
    value?: string[];
  }>;
}

@Injectable()
export class BitableClient {
  private readonly logger = new Logger(BitableClient.name);

  constructor(private readonly capabilityService: CapabilityService) {}

  async call<T>(pluginInstanceId: string, action: string, input: unknown): Promise<T> {
    const startedAt: number = Date.now();
    try {
      const result = await this.capabilityService
        .load(pluginInstanceId)
        .call(action, input);
      this.logger.debug(
        `bitable call ${pluginInstanceId}/${action} cost=${Date.now() - startedAt}ms`,
      );
      return result as T;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `bitable call failed ${pluginInstanceId}/${action} message=${message}`,
      );
      throw error;
    }
  }
}
