import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AttachmentsController } from './attachments.controller';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { AntivirusService } from '../../shared/security/antivirus.service';
import { OfficeValidatorService } from '../../shared/security/office-validator.service';

@Module({
  imports: [PrismaModule],
  controllers: [AttachmentsController],
  providers: [RolesGuard, AntivirusService, OfficeValidatorService],
})
export class AttachmentsModule {}