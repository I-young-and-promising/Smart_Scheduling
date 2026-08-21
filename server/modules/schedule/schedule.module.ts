import { Module } from "@nestjs/common";
import { BitableModule } from "@server/common/bitable";
import { EmployeeModule } from "@server/modules/employee/employee.module";
import { ShiftConfigModule } from "@server/modules/shift-config/shift-config.module";
import { ScheduleConflictBitableRepository } from "./conflict.bitable-repo";
import { ScheduleConflictDrizzleRepository } from "./conflict.drizzle-repo";
import { SCHEDULE_CONFLICT_REPOSITORY } from "./conflict.repository";
import { ScheduleController } from "./schedule.controller";
import { ScheduleResultBitableRepository } from "./schedule-result.bitable-repo";
import { ScheduleResultDrizzleRepository } from "./schedule-result.drizzle-repo";
import { SCHEDULE_RESULT_REPOSITORY } from "./schedule-result.repository";
import { ScheduleService } from "./schedule.service";
import { RuleConfigService } from "./rule-config.service";

@Module({
  imports: [BitableModule, EmployeeModule, ShiftConfigModule],
  controllers: [ScheduleController],
  providers: [
    ScheduleService,
    RuleConfigService,
    ScheduleResultDrizzleRepository,
    ScheduleResultBitableRepository,
    ScheduleConflictDrizzleRepository,
    ScheduleConflictBitableRepository,
    {
      provide: SCHEDULE_RESULT_REPOSITORY,
      useFactory: (
        drizzleRepository: ScheduleResultDrizzleRepository,
        bitableRepository: ScheduleResultBitableRepository,
      ) =>
        process.env.DATA_SOURCE_DRIVER === "postgres"
          ? drizzleRepository
          : bitableRepository,
      inject: [
        ScheduleResultDrizzleRepository,
        ScheduleResultBitableRepository,
      ],
    },
    {
      provide: SCHEDULE_CONFLICT_REPOSITORY,
      useFactory: (
        drizzleRepository: ScheduleConflictDrizzleRepository,
        bitableRepository: ScheduleConflictBitableRepository,
      ) =>
        process.env.DATA_SOURCE_DRIVER === "postgres"
          ? drizzleRepository
          : bitableRepository,
      inject: [
        ScheduleConflictDrizzleRepository,
        ScheduleConflictBitableRepository,
      ],
    },
  ],
  exports: [ScheduleService],
})
export class ScheduleModule {}
