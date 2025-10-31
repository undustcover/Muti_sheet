import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportController } from './import.controller';
import { RolesGuard } from '../../shared/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ImportController],
  providers: [RolesGuard],
})
export class ImportModule {}