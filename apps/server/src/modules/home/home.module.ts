import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HomeController } from './home.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HomeController],
})
export class HomeModule {}