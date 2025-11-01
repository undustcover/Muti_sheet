import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      const logger = new Logger('PrismaService');
      const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
      if (isProd) throw err;
      logger.error(`数据库连接失败（开发环境容忍启动）：${(err as any)?.message || err}`);
    }
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}