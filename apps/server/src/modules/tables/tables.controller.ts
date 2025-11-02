import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, ForbiddenException, UseInterceptors, BadRequestException, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { AnonymousRateLimitInterceptor } from '../../shared/interceptors/anonymous-rate-limit.interceptor';
import { AnonymousCacheInterceptor } from '../../shared/interceptors/anonymous-cache.interceptor';

@ApiTags('tables')
@ApiBearerAuth()
@Controller('projects/:projectId/tables')
export class TablesController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: '创建表' })
  @ApiBody({ type: CreateTableDto })
  @ApiOkResponse({ description: '创建成功返回表实体' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @Post()
  async create(@Param('projectId') projectId: string, @Body() dto: CreateTableDto, @Req() req: any) {
    if (dto.taskId) {
      const task = await this.prisma.task.findUnique({ where: { id: dto.taskId }, select: { projectId: true } });
      if (!task) throw new BadRequestException('任务不存在');
      if (task.projectId !== projectId) throw new ForbiddenException('任务不属于该项目');
    }
    // 在事务中创建表与默认字段（序号/文本/时间）
    const result = await this.prisma.$transaction(async (tx) => {
      const table = await tx.table.create({
        data: {
          name: dto.name,
          projectId,
          taskId: dto.taskId,
          isAnonymousReadEnabled: dto.isAnonymousReadEnabled ?? false,
          creatorId: req.user?.userId,
        },
      });
      // 默认字段：序号(NUMBER)、文本(TEXT)、时间(DATE)
      await tx.field.create({ data: { tableId: table.id, name: '序号', type: 'NUMBER', order: 1 } });
      await tx.field.create({ data: { tableId: table.id, name: '文本', type: 'TEXT', order: 2 } });
      await tx.field.create({ data: { tableId: table.id, name: '时间', type: 'DATE', order: 3 } });
      return table;
    });
    return result;
  }

  @ApiOperation({ summary: '列出表（只读，支持匿名）' })
  @ApiOkResponse({ description: '表列表' })
  @UseGuards(/* 只读列表匿名允许 */ OptionalJwtAuthGuard)
  @UseInterceptors(AnonymousRateLimitInterceptor, AnonymousCacheInterceptor)
  @Get()
  async list(@Param('projectId') projectId: string, @Req() req: any) {
    const role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined = req.user?.role;
    const anonymous = !role;
    if (anonymous) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { isAnonymousReadEnabled: true } });
      if (!project?.isAnonymousReadEnabled) {
        throw new ForbiddenException('Anonymous read disabled for this project');
      }
    }
    const where: any = { projectId, ...(anonymous ? { isAnonymousReadEnabled: true } : {}) };
    return this.prisma.table.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  @ApiOperation({ summary: '更新表属性（名称/匿名只读开关）' })
  @ApiBody({ type: UpdateTableDto })
  @ApiOkResponse({ description: '更新成功返回表实体' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EDITOR', 'ADMIN', 'OWNER')
  @Patch('/:tableId')
  async update(@Param('tableId') tableId: string, @Body() dto: UpdateTableDto) {
    return this.prisma.table.update({ where: { id: tableId }, data: dto });
  }

  @ApiOperation({ summary: '删除表（需登录；管理员/拥有者或创建者）' })
  @ApiOkResponse({ description: '删除成功返回表ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'EDITOR', 'VIEWER')
  @Delete('/:tableId')
  async remove(@Param('tableId') tableId: string, @Req() req: any) {
    const role = req.user?.role as 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined;
    const userId = req.user?.userId as string | undefined;
    const table = await this.prisma.table.findUnique({ where: { id: tableId }, select: { creatorId: true } });
    if (!table) throw new BadRequestException('数据表不存在');
    const isPrivileged = role === 'ADMIN' || role === 'OWNER';
    const isCreator = !!userId && table.creatorId === userId;
    if (!isPrivileged && !isCreator) {
      throw new ForbiddenException('你没有权限删除其他人的表格');
    }
    await this.prisma.$transaction(async (tx) => {
      try {
        const views = await tx.view.findMany({ where: { tableId }, select: { id: true } });
        const viewIds = views.map((v) => v.id);
        if (viewIds.length) {
          await tx.viewShare.deleteMany({ where: { viewId: { in: viewIds } } });
          await tx.view.deleteMany({ where: { id: { in: viewIds } } });
        }
      } catch (e) {
        console.error('TablesController.remove delete views error:', { tableId, error: e });
        throw e;
      }
      try {
        const records = await tx.record.findMany({ where: { tableId }, select: { id: true } });
        const recordIds = records.map((r) => r.id);
        if (recordIds.length) {
          await tx.recordsData.deleteMany({ where: { recordId: { in: recordIds } } });
          await tx.attachment.deleteMany({ where: { recordId: { in: recordIds } } });
          await tx.record.deleteMany({ where: { id: { in: recordIds } } });
        }
      } catch (e) {
        console.error('TablesController.remove delete records error:', { tableId, error: e });
        throw e;
      }
      try {
        await tx.field.deleteMany({ where: { tableId } });
      } catch (e) {
        console.error('TablesController.remove delete fields error:', { tableId, error: e });
        throw e;
      }
      try {
        await tx.attachment.deleteMany({ where: { tableId } });
      } catch (e) {
        console.error('TablesController.remove delete table attachments error:', { tableId, error: e });
        throw e;
      }
      try {
        await tx.table.delete({ where: { id: tableId } });
      } catch (e) {
        console.error('TablesController.remove delete table error:', { tableId, error: e });
        throw e;
      }
    });
    return { id: tableId };
  }
}