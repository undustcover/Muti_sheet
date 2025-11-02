import { IsArray, IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { FieldPermissionJson } from '../../../shared/policies/permission.service';
import { FieldType } from './create-field.dto';

export class UpdateFieldDto {
  @ApiPropertyOptional({ example: '新的标题' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ enum: FieldType, example: FieldType.TEXT })
  @IsOptional()
  @IsEnum(FieldType)
  type?: FieldType;

  @ApiPropertyOptional({ example: '描述更新' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ example: { visibility: 'readonly', readableRoles: ['VIEWER','EDITOR','ADMIN','OWNER'] } })
  @IsOptional()
  @IsObject()
  permissionJson?: FieldPermissionJson;

  @ApiPropertyOptional({
    description: '选择类字段的选项配置',
    example: [
      { id: 'opt-1', label: '进行中', color: 'green' },
      { id: 'opt-2', label: '待办', color: 'gray' },
    ],
  })
  @IsOptional()
  @IsArray()
  options?: { id: string; label: string; color?: string }[];

  @ApiPropertyOptional({ description: '数字字段显示格式', example: { decimals: 2, thousand: true } })
  @IsOptional()
  @IsObject()
  format?: { decimals?: number; thousand?: boolean };

  @ApiPropertyOptional({ description: '公式字段配置', example: { op: 'add', fields: ['field-a','field-b'] } })
  @IsOptional()
  @IsObject()
  formula?: { op: string; fields: string[]; format?: { decimals?: number; thousand?: boolean } };
}