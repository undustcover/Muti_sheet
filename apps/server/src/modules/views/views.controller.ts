import { Controller, Get, Param, UseGuards, Req, ForbiddenException, UseInterceptors, Post, Patch, Body, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiExtraModels, ApiBody } from '@nestjs/swagger';
import { ViewConfigDto } from './dto/view-config.dto';
import { CreateViewDto } from './dto/create-view.dto';
import { UpdateViewDto } from './dto/update-view.dto';
import { PrismaService } from '../prisma/prisma.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ViewAccessGuard } from '../../shared/guards/view-access.guard';
import { AnonymousRateLimitInterceptor } from '../../shared/interceptors/anonymous-rate-limit.interceptor';
import { AnonymousCacheInterceptor } from '../../shared/interceptors/anonymous-cache.interceptor';

@ApiTags('views')
@ApiExtraModels(ViewConfigDto)
@ApiBearerAuth()
@Controller()
export class ViewsController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: '列出表的视图（只读，支持匿名；匿名受表开关限制）' })
  @ApiOkResponse({ description: '视图列表' })
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(AnonymousRateLimitInterceptor, AnonymousCacheInterceptor)
  @Get('tables/:tableId/views')
  async listByTable(@Param('tableId') tableId: string, @Req() req: any) {
    const anonymous = !req.user?.role;
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
    return this.prisma.view.findMany({ where: { tableId }, orderBy: { createdAt: 'desc' } });
  }

  @ApiOperation({ summary: '获取指定视图（套用访问守卫）' })
  @ApiOkResponse({ description: '视图详情' })
  @UseGuards(OptionalJwtAuthGuard, ViewAccessGuard)
  @Get('views/:viewId')
  async getOne(@Param('viewId') viewId: string) {
    return this.prisma.view.findUnique({ where: { id: viewId } });
  }

  @ApiOperation({ summary: '创建视图（需登录，编辑者及以上）' })
  @ApiBody({
    type: CreateViewDto,
    examples: {
      default: {
        summary: '创建视图示例',
        value: {
          name: '我的视图',
          config: {
            columnVisibility: { 'field-text': true, 'field-number': true },
            sorting: [
              { fieldId: 'field-text', dir: 'asc' },
              { fieldId: 'field-number', dir: 'desc' }
            ],
            groupBy: 'field-date',
            groupDateGranularity: 'month',
            aggregations: [{ type: 'count' }, { type: 'sum', fieldId: 'field-number' }],
            viewPriority: false,
            freezeCount: 1,
            rowHeight: 28,
            kanbanGroupFieldId: 'field-status',
            calendarFields: { startDateFieldId: 'start', endDateFieldId: 'end' },
            sharedRoles: ['VIEWER', 'EDITOR'],
            exportEnabled: false,
          },
        },
      },
    },
  })
  @ApiOkResponse({ description: '创建成功返回视图' })
  @UseGuards(OptionalJwtAuthGuard)
  @Post('tables/:tableId/views')
  async createView(
    @Param('tableId') tableId: string,
    @Req() req: any,
    @Body() dto: CreateViewDto,
  ) {
    const role = req.user?.role as string | undefined;
    if (!role || !['OWNER', 'ADMIN', 'EDITOR'].includes(role)) {
      throw new ForbiddenException('Insufficient permission to create view');
    }
    const name = (dto.name && String(dto.name).trim()) || '新视图';
    const baseCfg = (dto.config as any) ?? {};
    const cfg = { sharedRoles: [], exportEnabled: false, ...baseCfg };
    const view = await this.prisma.view.create({ data: { tableId, name, config: cfg } });
    return view;
  }

  @ApiOperation({ summary: '更新视图（需登录，编辑者及以上）' })
  @ApiBody({
    type: UpdateViewDto,
    examples: {
      enableExportForEditors: {
        summary: '开启导出并限制共享角色',
        value: {
          name: '报表视图',
          config: {
            sharedRoles: ['EDITOR', 'ADMIN'],
            exportEnabled: true,
            sorting: [{ fieldId: 'field-date', dir: 'desc' }],
            aggregations: [{ type: 'avg', fieldId: 'field-number' }],
          },
        },
      },
    },
  })
  @ApiOkResponse({ description: '更新成功返回视图' })
  @UseGuards(OptionalJwtAuthGuard, ViewAccessGuard)
  @Patch('views/:viewId')
  async updateView(
    @Param('viewId') viewId: string,
    @Req() req: any,
    @Body() dto: UpdateViewDto,
  ) {
    const role = req.user?.role as string | undefined;
    if (!role || !['OWNER', 'ADMIN', 'EDITOR'].includes(role)) {
      throw new ForbiddenException('Insufficient permission to update view');
    }
    const data: any = {};
    if (dto.name != null) data.name = String(dto.name);
    if (dto.config != null) data.config = dto.config as any;
    return this.prisma.view.update({ where: { id: viewId }, data });
  }

  @ApiOperation({ summary: '删除视图（需登录，编辑者及以上）' })
  @ApiOkResponse({ description: '删除成功返回视图ID' })
  @UseGuards(OptionalJwtAuthGuard, ViewAccessGuard)
  @Delete('views/:viewId')
  async removeView(
    @Param('viewId') viewId: string,
    @Req() req: any,
  ) {
    const role = req.user?.role as string | undefined;
    if (!role || !['OWNER', 'ADMIN', 'EDITOR'].includes(role)) {
      throw new ForbiddenException('Insufficient permission to delete view');
    }
    try {
      await this.prisma.viewShare.deleteMany({ where: { viewId } });
    } catch (e) {
      console.error('ViewsController.removeView deleteMany(viewShare) error:', { viewId, error: e });
      throw e;
    }
    try {
      await this.prisma.view.delete({ where: { id: viewId } });
    } catch (e) {
      console.error('ViewsController.removeView delete(view) error:', { viewId, error: e });
      throw e;
    }
    return { id: viewId };
  }
}