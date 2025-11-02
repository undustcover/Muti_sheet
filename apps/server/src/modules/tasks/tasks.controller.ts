import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: '创建任务' })
  @ApiBody({ type: CreateTaskDto })
  @ApiOkResponse({ description: '创建成功返回任务实体' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Param('projectId') projectId: string, @Body() dto: CreateTaskDto, @Req() req: any) {
    const role = req.user?.role as 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined;
    const userId = req.user?.userId as string | undefined;
    const proj = await this.prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
    const isAdmin = role === 'ADMIN';
    const isOwner = !!userId && proj?.ownerId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Only ADMIN or project owner can create task');
    }
    const task = await this.prisma.task.create({ data: { name: dto.name, description: dto.description, projectId } });
    return task;
  }

  @ApiOperation({ summary: '列出项目下任务（需登录）' })
  @ApiOkResponse({ description: '任务列表' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Param('projectId') projectId: string) {
    return this.prisma.task.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
  }

  @ApiOperation({ summary: '更新任务（名称/描述）' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiOkResponse({ description: '更新成功返回任务实体' })
  @UseGuards(JwtAuthGuard)
  @Patch('/:taskId')
  async update(@Param('taskId') taskId: string, @Body() dto: UpdateTaskDto, @Req() req: any) {
    const role = req.user?.role as 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined;
    const userId = req.user?.userId as string | undefined;
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
    if (!task) throw new ForbiddenException('Task not found');
    const proj = await this.prisma.project.findUnique({ where: { id: task.projectId }, select: { ownerId: true } });
    const isAdmin = role === 'ADMIN';
    const isOwner = !!userId && proj?.ownerId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Only ADMIN or project owner can update task');
    }
    return this.prisma.task.update({ where: { id: taskId }, data: dto });
  }

  @ApiOperation({ summary: '删除任务（同时删除其下所有数据表及相关数据）' })
  @ApiOkResponse({ description: '删除成功返回任务ID' })
  @UseGuards(JwtAuthGuard)
  @Delete('/:taskId')
  async remove(@Param('taskId') taskId: string, @Req() req: any) {
    const role = req.user?.role as 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined;
    const userId = req.user?.userId as string | undefined;
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
    if (!task) throw new ForbiddenException('Task not found');
    const proj = await this.prisma.project.findUnique({ where: { id: task.projectId }, select: { ownerId: true } });
    const isAdmin = role === 'ADMIN';
    const isOwner = !!userId && proj?.ownerId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Only ADMIN or project owner can delete task');
    }
    await this.prisma.$transaction(async (tx) => {
      // 找到任务下的所有表
      const tables = await tx.table.findMany({ where: { taskId }, select: { id: true } });
      const tableIds = tables.map((t) => t.id);
      if (tableIds.length) {
        // 删除视图及共享
        const views = await tx.view.findMany({ where: { tableId: { in: tableIds } }, select: { id: true } });
        const viewIds = views.map((v) => v.id);
        if (viewIds.length) {
          await tx.viewShare.deleteMany({ where: { viewId: { in: viewIds } } });
          await tx.view.deleteMany({ where: { id: { in: viewIds } } });
        }
        // 删除字段
        await tx.field.deleteMany({ where: { tableId: { in: tableIds } } });
        // 删除记录及数据与附件
        const records = await tx.record.findMany({ where: { tableId: { in: tableIds } }, select: { id: true } });
        const recordIds = records.map((r) => r.id);
        if (recordIds.length) {
          await tx.recordsData.deleteMany({ where: { recordId: { in: recordIds } } });
          await tx.attachment.deleteMany({ where: { recordId: { in: recordIds } } });
          await tx.record.deleteMany({ where: { id: { in: recordIds } } });
        }
        // 表级附件
        await tx.attachment.deleteMany({ where: { tableId: { in: tableIds } } });
        // 删除表
        await tx.table.deleteMany({ where: { id: { in: tableIds } } });
      }
      // 删除任务
      await tx.task.delete({ where: { id: taskId } });
    });
    return { id: taskId };
  }
}