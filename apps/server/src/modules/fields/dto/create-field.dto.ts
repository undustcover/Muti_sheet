import { IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, MinLength, ValidateNested, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FieldPermissionJson } from '../../../shared/policies/permission.service';
import { Type } from 'class-transformer';

export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  ATTACHMENT = 'ATTACHMENT',
  FORMULA = 'FORMULA',
  SINGLE_SELECT = 'SINGLE_SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
}

export class CreateFieldDto {
  @ApiProperty({ example: '标题' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: FieldType, example: FieldType.TEXT })
  @IsEnum(FieldType)
  type!: FieldType;

  @ApiPropertyOptional({ example: '任务标题' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ example: { visibility: 'visible', writableRoles: ['EDITOR','ADMIN','OWNER'] } })
  @IsOptional()
  @IsObject()
  permissionJson?: FieldPermissionJson;

  // 选择类字段的选项配置
  @ApiPropertyOptional({
    example: [
      { id: 'opt-1', label: '进行中', color: 'green' },
      { id: 'opt-2', label: '待办', color: 'gray' },
    ],
  })
  @IsOptional()
  @IsArray()
  options?: { id: string; label: string; color?: string }[];

  // 数字字段的显示格式
  @ApiPropertyOptional({ example: { decimals: 2, thousand: true } })
  @IsOptional()
  @IsObject()
  format?: { decimals?: number; thousand?: boolean };

  // 公式字段配置
  @ApiPropertyOptional({ example: { op: 'add', fields: ['field-a','field-b'], format: { decimals: 2 } } })
  @IsOptional()
  @IsObject()
  formula?: { op: string; fields: string[]; format?: { decimals?: number; thousand?: boolean } };
}