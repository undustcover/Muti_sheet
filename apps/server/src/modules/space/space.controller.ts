import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('space')
@ApiBearerAuth()
@Controller('space')
export class SpaceController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: '我的空间：项目/任务/表层级（任务占位）' })
  @ApiOkResponse({ description: '返回当前用户拥有的项目及其下数据表（任务为空占位）' })
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async mySpace(@Req() req: any) {
    const ownerId = req.user?.userId as string;
    const projects = await this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: { tables: { orderBy: { updatedAt: 'desc' } } },
    });
    return {
      projects: projects.map((p) => ({
        project: { id: p.id, name: p.name },
        tasks: [],
        tables: p.tables.map((t) => ({ id: t.id, name: t.name, projectId: t.projectId })),
      })),
    };
  }

  @ApiOperation({ summary: '项目空间：公共视图表（匿名只读开关）' })
  @ApiOkResponse({ description: '返回允许匿名只读的项目及其允许匿名的表' })
  @UseGuards(JwtAuthGuard)
  @Get('project')
  async projectSpace() {
    const projects = await this.prisma.project.findMany({
      where: { isAnonymousReadEnabled: true },
      orderBy: { createdAt: 'desc' },
      include: { tables: { where: { isAnonymousReadEnabled: true }, orderBy: { updatedAt: 'desc' } } },
    });
    return {
      projects: projects.map((p) => ({
        project: { id: p.id, name: p.name },
        tasks: [],
        tables: p.tables.map((t) => ({ id: t.id, name: t.name, projectId: t.projectId })),
      })),
    };
  }
}