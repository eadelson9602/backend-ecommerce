import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client: import('@prisma/client').PrismaClient | null = null;

  get prisma(): import('@prisma/client').PrismaClient {
    if (!this.client) {
      try {
        const { PrismaClient } = require('@prisma/client');
        this.client = new PrismaClient();
      } catch {
        throw new Error(
          'Cliente Prisma no generado. Ejecuta en la raíz del proyecto: npx prisma generate',
        );
      }
    }
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    try {
      const { PrismaClient } = require('@prisma/client');
      this.client = new PrismaClient();
      await this.client.$connect();
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
