import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client: PrismaClient | null = null;

  get prisma(): PrismaClient {
    if (!this.client) {
      this.client = new PrismaClient();
    }
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    try {
      const client = new PrismaClient();
      await client.$connect();
      this.client = client;
      this.logger.log('Prisma conectado');
    } catch {
      this.logger.warn(
        'Prisma no disponible (usa Store en memoria). Ejecuta en la raíz del proyecto: npx prisma generate',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.$disconnect();
      this.client = null;
    }
  }
}
