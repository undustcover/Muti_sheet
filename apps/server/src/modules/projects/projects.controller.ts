import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
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
}