import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateRecordDto {
  @ApiProperty({ description: '局部更新数据，键为字段ID', example: { 'field-uuid-1': '新文本' } })
  @IsObject()
  data!: Record<string, any>;
}