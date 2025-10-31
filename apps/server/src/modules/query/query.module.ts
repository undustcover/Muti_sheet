import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QueryController } from './query.controller';
import { PermissionService } from '../../shared/policies/permission.service';
import { AnonymousRateLimitInterceptor } from '../../shared/interceptors/anonymous-rate-limit.interceptor';
import { QueryService } from './query.service';

@Module({
  imports: [PrismaModule],
  controllers: [QueryController],
  providers: [PermissionService, AnonymousRateLimitInterceptor, QueryService],
  exports: [QueryService, PermissionService],
})
export class QueryModule {}