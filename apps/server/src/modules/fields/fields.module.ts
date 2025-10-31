import { Module } from '@nestjs/common';
import { FieldsController } from './fields.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionService } from '../../shared/policies/permission.service';
import { AnonymousRateLimitInterceptor } from '../../shared/interceptors/anonymous-rate-limit.interceptor';
import { AnonymousCacheInterceptor } from '../../shared/interceptors/anonymous-cache.interceptor';

@Module({
  imports: [PrismaModule],
  controllers: [FieldsController],
  providers: [PermissionService, AnonymousRateLimitInterceptor, AnonymousCacheInterceptor],
})
export class FieldsModule {}