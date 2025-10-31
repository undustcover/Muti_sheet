import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { PermissionService } from '../../shared/policies/permission.service';
import { AnonymousRateLimitInterceptor } from '../../shared/interceptors/anonymous-rate-limit.interceptor';
import { AnonymousCacheInterceptor } from '../../shared/interceptors/anonymous-cache.interceptor';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { QueryRecordsDto } from './dto/query-records.dto';
import { BatchRecordsDto } from './dto/batch-records.dto';
import { RecordDataFormatInterceptor } from './interceptors/record-data-format.interceptor';

@ApiTags('records')
@ApiBearerAuth()
@Controller()
export class RecordsController {
  constructor(private prisma: PrismaService, private permissionService: PermissionService) {}

  @ApiOperation({ summary: '新增记录' })
  @ApiBody({ type: CreateRecordDto })
  @ApiOkResponse({ description: '创建成功返回记录及数据' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'EDITOR')
  @UseInterceptors(RecordDataFormatInterceptor)
  @Post('tables/:tableId/records')
  async create(@Param('tableId') tableId: string, @Body() dto: CreateRecordDto) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.record.create({ data: { tableId } });
      const data = dto.data || {};
      const fields = await tx.field.findMany({ where: { tableId }, select: { id: true, type: true } });
      const fieldMap = new Map(fields.map((f) => [f.id, f.type]));
      const rows = Object.entries(data)
        .filter(([fid]) => fieldMap.has(fid))
        .map(([fid, val]) => {
          const type = fieldMap.get(fid)!;
          const payload: any = { recordId: record.id, fieldId: fid };
          switch (type) {
            case 'TEXT': payload.valueText = String(val ?? ''); break;
            case 'NUMBER': payload.valueNumber = val === null || val === undefined ? null : Number(val); break;
            case 'DATE': payload.valueDate = val ? new Date(val) : null; break;
            default: payload.valueJson = val ?? null; break;
          }
          return payload;
        });
      if (rows.length) await tx.recordsData.createMany({ data: rows });
      return { record };
    });
  }

  @ApiOperation({ summary: '查询记录（分页、基本过滤，支持匿名）' })
  @ApiOkResponse({ description: '记录列表' })
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(AnonymousRateLimitInterceptor, AnonymousCacheInterceptor)
  @Get('tables/:tableId/records')
  async list(@Param('tableId') tableId: string, @Query() query: QueryRecordsDto, @Req() req: any) {
    const role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined = req.user?.role;
    const anonymous = !role;
    if (anonymous) {
      const table = await this.prisma.table.findUnique({
        where: { id: tableId },
        select: { isAnonymousReadEnabled: true, project: { select: { isAnonymousReadEnabled: true } } },
      });
      if (!table?.project?.isAnonymousReadEnabled) throw new ForbiddenException('Anonymous read disabled for this project');
      if (!table?.isAnonymousReadEnabled) throw new ForbiddenException('Anonymous read disabled for this table');
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const fields = await this.prisma.field.findMany({ where: { tableId }, orderBy: { order: 'asc' } });
    const effectiveRole = (role ?? 'VIEWER') as 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    const visibleFieldIds = fields
      .filter((f: any) => {
        const perm = this.permissionService.resolveFieldPermission(effectiveRole, f.permissionJson);
        return perm.visible;
      })
      .map((f) => f.id);

    const whereData: any = {};
    if (query.q) {
      whereData.data = {
        some: {
          fieldId: { in: visibleFieldIds },
          valueText: { contains: query.q, mode: 'insensitive' },
        },
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.record.count({ where: { tableId, ...(whereData || {}) } }),
      this.prisma.record.findMany({
        where: { tableId, ...(whereData || {}) },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { data: true },
      }),
    ]);

    const projectAnonymous = anonymous;
    const result = items.map((rec) => {
      const obj: any = { id: rec.id, createdAt: rec.createdAt };
      for (const d of rec.data) {
        if (!visibleFieldIds.includes(d.fieldId)) continue;
        const v = d.valueJson ?? d.valueText ?? d.valueNumber ?? d.valueDate ?? null;
        obj[d.fieldId] = projectAnonymous ? (typeof v === 'object' ? null : v) : v;
      }
      return obj;
    });

    return { total, page, pageSize, items: result };
  }

  @ApiOperation({ summary: '局部更新记录' })
  @ApiBody({ type: UpdateRecordDto })
  @ApiOkResponse({ description: '更新成功返回记录ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'EDITOR')
  @UseInterceptors(RecordDataFormatInterceptor)
  @Patch('records/:recordId')
  async update(@Param('recordId') recordId: string, @Body() dto: UpdateRecordDto) {
    return this.prisma.$transaction(async (tx) => {
      const rec = await tx.record.findUnique({ where: { id: recordId }, select: { tableId: true } });
      if (!rec) throw new ForbiddenException('Record not found');
      const fields = await tx.field.findMany({ where: { tableId: rec.tableId }, select: { id: true, type: true } });
      const fieldMap = new Map(fields.map((f) => [f.id, f.type]));
      const entries = Object.entries(dto.data || {}).filter(([fid]) => fieldMap.has(fid));
      for (const [fid, val] of entries) {
        const type = fieldMap.get(fid)!;
        const payload: any = { recordId, fieldId: fid };
        switch (type) {
          case 'TEXT': payload.valueText = String(val ?? ''); payload.valueJson = null; payload.valueNumber = null; payload.valueDate = null; break;
          case 'NUMBER': payload.valueNumber = val === null || val === undefined ? null : Number(val); payload.valueText = null; payload.valueJson = null; payload.valueDate = null; break;
          case 'DATE': payload.valueDate = val ? new Date(val) : null; payload.valueText = null; payload.valueJson = null; payload.valueNumber = null; break;
          default: payload.valueJson = val ?? null; payload.valueText = null; payload.valueNumber = null; payload.valueDate = null; break;
        }
        await tx.recordsData.upsert({
          where: { recordId_fieldId: { recordId, fieldId: fid } },
          create: payload,
          update: payload,
        });
      }
      return { id: recordId };
    });
  }

  @ApiOperation({ summary: '删除记录' })
  @ApiOkResponse({ description: '删除成功返回记录ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'EDITOR')
  @Delete('records/:recordId')
  async remove(@Param('recordId') recordId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.recordsData.deleteMany({ where: { recordId } });
      await tx.record.delete({ where: { id: recordId } });
      return { id: recordId };
    });
  }

  @ApiOperation({ summary: '批量新增/更新/删除（事务）' })
  @ApiBody({ type: BatchRecordsDto })
  @ApiOkResponse({ description: '批量操作结果' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'EDITOR')
  @UseInterceptors(RecordDataFormatInterceptor)
  @Post('tables/:tableId/records:batch')
  async batch(@Param('tableId') tableId: string, @Body() dto: BatchRecordsDto) {
    return this.prisma.$transaction(async (tx) => {
      const fields = await tx.field.findMany({ where: { tableId }, select: { id: true, type: true } });
      const fieldMap = new Map(fields.map((f) => [f.id, f.type]));
      const result = { created: [] as string[], updated: [] as string[], deleted: [] as string[] };

      // create
      for (const item of dto.create || []) {
        const rec = await tx.record.create({ data: { tableId } });
        const rows = Object.entries(item.data || {})
          .filter(([fid]) => fieldMap.has(fid))
          .map(([fid, val]) => {
            const type = fieldMap.get(fid)!;
            const payload: any = { recordId: rec.id, fieldId: fid };
            switch (type) {
              case 'TEXT': payload.valueText = String(val ?? ''); break;
              case 'NUMBER': payload.valueNumber = val === null || val === undefined ? null : Number(val); break;
              case 'DATE': payload.valueDate = val ? new Date(val) : null; break;
              default: payload.valueJson = val ?? null; break;
            }
            return payload;
          });
        if (rows.length) await tx.recordsData.createMany({ data: rows });
        result.created.push(rec.id);
      }

      // update
      for (const item of dto.update || []) {
        const recordId = item.recordId;
        const entries = Object.entries(item.data || {}).filter(([fid]) => fieldMap.has(fid));
        for (const [fid, val] of entries) {
          const type = fieldMap.get(fid)!;
          const payload: any = { recordId, fieldId: fid };
          switch (type) {
            case 'TEXT': payload.valueText = String(val ?? ''); payload.valueJson = null; payload.valueNumber = null; payload.valueDate = null; break;
            case 'NUMBER': payload.valueNumber = val === null || val === undefined ? null : Number(val); payload.valueText = null; payload.valueJson = null; payload.valueDate = null; break;
            case 'DATE': payload.valueDate = val ? new Date(val) : null; payload.valueText = null; payload.valueJson = null; payload.valueNumber = null; break;
            default: payload.valueJson = val ?? null; payload.valueText = null; payload.valueNumber = null; payload.valueDate = null; break;
          }
          await tx.recordsData.upsert({
            where: { recordId_fieldId: { recordId, fieldId: fid } },
            create: payload,
            update: payload,
          });
        }
        result.updated.push(recordId);
      }

      // delete
      if ((dto.delete || []).length) {
        await tx.recordsData.deleteMany({ where: { recordId: { in: dto.delete! } } });
        await tx.record.deleteMany({ where: { id: { in: dto.delete! } } });
        result.deleted.push(...dto.delete!);
      }

      return result;
    });
  }
}