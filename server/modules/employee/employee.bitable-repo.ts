import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  BitableClient,
  BitableRecord,
  BitableRepository,
  booleanField,
  booleanValue,
  dateField,
  dateValue,
  multiSelectField,
  multiSelectValue,
  numberField,
  numberValue,
  singleSelectField,
  singleSelectValue,
  textField,
  textValue,
} from "@server/common/bitable";
import type {
  CreateEmployeeResponse,
  Employee,
  EmployeeFixedLeave,
  EmployeePreference,
  EmployeeStatus,
  FixedLeavePriority,
  SaveEmployeeRequest,
  UpdateEmployeeResponse,
  UserRole,
} from "@shared/api.interface";

@Injectable()
export class EmployeeBitableRepository extends BitableRepository<Employee> {
  protected readonly pluginInstanceId: string =
    "feishu_multitable_crud_agg_analysis_1";

  constructor(client: BitableClient) {
    super(client);
  }

  async list(department?: string): Promise<Employee[]> {
    const all = await this.listAll();
    if (!department) return all;
    return all.filter((item: Employee) => item.department === department);
  }

  async findByEmployeeNo(employeeNo: string): Promise<Employee | null> {
    if (!employeeNo) {
      return null;
    }
    const response = await this.search({
      conditions: [
        { fieldName: "员工UID", operator: "is", value: [employeeNo] },
      ],
    });
    const record = response.records[0];
    if (!record) {
      return null;
    }
    return this.fromBitableRecord(record);
  }

  async findByEmployeeNoInDepartment(
    employeeNo: string,
    department: string,
  ): Promise<Employee | null> {
    if (!employeeNo || !department) {
      return null;
    }
    const found = await this.findByEmployeeNo(employeeNo);
    if (!found || found.department !== department) return null;
    return found;
  }

  async create(data: SaveEmployeeRequest): Promise<CreateEmployeeResponse> {
    const entity: Employee = this.toEmployee(data);
    const created = await this.batchCreate([entity]);
    if (created.length === 0) {
      throw new InternalServerErrorException("创建员工失败");
    }
    return { id: created[0].id };
  }

  async update(
    id: string,
    data: SaveEmployeeRequest,
  ): Promise<UpdateEmployeeResponse> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException("员工不存在");
    }
    const updated: Employee = {
      ...existing,
      ...data,
      shiftPreferences: this.preferenceToShiftPreferences(data.preference),
    };
    await this.batchUpdate([{ id, entity: updated }]);
    return { success: true };
  }

  async delete(id: string): Promise<void> {
    await this.batchDelete([id]);
  }

  protected toBitableRecord(entity: Partial<Employee>): Record<string, unknown> {
    const record: Record<string, unknown> = {};

    this.setIfDefined(record, "员工UID", textField(entity.uid));
    this.setIfDefined(record, "员工姓名", textField(entity.name));
    this.setIfDefined(
      record,
      "所属部门",
      singleSelectField(this.departmentCodeToName(entity.department)),
    );
    this.setIfDefined(
      record,
      "员工状态",
      singleSelectField(this.statusCodeToName(entity.status)),
    );
    this.setIfDefined(record, "入职时间", dateField(entity.hireDate));
    this.setIfDefined(
      record,
      "角色标签",
      multiSelectField(this.roleTagsCodeToName(entity.roleTags)),
    );
    this.setIfDefined(
      record,
      "能力等级标签",
      multiSelectField(this.abilityTagsCodeToName(entity.abilityTags)),
    );
    this.setIfDefined(
      record,
      "技能标签",
      multiSelectField(this.skillTagsCodeToName(entity.skillTags)),
    );
    this.setIfDefined(
      record,
      "效率标签",
      singleSelectField(this.efficiencyTagCodeToName(entity.efficiencyTag)),
    );
    this.setIfDefined(record, "带教老师", multiSelectField(entity.mentorNos));
    this.setIfDefined(
      record,
      "班次偏好",
      multiSelectField(this.preferenceToShiftPreferences(entity.preference)),
    );
    this.setIfDefined(
      record,
      "班次权限",
      multiSelectField(this.allowedShiftsCodeToName(entity.allowedShifts)),
    );
    this.setIfDefined(
      record,
      "日均标准处理量",
      numberField(entity.dailyStandardWorkload),
    );
    this.setIfDefined(
      record,
      "产能等级",
      singleSelectField(this.capacityLevelCodeToName(entity.capacityLevel)),
    );
    this.setIfDefined(record, "产能系数", textField(entity.capacityRatio));
    this.setIfDefined(record, "欠工时天数", numberField(entity.owedDays));
    this.setIfDefined(record, "富余工时天数", numberField(entity.surplusDays));
    this.setIfDefined(
      record,
      "是否单独排班",
      booleanField(entity.isIndividualScheduling),
    );
    this.setIfDefined(
      record,
      "固定周期休假",
      textField(JSON.stringify(entity.fixedLeaves ?? [])),
    );

    return record;
  }

  protected fromBitableRecord(raw: BitableRecord): Employee {
    const fields: Record<string, unknown> = raw.record;
    const roleTags: string[] = multiSelectValue(fields["角色标签"]) ?? [];

    return {
      id: raw.id,
      name: textValue(fields["员工姓名"]) ?? "",
      employeeNo:
        this.parseEmployeeNo(fields["员工UID"]) ||
        textValue(fields["备注"]) ||
        "",
      department: this.departmentNameToCode(
        singleSelectValue(fields["所属部门"]),
      ),
      status: this.statusNameToCode(singleSelectValue(fields["员工状态"])),
      hireDate: dateValue(fields["入职时间"]),
      roleTags: this.roleTagsNameToCode(roleTags),
      abilityTags: this.abilityTagsNameToCode(
        multiSelectValue(fields["能力等级标签"]) ?? [],
      ),
      skillTags: this.skillTagsNameToCode(
        multiSelectValue(fields["技能标签"]) ?? [],
      ),
      efficiencyTag: this.efficiencyTagNameToCode(
        singleSelectValue(fields["效率标签"]),
      ),
      mentorNos: this.parseMentorNos(fields["带教老师"]) ?? [],
      shiftPreferences: this.shiftPreferencesNameToCode(
        multiSelectValue(fields["班次偏好"]) ?? [],
      ),
      allowedShifts: this.allowedShiftsNameToCode(
        multiSelectValue(fields["班次权限"]) ?? [],
      ),
      dailyStandardWorkload: numberValue(fields["日均标准处理量"]),
      capacityLevel: this.capacityLevelNameToCode(
        singleSelectValue(fields["产能等级"]),
      ),
      capacityRatio:
        numberValue(fields["产能系数"])?.toString() ??
        textValue(fields["产能系数"]),
      owedDays: numberValue(fields["欠工时天数"]),
      surplusDays: numberValue(fields["富余工时天数"]),
      isIndividualScheduling: booleanValue(fields["是否单独排班"]) ?? false,
      fixedLeaves: this.parseFixedLeaves(fields["固定周期休假"]),
      uid: textValue(fields["员工UID"]) || "",
      platform: "",
      preference: this.parsePreference(fields["班次偏好"]),
      role: roleTags.join(","),
      userRole: "employee",
    };
  }

  protected getBusinessKey(entity: Employee): string {
    return entity.employeeNo;
  }

  private setIfDefined(
    record: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== undefined) {
      record[key] = value;
    }
  }

  private toEmployee(data: SaveEmployeeRequest): Employee {
    return {
      id: "",
      name: data.name,
      employeeNo: data.employeeNo,
      uid: data.uid,
      platform: data.platform,
      preference: data.preference,
      role: data.role,
      userRole: data.userRole,
      department: data.department,
      status: data.status,
      hireDate: data.hireDate,
      roleTags: data.roleTags ?? [],
      abilityTags: [],
      skillTags: [],
      efficiencyTag: undefined,
      mentorNos: [],
      shiftPreferences: this.preferenceToShiftPreferences(data.preference),
      allowedShifts: [],
      dailyStandardWorkload: undefined,
      capacityLevel: undefined,
      capacityRatio: undefined,
      owedDays: undefined,
      surplusDays: undefined,
      isIndividualScheduling: false,
      fixedLeaves: data.fixedLeaves ?? [],
    };
  }

  private parseMentorNos(raw: unknown): string[] | undefined {
    const multi: string[] | undefined = multiSelectValue(raw);
    if (multi) {
      return multi;
    }
    const text: string | undefined = textValue(raw);
    if (!text) {
      return undefined;
    }
    return text
      .split(/[,，、;；]/u)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }

  private parsePreference(raw: unknown): EmployeePreference {
    const tags: string[] = multiSelectValue(raw) ?? [];
    if (tags.includes("偏好早班")) {
      return "prefer_day";
    }
    if (tags.includes("偏好晚班")) {
      return "prefer_night";
    }
    return "none";
  }



  private parseEmployeeNo(raw: unknown): string | undefined {
    if (raw === null || raw === undefined) return undefined;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      if (typeof first === "string") return first;
      if (typeof first === "object" && first !== null && "text" in first) {
        return (first as { text?: string }).text;
      }
    }
    if (typeof raw === "object" && "text" in (raw as object)) {
      return (raw as { text?: string }).text;
    }
    return String(raw);
  }

  private parseFixedLeaves(raw: unknown): EmployeeFixedLeave[] {
    const text = textValue(raw);
    if (!text) return [];
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (item: unknown): item is { weekDay?: unknown; priority?: unknown; enabled?: unknown } =>
              item !== null && typeof item === "object",
          )
          .map(
            (item): EmployeeFixedLeave => ({
              id: "",
              employeeId: "",
              weekDay: Number(item.weekDay) || 0,
              priority: (item.priority as FixedLeavePriority) ?? "hard",
              enabled: item.enabled !== false,
            }),
          );
      }
    } catch {
      // ignore invalid JSON
    }
    return [];
  }

  private preferenceToShiftPreferences(
    preference: EmployeePreference | undefined,
  ): string[] {
    if (preference === "prefer_day") {
      return ["偏好早班"];
    }
    if (preference === "prefer_night") {
      return ["偏好晚班"];
    }
    return [];
  }

  private shiftPreferencesNameToCode(tags: string[]): string[] {
    const map: Record<string, string> = {
      偏好早班: "prefer_day",
      偏好晚班: "prefer_night",
    };
    return tags.map((tag: string) => map[tag] ?? tag);
  }

  private roleTagsCodeToName(tags: string[] | undefined): string[] | undefined {
    if (!tags) return undefined;
    const map: Record<string, string> = {
      supervisor: "主管",
      mentor: "带教老师",
      newcomer: "新员工",
      flexible: "机动岗",
    };
    return tags.map((tag: string) => map[tag] ?? tag);
  }

  private roleTagsNameToCode(tags: string[]): string[] {
    const map: Record<string, string> = {
      主管: "supervisor",
      带教老师: "mentor",
      新员工: "newcomer",
      机动岗: "flexible",
    };
    return tags.map((tag: string) => map[tag] ?? tag);
  }

  private abilityTagsCodeToName(
    tags: string[] | undefined,
  ): string[] | undefined {
    if (!tags) return undefined;
    const map: Record<string, string> = {
      veteran: "老员工",
      transferred: "转岗",
      level_1: "一级",
      level_2: "二级",
      level_3: "三级",
    };
    return tags.map((tag: string) => map[tag] ?? tag);
  }

  private abilityTagsNameToCode(tags: string[]): string[] {
    const map: Record<string, string> = {
      老员工: "veteran",
      转岗: "transferred",
      一级: "level_1",
      二级: "level_2",
      三级: "level_3",
    };
    return tags.map((tag: string) => map[tag] ?? tag);
  }

  private skillTagsCodeToName(
    tags: string[] | undefined,
  ): string[] | undefined {
    if (!tags) return undefined;
    const map: Record<string, string> = {
      all_round: "全能岗",
      basic: "基础岗",
      specialist: "专项岗",
    };
    return tags.map((tag: string) => map[tag] ?? tag);
  }

  private skillTagsNameToCode(tags: string[]): string[] {
    const map: Record<string, string> = {
      全能岗: "all_round",
      基础岗: "basic",
      专项岗: "specialist",
    };
    return tags.map((tag: string) => map[tag] ?? tag);
  }

  private efficiencyTagCodeToName(
    code: string | undefined,
  ): string | undefined {
    if (!code) return undefined;
    const map: Record<string, string> = {
      high: "高效率",
      medium: "中效率",
      low: "低效率",
    };
    return map[code] ?? code;
  }

  private efficiencyTagNameToCode(
    name: string | undefined,
  ): string | undefined {
    if (!name) return undefined;
    const map: Record<string, string> = {
      高效率: "high",
      中效率: "medium",
      低效率: "low",
    };
    return map[name] ?? name;
  }

  private allowedShiftsCodeToName(
    tags: string[] | undefined,
  ): string[] | undefined {
    if (!tags) return undefined;
    const map: Record<string, string> = {
      day: "可排 A 班",
      middle: "可排 B 班",
      night: "可排 C 班",
      rest: "不可排 D 班",
    };
    return tags.map((tag: string) => map[tag] ?? tag);
  }

  private allowedShiftsNameToCode(tags: string[]): string[] {
    const map: Record<string, string> = {
      "可排 A 班": "day",
      "可排 B 班": "middle",
      "可排 C 班": "night",
      "不可排 D 班": "rest",
    };
    return tags.map((tag: string) => map[tag] ?? tag);
  }

  private capacityLevelCodeToName(
    code: string | undefined,
  ): string | undefined {
    if (!code) return undefined;
    const map: Record<string, string> = {
      S: "S",
      A: "A",
      B: "B",
      improving: "待提升",
    };
    return map[code] ?? code;
  }

  private capacityLevelNameToCode(
    name: string | undefined,
  ): string | undefined {
    if (!name) return undefined;
    const map: Record<string, string> = {
      S: "S",
      A: "A",
      B: "B",
      待提升: "improving",
    };
    return map[name] ?? name;
  }

  private departmentCodeToName(code: string | undefined): string | undefined {
    if (!code) return undefined;
    const map: Record<string, string> = {
      cs1: "客服 1 部",
      cs2: "客服 2 部",
      change: "改签部",
      ticket: "出票部",
      refund: "退票部",
    };
    return map[code] ?? code;
  }

  private departmentNameToCode(name: string | undefined): string {
    if (!name) return "";
    const map: Record<string, string> = {
      "客服 1 部": "cs1",
      "客服 2 部": "cs2",
      改签部: "change",
      出票部: "ticket",
      退票部: "refund",
    };
    return map[name] ?? name;
  }

  private statusCodeToName(code: string | undefined): string | undefined {
    if (!code) return undefined;
    const map: Record<string, string> = {
      active: "在岗",
      probation: "试用期",
      leave: "休假中",
      resigned: "离职",
    };
    return map[code] ?? code;
  }

  private statusNameToCode(name: string | undefined): EmployeeStatus {
    if (!name) return "active";
    const map: Record<string, EmployeeStatus> = {
      在岗: "active",
      试用期: "probation",
      休假中: "leave",
      离职: "resigned",
    };
    return map[name] ?? (name as EmployeeStatus);
  }
}
