import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class BatchCreateItemDto {
  @IsObject()
  data!: Record<string, any>;
}

export class BatchUpdateItemDto {
  @IsString()
  recordId!: string;
  @IsObject()
  data!: Record<string, any>;
}

export class BatchRecordsDto {
  @ApiPropertyOptional({ type: [BatchCreateItemDto] })
  @IsOptional()
  @IsArray()
  create?: BatchCreateItemDto[];

  @ApiPropertyOptional({ type: [BatchUpdateItemDto] })
  @IsOptional()
  @IsArray()
  update?: BatchUpdateItemDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  delete?: string[];
}