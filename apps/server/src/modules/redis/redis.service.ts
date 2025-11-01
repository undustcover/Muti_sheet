import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  async onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const logger = new Logger('RedisService');
    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';

    // 使用 lazyConnect，避免在构造函数中立即抛错
    this.client = new Redis(url, { lazyConnect: true });

    // 统一错误日志而不影响开发环境启动
    this.client.on('error', (err) => {
      if (isProd) return; // 生产环境交由监控/重启策略处理
      logger.error(`Redis连接失败（开发环境容忍启动）：${(err as any)?.message || err}`);
    });

    try {
      await this.client.connect();
    } catch (err) {
      if (isProd) throw err;
      logger.error(`Redis初始化连接失败（开发环境容忍启动）：${(err as any)?.message || err}`);
    }
  }

  getClient() {
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }
}