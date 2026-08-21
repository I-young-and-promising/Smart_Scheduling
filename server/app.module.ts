import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { BitableModule } from './common/bitable';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { DepartmentModule } from './modules/department/department.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { IdentityModule } from './modules/identity/identity.module';
import { LeaveRequestModule } from './modules/leave-request/leave-request.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { ShiftConfigModule } from './modules/shift-config/shift-config.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // 飞书多维表通用客户端
    BitableModule,
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    IdentityModule,
    DepartmentModule,
    EmployeeModule,
    ShiftConfigModule,
    LeaveRequestModule,
    ScheduleModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
