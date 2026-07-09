import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AiController } from "./ai/ai.controller";
import { AuthController } from "./auth/auth.controller";
import { PaymentsController } from "./payments/payments.controller";
import { SyncController } from "./sync/sync.controller";

@Module({
  controllers: [
    AppController,
    AiController,
    AuthController,
    PaymentsController,
    SyncController,
  ],
})
export class AppModule {}
