import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';
import { ViewConfigDto } from './view-config.dto';

export class CreateViewDto {
  @ApiPropertyOptional({ description: '视图名称', example: '我的视图' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '视图配置' })
  @IsOptional()
  @IsObject()
  config?: ViewConfigDto;
}