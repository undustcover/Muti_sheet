import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty({ example: '任务表' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: false, description: '匿名只读开关' })
  @IsOptional()
  @IsBoolean()
  isAnonymousReadEnabled?: boolean;
}