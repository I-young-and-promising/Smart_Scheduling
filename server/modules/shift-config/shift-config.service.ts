import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateShiftConfigRequest,
  ShiftConfig,
  ShiftConfigListResponse,
  UpdateShiftConfigRequest,
  UpdateShiftConfigResponse,
} from "@shared/api.interface";
import { DepartmentService } from "@server/modules/department/department.service";
import {
  SHIFT_CONFIG_REPOSITORY,
  type ShiftConfigRepository,
} from "./shift-config.repository";

const TIME_PATTERN: RegExp = /^([01]\d|2[0-3]):[0-5]\d$/u;

@Injectable()
export class ShiftConfigService {
  private readonly logger: Logger = new Logger(ShiftConfigService.name);

  constructor(
    @Inject(SHIFT_CONFIG_REPOSITORY)
    private readonly repository: ShiftConfigRepository,
    private readonly departmentService: DepartmentService,
  ) {}

  async list(department?: string): Promise<ShiftConfigListResponse> {
    const items: ShiftConfig[] = await this.repository.list(department);
    const normalized: ShiftConfig[] = await Promise.all(
      items.map(async (item: ShiftConfig): Promise<ShiftConfig> => ({
        ...item,
        department: await this.normalizeDepartmentCode(item.department ?? ""),
      })),
    );
    return { items: normalized };
  }

  async create(data: CreateShiftConfigRequest): Promise<ShiftConfig> {
    this.validateTimes(data.startTime, data.endTime);
    this.validateCounts(
      data.minCount,
      data.maxCount,
      data.holidayMinCount,
      data.holidayMaxCount,
    );

    const departmentName: string =
      await this.resolveDepartmentName(data.department);
    const existing = await this.repository.findByDepartmentAndCode(
      departmentName,
      data.code,
    );
    if (existing) {
      throw new ConflictException(
        `部门 ${data.department} 中已存在班次 ${data.code}`,
      );
    }

    const payload: CreateShiftConfigRequest = {
      ...data,
      department: departmentName,
    };
    const created = await this.repository.create(payload);
    this.logger.log(
      `班次配置已创建: department=${created.department} code=${created.code}`,
    );
    return {
      ...created,
      department: await this.normalizeDepartmentCode(created.department ?? ""),
    };
  }

  async update(
    id: string,
    data: UpdateShiftConfigRequest,
  ): Promise<UpdateShiftConfigResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("班次不存在");
    }

    if (existing.code === "rest") {
      throw new BadRequestException("休班班次不可编辑");
    }

    if (data.startTime !== undefined || data.endTime !== undefined) {
      this.validateTimes(
        data.startTime ?? existing.startTime,
        data.endTime ?? existing.endTime,
      );
    }

    this.validateCounts(
      data.minCount ?? existing.minCount,
      data.maxCount ?? existing.maxCount,
      data.holidayMinCount ?? existing.holidayMinCount,
      data.holidayMaxCount ?? existing.holidayMaxCount,
    );

    const result = await this.repository.update(id, data);
    this.logger.log(`班次配置已更新: id=${id}`);
    return result;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException("班次不存在");
    }
    if (existing.code === "rest") {
      throw new BadRequestException("休班班次不可删除");
    }

    await this.repository.delete(id);
    this.logger.log(`班次配置已删除: id=${id}`);
  }

  private async resolveDepartmentName(codeOrName: string): Promise<string> {
    const dept = await this.departmentService.findByCode(codeOrName);
    return dept?.name ?? codeOrName;
  }

  private async normalizeDepartmentCode(codeOrName: string): Promise<string> {
    const list = await this.departmentService.list();
    const dept = list.items.find(
      (item: { name: string; code: string }): boolean =>
        item.name === codeOrName,
    );
    return dept?.code ?? codeOrName;
  }

  private validateTimes(startTime: string, endTime: string): void {
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      throw new BadRequestException("时间格式需为 HH:mm");
    }
  }

  private validateCounts(
    minCount: number | null | undefined,
    maxCount: number | null | undefined,
    holidayMinCount: number | null | undefined,
    holidayMaxCount: number | null | undefined,
  ): void {
    const check = (
      min: number | null | undefined,
      max: number | null | undefined,
      label: string,
    ): void => {
      if (
        (min !== null && min !== undefined && (!Number.isInteger(min) || min < 0)) ||
        (max !== null && max !== undefined && (!Number.isInteger(max) || max < 0)) ||
        (min !== null && min !== undefined && max !== null && max !== undefined && min > max)
      ) {
        throw new BadRequestException(`${label}下限不能大于上限且需为非负整数`);
      }
    };

    check(minCount, maxCount, "人数");
    check(holidayMinCount, holidayMaxCount, "节假日人数");
  }
}
