import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { DslCacheService } from '../../shared/cache/dsl-cache.service';

@ApiTags('internal')
@ApiBearerAuth()
@Controller('internal')
export class InternalController {
  @ApiOperation({ summary: '缓存命中率与配额指标' })
  @ApiOkResponse({ description: '返回 DSL 缓存服务的命中率与配额统计' })
  @UseGuards(OptionalJwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @Get('cache/metrics')
  metrics() {
    const cache = DslCacheService.getInstance();
    return cache.metrics();
  }
}