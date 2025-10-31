import { IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FieldPermissionJson } from '../../../shared/policies/permission.service';

export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
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
}