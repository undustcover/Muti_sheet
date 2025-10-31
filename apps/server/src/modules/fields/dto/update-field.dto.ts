import { IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
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
}