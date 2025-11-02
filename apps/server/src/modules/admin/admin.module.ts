import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { RolesGuard } from '../../shared/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [RolesGuard],
})
export class AdminModule {}