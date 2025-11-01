import { Body, Controller, Patch, Post, Req, UseGuards, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: '创建项目（支持设置匿名只读开关）' })
  @ApiBody({ type: CreateProjectDto })
  @ApiOkResponse({ description: '创建成功返回项目实体' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @Post()
  async create(@Body() dto: CreateProjectDto, @Req() req: any) {
    const ownerId = req.user?.userId;
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        ownerId,
        isAnonymousReadEnabled: dto.isAnonymousReadEnabled ?? false,
      },
    });
    return project;
  }

  @ApiOperation({ summary: '更新项目（名称/匿名只读开关）' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiOkResponse({ description: '更新成功返回项目实体' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @Patch(':projectId')
  async update(@Body() dto: UpdateProjectDto, @Req() req: any) {
    // 仅项目拥有者或管理员可更新；RolesGuard 已强制角色，额外限制可在此扩展
    const projectId = req.params.projectId as string;
    return this.prisma.project.update({ where: { id: projectId }, data: dto });
  }

  @ApiOperation({ summary: '删除项目（递归清理其任务、表、视图等）' })
  @ApiOkResponse({ description: '删除成功返回项目ID' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @Delete(':projectId')
  async remove(@Req() req: any) {
    const projectId = req.params.projectId as string;
    await this.prisma.$transaction(async (tx) => {
      // 找到项目下任务
      const tasks = await tx.task.findMany({ where: { projectId }, select: { id: true } });
      const taskIds = tasks.map((t) => t.id);
      // 找到任务下的表
      const tables = await tx.table.findMany({ where: { taskId: { in: taskIds } }, select: { id: true } });
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
        // 删除记录及数据
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
      if (taskIds.length) {
        await tx.task.deleteMany({ where: { id: { in: taskIds } } });
      }
      // 删除项目
      await tx.project.delete({ where: { id: projectId } });
    });
    return { id: projectId };
  }
}