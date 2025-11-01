import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: '任务A-1' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: '任务描述' })
  @IsOptional()
  @IsString()
  description?: string;
}