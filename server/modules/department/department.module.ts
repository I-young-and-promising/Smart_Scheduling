import { Module } from "@nestjs/common";
import { DepartmentController } from "./department.controller";
import { DepartmentService } from "./department.service";
import { DEPARTMENT_REPOSITORY } from "./department.repository";
import { DepartmentDrizzleRepository } from "./department.drizzle-repo";

@Module({
  controllers: [DepartmentController],
  providers: [
    DepartmentService,
    DepartmentDrizzleRepository,
    {
      provide: DEPARTMENT_REPOSITORY,
      useClass: DepartmentDrizzleRepository,
    },
  ],
  exports: [DepartmentService],
})
export class DepartmentModule {}
