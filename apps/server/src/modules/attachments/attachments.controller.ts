import { BadRequestException, Controller, Param, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { AntivirusService } from '../../shared/security/antivirus.service';
import { OfficeValidatorService } from '../../shared/security/office-validator.service';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('tables/:tableId/attachments')
export class AttachmentsController {
  constructor(private prisma: PrismaService, private antivirus: AntivirusService, private officeValidator: OfficeValidatorService) {}

  @ApiOperation({ summary: '上传附件（校验配额并持久化）' })
  @ApiOkResponse({ description: '上传成功返回附件记录' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'tableId', description: '表ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'EDITOR')
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, file: any, cb: any) => {
          const base = String(process.env.ATTACHMENTS_DIR || path.join(process.cwd(), 'attachments'));
          const tableId = req.params.tableId;
          const dir = path.join(base, tableId);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname);
          const name = path.basename(file.originalname, ext);
          const now = new Date().toISOString().replace(/[:.]/g, '-');
          cb(null, `${name}-${now}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 单附件≤20MB
    })
  )
  async upload(@Param('tableId') tableId: string, @Req() req: any) {
    const file = req.file as any;
    if (!file) throw new BadRequestException('缺少文件字段：file');

    // Office 文档格式严格校验
    const v = this.officeValidator.validateOffice(file.path, file.originalname, file.mimetype);
    if (!v.pass) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      await this.prisma.auditLog.create({
        data: {
          userId: req.user?.userId,
          action: 'ATTACHMENT_FORMAT_BLOCK',
          scope: 'ATTACHMENT',
          targetId: null,
          detail: {
            tableId,
            filename: file.originalname,
            size: Number(file.size || 0),
            mime: file.mimetype,
            validator: v,
          } as any,
          traceId: req.headers?.['x-trace-id'] as any,
        },
      });
      throw new BadRequestException('仅允许上传 Office 文档（Word/Excel/PowerPoint）');
    }

    // 总容量≤50GB
    const totalSize = await this.prisma.attachment.aggregate({ _sum: { size: true } });
    const limitBytes = 50 * 1024 * 1024 * 1024;
    const currentTotal = Number(totalSize._sum.size || 0);
    if (currentTotal + Number(file.size || 0) > limitBytes) {
      // 删除已保存的物理文件以避免泄漏
      try { fs.unlinkSync(file.path); } catch (_) {}
      throw new BadRequestException('总附件容量超限（≥50GB）');
    }

    // 防病毒扫描
    const scan = await this.antivirus.scanFile(file.path);
    if (!scan.clean) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      // 审计阻断
      await this.prisma.auditLog.create({
        data: {
          userId: req.user?.userId,
          action: 'ATTACHMENT_SCAN_BLOCK',
          scope: 'ATTACHMENT',
          targetId: null,
          detail: {
            tableId,
            filename: file.originalname,
            size: Number(file.size || 0),
            mime: file.mimetype,
            scan,
          } as any,
          traceId: req.headers?.['x-trace-id'] as any,
        },
      });
      throw new BadRequestException('文件可能包含恶意内容，已阻止上传');
    }

    // 记录到数据库（标记为已扫描）
    const att = await this.prisma.attachment.create({
      data: {
        tableId,
        recordId: null,
        filename: file.originalname,
        path: file.path,
        mime: file.mimetype,
        size: Number(file.size || 0),
        status: 0,
        scanned: true,
        scannedAt: new Date(),
      },
    });

    // 审计上传
    await this.prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'ATTACHMENT_UPLOAD',
        scope: 'ATTACHMENT',
        targetId: att.id,
        detail: {
          tableId,
          attachmentId: att.id,
          filename: att.filename,
          size: att.size,
          mime: att.mime,
          scan,
        } as any,
        traceId: req.headers?.['x-trace-id'] as any,
      },
    });

    return { id: att.id, filename: att.filename, size: att.size, mime: att.mime, scanned: att.scanned };
  }
}