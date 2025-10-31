import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTableDto {
  @ApiPropertyOptional({ example: '新的任务表名' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: true, description: '匿名只读开关' })
  @IsOptional()
  @IsBoolean()
  isAnonymousReadEnabled?: boolean;
}