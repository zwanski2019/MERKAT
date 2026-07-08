import { Controller, Get } from "@nestjs/common";
import { PRODUCT_NAME } from "@merkat/core";

@Controller()
export class AppController {
  @Get("health")
  health(): { status: string; product: string } {
    return { status: "ok", product: PRODUCT_NAME };
  }
}
