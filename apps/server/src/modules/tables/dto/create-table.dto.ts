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

  @ApiPropertyOptional({ example: 'task-uuid', description: '可选：所属任务ID（需隶属于同一项目）' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ example: true, description: '可选：跳过默认字段创建（用于导入场景）' })
  @IsOptional()
  @IsBoolean()
  skipDefaultFields?: boolean;
}