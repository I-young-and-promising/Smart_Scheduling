import { Module } from "@nestjs/common";
import { BitableModule } from "@server/common/bitable";
import { DepartmentModule } from "@server/modules/department/department.module";
import { EmployeeBitableRepository } from "./employee.bitable-repo";
import { EmployeeController } from "./employee.controller";
import { EmployeeDrizzleRepository } from "./employee.drizzle-repo";
import { EmployeeService } from "./employee.service";
import { EMPLOYEE_REPOSITORY } from "./employee.repository";

@Module({
  imports: [BitableModule, DepartmentModule],
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    EmployeeDrizzleRepository,
    EmployeeBitableRepository,
    {
      provide: EMPLOYEE_REPOSITORY,
      useFactory: (
        drizzleRepository: EmployeeDrizzleRepository,
        bitableRepository: EmployeeBitableRepository,
      ) =>
        process.env.DATA_SOURCE_DRIVER === "postgres"
          ? drizzleRepository
          : bitableRepository,
      inject: [EmployeeDrizzleRepository, EmployeeBitableRepository],
    },
  ],
  exports: [EmployeeService],
})
export class EmployeeModule {}
