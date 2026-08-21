import { Module } from "@nestjs/common";
import { BitableModule } from "@server/common/bitable";
import { DepartmentModule } from "@server/modules/department/department.module";
import { ShiftConfigController } from "./shift-config.controller";
import { ShiftConfigService } from "./shift-config.service";
import { ShiftConfigBitableRepository } from "./shift-config.bitable-repo";
import { ShiftConfigDrizzleRepository } from "./shift-config.drizzle-repo";
import {
  SHIFT_CONFIG_REPOSITORY,
  type ShiftConfigRepository,
} from "./shift-config.repository";

@Module({
  imports: [BitableModule, DepartmentModule],
  controllers: [ShiftConfigController],
  providers: [
    ShiftConfigService,
    ShiftConfigDrizzleRepository,
    ShiftConfigBitableRepository,
    {
      provide: SHIFT_CONFIG_REPOSITORY,
      useFactory: (
        drizzleRepository: ShiftConfigDrizzleRepository,
        bitableRepository: ShiftConfigBitableRepository,
      ): ShiftConfigRepository =>
        process.env.DATA_SOURCE_DRIVER === "postgres"
          ? drizzleRepository
          : bitableRepository,
      inject: [ShiftConfigDrizzleRepository, ShiftConfigBitableRepository],
    },
  ],
  exports: [ShiftConfigService],
})
export class ShiftConfigModule {}
