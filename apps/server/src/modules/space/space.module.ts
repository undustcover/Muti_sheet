import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SpaceController } from './space.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SpaceController],
})
export class SpaceModule {}