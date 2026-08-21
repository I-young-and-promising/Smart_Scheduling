import { Logger } from "@nestjs/common";
import type { BitableClient, BitableFilter, BitableRecord, BitableSearchResponse } from "./bitable-client";

export interface UpsertPlan<T> {
  toCreate: T[];
  toUpdate: Array<{ id: string; entity: T }>;
  toDelete: string[];
}

export abstract class BitableRepository<T> {
  protected readonly logger = new Logger(this.constructor.name);

  protected abstract readonly pluginInstanceId: string;

  constructor(protected readonly client: BitableClient) {}

  protected abstract toBitableRecord(entity: Partial<T>): Record<string, unknown>;

  protected abstract fromBitableRecord(raw: BitableRecord): T;

  protected abstract getBusinessKey(entity: T): string;

  async search(filter?: BitableFilter, pageSize = 500): Promise<BitableSearchResponse> {
    const input: Record<string, unknown> = { pageSize };
    if (filter) {
      input.filter = filter;
    }
    return this.client.call<BitableSearchResponse>(
      this.pluginInstanceId,
      "searchRecords",
      input,
    );
  }

  async listAll(filter?: BitableFilter): Promise<T[]> {
    const items: T[] = [];
    let pageToken: string | undefined;
    do {
      const input: Record<string, unknown> = { pageSize: 500 };
      if (filter) {
        input.filter = filter;
      }
      if (pageToken) {
        input.pageToken = pageToken;
      }
      const response: BitableSearchResponse =
        await this.client.call<BitableSearchResponse>(
          this.pluginInstanceId,
          "searchRecords",
          input,
        );
      for (const record of response.records ?? []) {
        items.push(this.fromBitableRecord(record));
      }
      pageToken = response.pageToken;
    } while (pageToken);
    return items;
  }

  async findById(recordId: string): Promise<T | null> {
    try {
      const response = await this.client.call<{ id: string; record: Record<string, unknown> }>(
        this.pluginInstanceId,
        "getRecord",
        { recordID: recordId },
      );
      if (!response?.record) {
        return null;
      }
      return this.fromBitableRecord({ id: response.id, record: response.record });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("not exist") || message.includes("不存在")) {
        return null;
      }
      throw error;
    }
  }

  async batchCreate(entities: T[]): Promise<{ id: string }[]> {
    if (entities.length === 0) return [];
    const response = await this.client.call<{ records: Array<{ id: string }> }>(
      this.pluginInstanceId,
      "batchAddRecords",
      {
        records: entities.map((entity: T) => ({
          record: this.toBitableRecord(entity),
        })),
      },
    );
    return response.records ?? [];
  }

  async batchUpdate(updates: Array<{ id: string; entity: T }>): Promise<void> {
    if (updates.length === 0) return;
    await this.client.call<{ records: Array<{ id: string }> }>(
      this.pluginInstanceId,
      "batchUpdateRecords",
      {
        records: updates.map(({ id, entity }) => ({
          id,
          record: this.toBitableRecord(entity),
        })),
      },
    );
  }

  async batchDelete(recordIds: string[]): Promise<void> {
    if (recordIds.length === 0) return;
    await this.client.call<{ success: boolean }>(
      this.pluginInstanceId,
      "deleteRecords",
      { recordIDs: recordIds },
    );
  }

  async upsertByBusinessKey(
    entities: T[],
    keySelector: (entity: T) => string = (entity: T) => this.getBusinessKey(entity),
  ): Promise<void> {
    if (entities.length === 0) return;

    const existing = await this.listAll();
    const existingByKey: Map<string, { id: string; entity: T }> = new Map();
    for (const item of existing) {
      const key: string = keySelector(item);
      const recordId = (item as Record<string, unknown>).recordId as string | undefined;
      if (recordId) {
        existingByKey.set(key, { id: recordId, entity: item });
      }
    }

    const toCreate: T[] = [];
    const toUpdate: Array<{ id: string; entity: T }> = [];
    for (const entity of entities) {
      const key: string = keySelector(entity);
      const found = existingByKey.get(key);
      if (found) {
        toUpdate.push({ id: found.id, entity });
      } else {
        toCreate.push(entity);
      }
    }

    for (let i = 0; i < toCreate.length; i += 500) {
      const chunk: T[] = toCreate.slice(i, i + 500);
      await this.batchCreate(chunk);
      if (toCreate.length > 500) {
        await sleep(100);
      }
    }

    for (let i = 0; i < toUpdate.length; i += 500) {
      const chunk: Array<{ id: string; entity: T }> = toUpdate.slice(i, i + 500);
      await this.batchUpdate(chunk);
      if (toUpdate.length > 500) {
        await sleep(100);
      }
    }
  }

  async batchUpsert(
    entities: T[],
    options?: { chunkSize?: number; keySelector?: (entity: T) => string },
  ): Promise<void> {
    const chunkSize: number = options?.chunkSize ?? 500;
    for (let i = 0; i < entities.length; i += chunkSize) {
      const chunk: T[] = entities.slice(i, i + chunkSize);
      await this.upsertByBusinessKey(chunk, options?.keySelector);
      if (entities.length > chunkSize) {
        await sleep(100);
      }
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function textField(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  return value;
}

export function textValue(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && "text" in raw) {
    return (raw as { text?: string }).text;
  }
  return String(raw);
}

export function numberField(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  return value;
}

export function numberValue(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

export function booleanField(value: boolean | null | undefined): boolean | undefined {
  if (value === null || value === undefined) return undefined;
  return value;
}

export function booleanValue(raw: unknown): boolean | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    return raw === "true";
  }
  return undefined;
}

export function singleSelectField(value: string | null | undefined): string | undefined {
  return textField(value);
}

export function singleSelectValue(raw: unknown): string | undefined {
  return textValue(raw);
}

export function multiSelectField(value: string[] | null | undefined): string[] | undefined {
  if (value === null || value === undefined) return undefined;
  return value;
}

export function multiSelectValue(raw: unknown): string[] | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (Array.isArray(raw)) {
    return raw.map((item: unknown) => (typeof item === "string" ? item : String(item)));
  }
  return undefined;
}

export function dateField(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  return new Date(value).getTime();
}

export function dateValue(raw: unknown): string | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "number") {
    const d = new Date(raw);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  if (typeof raw === "string") {
    return raw.slice(0, 10);
  }
  return undefined;
}
