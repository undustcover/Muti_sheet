import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum FilterOp {
  EQ = 'eq',
  NEQ = 'neq',
  LT = 'lt',
  GT = 'gt',
  LTE = 'lte',
  GTE = 'gte',
  IN = 'in',
  LIKE = 'like',
  REGEX = 'regex',
  BETWEEN = 'between',
  EXISTS = 'exists',
}

export enum SortDir {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryFilterDto {
  @ApiPropertyOptional({ description: '字段ID' })
  @IsString()
  fieldId!: string;

  @ApiPropertyOptional({ enum: FilterOp })
  @IsEnum(FilterOp)
  op!: FilterOp;

  @ApiPropertyOptional({ description: '单值或区间起始值' })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({ description: '多值列表或区间结束值' })
  @IsOptional()
  values?: any[];
}

export class QuerySortDto {
  @ApiPropertyOptional({ description: '字段ID' })
  @IsString()
  fieldId!: string;

  @ApiPropertyOptional({ enum: SortDir })
  @IsEnum(SortDir)
  direction!: SortDir;
}

export class QueryRequestDto {
  @ApiPropertyOptional({ type: [QueryFilterDto] })
  @IsOptional()
  @IsArray()
  filters?: QueryFilterDto[];

  @ApiPropertyOptional({ description: '过滤组合逻辑', enum: ['and', 'or'] })
  @IsOptional()
  @IsString()
  filterLogic?: 'and' | 'or';

  @ApiPropertyOptional({ type: [QuerySortDto] })
  @IsOptional()
  @IsArray()
  sorts?: QuerySortDto[];

  @ApiPropertyOptional({ description: '分组字段ID' })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiPropertyOptional({ description: '日期分组粒度', enum: ['day', 'week', 'month'] })
  @IsOptional()
  @IsString()
  groupDateGranularity?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({ description: '聚合定义，如 count/sum/avg/min/max', example: [{ type: 'count' }, { type: 'sum', fieldId: 'fid-number' }] })
  @IsOptional()
  @IsArray()
  aggregations?: Array<{ type: 'count' | 'sum' | 'avg' | 'min' | 'max'; fieldId?: string }>;

  @ApiPropertyOptional({ description: '关联视图ID（可选）' })
  @IsOptional()
  @IsString()
  viewId?: string;

  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: '是否启用缓存（认证用户可选）', example: false })
  @IsOptional()
  @IsBoolean()
  useCache?: boolean;

  @ApiPropertyOptional({ description: '缓存 TTL 毫秒（上限受服务端约束）', example: 15000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  cacheTtlMs?: number;
}