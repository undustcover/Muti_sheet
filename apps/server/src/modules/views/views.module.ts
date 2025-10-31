import { Module } from '@nestjs/common';
import { ViewsController } from './views.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ViewAccessGuard } from '../../shared/guards/view-access.guard';
import { AnonymousRateLimitInterceptor } from '../../shared/interceptors/anonymous-rate-limit.interceptor';
import { AnonymousCacheInterceptor } from '../../shared/interceptors/anonymous-cache.interceptor';

@Module({
  imports: [PrismaModule],
  controllers: [ViewsController],
  providers: [ViewAccessGuard, AnonymousRateLimitInterceptor, AnonymousCacheInterceptor],
})
export class ViewsModule {}