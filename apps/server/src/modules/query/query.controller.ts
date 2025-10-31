import { Body, Controller, ForbiddenException, Param, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AnonymousRateLimitInterceptor } from '../../shared/interceptors/anonymous-rate-limit.interceptor';
import { AnonymousBodyCacheInterceptor } from '../../shared/interceptors/anonymous-body-cache.interceptor';
import { PermissionService } from '../../shared/policies/permission.service';
import { QueryRequestDto } from './dto/query-request.dto';
import { FieldType } from '../fields/dto/create-field.dto';
import { Prisma } from '@prisma/client';
import { toPinyinKey } from '../../shared/utils/pinyin';
import { QueryService } from './query.service';

@ApiTags('query')
@ApiBearerAuth()
@Controller('tables/:tableId/query')
export class QueryController {
  constructor(private prisma: PrismaService, private permissionService: PermissionService, private queryService: QueryService) {}

  @ApiOperation({ summary: 'DSL 查询（过滤/排序/分组/聚合，支持匿名）' })
  @ApiOkResponse({ description: '查询结果' })
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(AnonymousRateLimitInterceptor, AnonymousBodyCacheInterceptor)
  @Post()
  async query(@Param('tableId') tableId: string, @Body() dto: QueryRequestDto, @Req() req: any) {
    const result = await this.queryService.execute(tableId, dto, req);
    const { total, page, pageSize, items, groups } = result;
    return { total, page, pageSize, items, groups };
  }
}