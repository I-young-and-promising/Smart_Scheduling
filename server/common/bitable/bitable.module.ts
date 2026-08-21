import { Module } from "@nestjs/common";
import { CapabilityModule } from "@lark-apaas/fullstack-nestjs-core";
import { BitableClient } from "./bitable-client";

@Module({
  imports: [CapabilityModule],
  providers: [BitableClient],
  exports: [BitableClient],
})
export class BitableModule {}
