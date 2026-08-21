import { Controller, Get, Req } from "@nestjs/common";
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import type { Request } from "express";
import type { CurrentIdentity } from "@shared/api.interface";
import { IdentityService } from "./identity.service";

@Controller("api/me")
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  /** GET /api/me：当前登录用户的角色身份（前端路由/导航鉴权依据） */
  @NeedLogin()
  @Get()
  async me(@Req() req: Request): Promise<CurrentIdentity> {
    const identity: CurrentIdentity = await this.identityService.resolve(
      req.userContext?.userId,
      req.userContext?.userName,
    );
    if (!identity.name) {
      identity.name = req.userContext?.userName ?? "";
    }
    return identity;
  }
}
