import { INestApplication, Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(_app: INestApplication) {
    // Prisma's shutdown event typing has changed across versions.
    // For this starter scaffold, connecting on module init is enough.
    // You can reintroduce a stricter shutdown hook later if needed.
  }
}
