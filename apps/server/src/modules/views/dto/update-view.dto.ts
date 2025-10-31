import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';
import { ViewConfigDto } from './view-config.dto';

export class UpdateViewDto {
  @ApiPropertyOptional({ description: '视图名称', example: '重命名视图' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '视图配置（列可见性/排序/分组/聚合等）' })
  @IsOptional()
  @IsObject()
  config?: ViewConfigDto;
}