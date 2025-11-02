import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Req, ForbiddenException, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { PermissionService } from '../../shared/policies/permission.service';
import { AnonymousRateLimitInterceptor } from '../../shared/interceptors/anonymous-rate-limit.interceptor';
import { AnonymousCacheInterceptor } from '../../shared/interceptors/anonymous-cache.interceptor';

@ApiTags('fields')
@ApiBearerAuth()
@Controller('tables/:tableId/fields')
export class FieldsController {
  constructor(private prisma: PrismaService, private permissionService: PermissionService) {}

  @ApiOperation({ summary: '新增字段' })
  @ApiBody({ type: CreateFieldDto })
  @ApiOkResponse({ description: '创建成功返回字段实体' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'EDITOR')
  @Post()
  async create(@Param('tableId') tableId: string, @Body() dto: CreateFieldDto) {
    // 仅映射 Prisma 支持的属性，忽略 DTO 中未持久化字段（如 visible、description）
    const data: any = {
      tableId,
      name: dto.name,
      type: dto.type,
      order: dto.order ?? 1,
    };
    if (dto.permissionJson) data.permissionJson = dto.permissionJson as any;
    // 将 options/format/formula 合并进 config JSON
    const config: any = {};
    if (dto.options) config.options = dto.options;
    if (dto.format) config.format = dto.format;
    if (dto.formula) config.formula = dto.formula;
    if (Object.keys(config).length > 0) data.config = config;
    const field = await this.prisma.field.create({ data });
    return field;
  }

  @ApiOperation({ summary: '列出字段（只读，支持匿名；匿名按表开关与字段权限过滤）' })
  @ApiOkResponse({ description: '字段列表' })
  @UseGuards(/* 只读列表匿名允许 */ OptionalJwtAuthGuard)
  @UseInterceptors(AnonymousRateLimitInterceptor, AnonymousCacheInterceptor)
  @Get()
  async list(@Param('tableId') tableId: string, @Req() req: any) {
    const role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined = req.user?.role;
    const anonymous = !role;

    if (anonymous) {
      const table = await this.prisma.table.findUnique({
        where: { id: tableId },
        select: { isAnonymousReadEnabled: true, project: { select: { isAnonymousReadEnabled: true } } },
      });
      if (!table?.project?.isAnonymousReadEnabled) {
        throw new ForbiddenException('Anonymous read disabled for this project');
      }
      if (!table?.isAnonymousReadEnabled) {
        throw new ForbiddenException('Anonymous read disabled for this table');
      }
    }

    const fields = await this.prisma.field.findMany({ where: { tableId }, orderBy: { createdAt: 'asc' } });
    const effectiveRole = (role ?? 'VIEWER') as 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    const visibleFields = fields.filter((f: any) => {
      const perm = this.permissionService.resolveFieldPermission(effectiveRole, f.permissionJson);
      return perm.visible;
    });
    if (anonymous) {
      // 匿名模式最小化字段返回（隐藏描述/类型/配置等细节）
      return visibleFields.map((f: any) => ({ id: f.id, name: f.name, visible: f.visible !== false, order: f.order }));
    }
    return visibleFields;
  }

  @ApiOperation({ summary: '更新字段（名称/类型/描述/可见性/顺序/权限）' })
  @ApiBody({ type: UpdateFieldDto })
  @ApiOkResponse({ description: '更新成功返回字段实体' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'EDITOR')
  @Patch('/:fieldId')
  async update(@Param('fieldId') fieldId: string, @Body() dto: UpdateFieldDto) {
    // 拆分 DTO：基本字段直接更新，options/format/formula 归入 config
    const { options, format, formula, ...rest } = dto as any;
    const existing = await this.prisma.field.findUnique({ where: { id: fieldId } });
    const nextConfig: any = { ...(existing?.config ?? {}) };
    if (options !== undefined) nextConfig.options = options;
    if (format !== undefined) nextConfig.format = format;
    if (formula !== undefined) nextConfig.formula = formula;
    const data: any = { ...rest };
    // 仅当有配置键时写入 config，避免清空
    if (Object.keys(nextConfig).length > 0) data.config = nextConfig;
    return this.prisma.field.update({ where: { id: fieldId }, data });
  }

  @ApiOperation({ summary: '删除字段' })
  @ApiOkResponse({ description: '删除成功返回删除的字段实体' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'EDITOR')
  @Delete('/:fieldId')
  async remove(@Param('fieldId') fieldId: string) {
    return this.prisma.field.delete({ where: { id: fieldId } });
  }
}