import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, ForbiddenException, UseInterceptors } from '@nestjs/common';
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
  async create(@Param('projectId') projectId: string, @Body() dto: CreateTableDto) {
    const table = await this.prisma.table.create({
      data: { name: dto.name, projectId, isAnonymousReadEnabled: dto.isAnonymousReadEnabled ?? false },
    });
    return table;
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
}