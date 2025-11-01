import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TasksController } from './tasks.controller';
import { RolesGuard } from '../../shared/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [RolesGuard],
})
export class TasksModule {}