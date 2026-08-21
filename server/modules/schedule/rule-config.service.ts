import { Inject, Injectable } from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { eq } from "drizzle-orm";
import type { RuleConfig, RuleItem } from "@shared/api.interface";
import { scheduleSetting } from "@server/database/schema";
import { DEFAULT_RULE_CONFIG, DEFAULT_RULE_ITEMS } from "./schedule-compliance";

@Injectable()
export class RuleConfigService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async load(): Promise<RuleConfig> {
    const rows = await this.db
      .select()
      .from(scheduleSetting)
      .where(eq(scheduleSetting.key, "schedule_rules"));
    if (rows.length === 0) {
      return DEFAULT_RULE_CONFIG;
    }
    try {
      const parsed = JSON.parse(rows[0].value) as Partial<RuleConfig>;
      return this.mergeWithDefault(parsed);
    } catch {
      return DEFAULT_RULE_CONFIG;
    }
  }

  async save(config: RuleConfig): Promise<void> {
    const existing: RuleConfig = await this.load();
    const merged: RuleConfig = this.mergeConfigs(config, existing);
    await this.db
      .insert(scheduleSetting)
      .values({
        key: "schedule_rules",
        value: JSON.stringify(merged),
        description: "排班规则引擎全局配置",
      })
      .onConflictDoUpdate({
        target: [scheduleSetting.key],
        set: {
          value: JSON.stringify(merged),
          description: "排班规则引擎全局配置",
        },
      });
  }

  private mergeConfigs(
    incoming: Partial<RuleConfig>,
    existing: RuleConfig,
  ): RuleConfig {
    const merged: RuleConfig = { ...existing };

    // 仅当传入值显式非 undefined 时才覆盖，避免未传字段被清空或改回默认值
    for (const key of Object.keys(incoming) as Array<keyof RuleConfig>) {
      const value: unknown = incoming[key];
      if (value !== undefined) {
        (merged as Record<keyof RuleConfig, unknown>)[key] = value;
      }
    }

    // transitionMatrix 与 rules 作为整体处理：未传则保留 existing
    merged.transitionMatrix =
      incoming.transitionMatrix ?? existing.transitionMatrix;

    const incomingRules: RuleItem[] | undefined = incoming.rules;
    if (incomingRules !== undefined) {
      const incomingByCode: Map<string, RuleItem> = new Map(
        incomingRules.map((rule: RuleItem): [string, RuleItem] => [rule.code, rule]),
      );
      merged.rules = DEFAULT_RULE_ITEMS.map((rule: RuleItem): RuleItem => {
        const incomingRule: RuleItem | undefined = incomingByCode.get(rule.code);
        if (incomingRule) {
          return { ...rule, ...incomingRule };
        }
        if (rule.code === "R-P-03") {
          return { ...rule, enabled: merged.seniorJuniorMixEnabled ?? rule.enabled };
        }
        if (rule.code === "R-P-04") {
          return { ...rule, enabled: merged.supervisorCoverageEnabled ?? rule.enabled };
        }
        if (rule.code === "R-P-06") {
          return { ...rule, enabled: merged.supervisorNoNightEnabled ?? rule.enabled };
        }
        if (rule.code === "R-P-07") {
          return { ...rule, enabled: merged.mentorSyncEnabled ?? rule.enabled };
        }
        if (rule.code === "R-P-08") {
          return { ...rule, enabled: merged.efficiencyMixEnabled ?? rule.enabled };
        }
        if (rule.code === "R-S-16") {
          return { ...rule, enabled: merged.weeklyDoubleRestEnabled ?? rule.enabled };
        }
        if (rule.code === "R-S-17") {
          return { ...rule, enabled: merged.workdayDistributionEnabled ?? rule.enabled };
        }
        if (rule.code === "R-S-18") {
          return { ...rule, enabled: merged.workBalanceEnabled ?? rule.enabled };
        }
        return rule;
      });
    }

    return merged;
  }

  private mergeWithDefault(config: Partial<RuleConfig>): RuleConfig {
    return this.mergeConfigs(config, DEFAULT_RULE_CONFIG);
  }
}
