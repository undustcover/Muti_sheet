import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class CreateRecordDto {
  @ApiPropertyOptional({ description: '记录数据，键为字段ID', example: { 'field-uuid-1': '文本', 'field-uuid-2': 123 } })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}