import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthController } from "./auth/auth.controller";
import { SyncController } from "./sync/sync.controller";

@Module({
  controllers: [AppController, AuthController, SyncController],
})
export class AppModule {}
