import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExportController } from './export.controller';
import { ViewAccessGuard } from '../../shared/guards/view-access.guard';
import { QueryModule } from '../query/query.module';

@Module({
  imports: [PrismaModule, QueryModule],
  controllers: [ExportController],
  providers: [ViewAccessGuard],
})
export class ExportModule {}