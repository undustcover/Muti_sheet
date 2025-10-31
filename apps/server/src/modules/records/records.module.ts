import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecordsController } from './records.controller';
import { PermissionService } from '../../shared/policies/permission.service';
import { AnonymousRateLimitInterceptor } from '../../shared/interceptors/anonymous-rate-limit.interceptor';
import { AnonymousCacheInterceptor } from '../../shared/interceptors/anonymous-cache.interceptor';
import { RecordDataFormatInterceptor } from './interceptors/record-data-format.interceptor';

@Module({
  imports: [PrismaModule],
  controllers: [RecordsController],
  providers: [PermissionService, AnonymousRateLimitInterceptor, AnonymousCacheInterceptor, RecordDataFormatInterceptor],
})
export class RecordsModule {}