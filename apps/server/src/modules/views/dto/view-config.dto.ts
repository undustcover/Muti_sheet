import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class ViewSortingItemDto {
  @ApiPropertyOptional({ description: '字段ID' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ description: '是否降序', default: false })
  @IsOptional()
  @IsBoolean()
  desc?: boolean;
}

export class ViewAggregationDto {
  @ApiPropertyOptional({ enum: ['count', 'sum', 'avg', 'min', 'max'] })
  @IsString()
  type!: 'count' | 'sum' | 'avg' | 'min' | 'max';

  @ApiPropertyOptional({ description: '聚合字段ID（count可省略）' })
  @IsOptional()
  @IsString()
  fieldId?: string;
}

export class ViewConfigDto {
  @ApiPropertyOptional({ description: '列可见性：key为字段ID，false表示隐藏' })
  @IsOptional()
  @IsObject()
  columnVisibility?: Record<string, boolean | undefined>;

  @ApiPropertyOptional({ type: [ViewSortingItemDto], description: '排序配置' })
  @IsOptional()
  @IsArray()
  sorting?: ViewSortingItemDto[];

  @ApiPropertyOptional({ description: '分组字段ID' })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiPropertyOptional({ description: '日期分组粒度', enum: ['day', 'week', 'month'] })
  @IsOptional()
  @IsString()
  groupDateGranularity?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({ type: [ViewAggregationDto], description: '聚合定义' })
  @IsOptional()
  @IsArray()
  aggregations?: ViewAggregationDto[];

  @ApiPropertyOptional({ description: '视图优先：服务端按视图覆盖客户端查询参数', default: false })
  @IsOptional()
  @IsBoolean()
  viewPriority?: boolean;

  @ApiPropertyOptional({ description: '冻结列数量', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  freezeCount?: number;

  @ApiPropertyOptional({ description: '行高（像素）', default: 28 })
  @IsOptional()
  @IsInt()
  @Min(16)
  rowHeight?: number;

  @ApiPropertyOptional({ description: '看板分组字段ID' })
  @IsOptional()
  @IsString()
  kanbanGroupFieldId?: string;

  @ApiPropertyOptional({ description: '日历字段设置，如开始/结束日期' })
  @IsOptional()
  @IsObject()
  calendarFields?: Record<string, string>;

  @ApiPropertyOptional({ description: '共享角色列表（允许访问该视图的角色）', enum: ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sharedRoles?: ('VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER')[];

  @ApiPropertyOptional({ description: '允许导出（默认 false，编辑者及以上可开启）', default: false })
  @IsOptional()
  @IsBoolean()
  exportEnabled?: boolean;
}