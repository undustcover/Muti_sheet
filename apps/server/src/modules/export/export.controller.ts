import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ViewAccessGuard } from '../../shared/guards/view-access.guard';
import type { Response } from 'express';
import { FieldType } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { QueryService } from '../query/query.service';

@ApiTags('export')
@ApiBearerAuth()
@Controller('tables/:tableId/export')
export class ExportController {
  constructor(private prisma: PrismaService, private queryService: QueryService) {}

  @ApiOperation({ summary: '按视图导出记录为 Excel/CSV 文件' })
  @ApiOkResponse({ description: 'Excel/CSV 文件下载' })
  @ApiParam({ name: 'tableId', description: '表ID' })
  @ApiQuery({ name: 'viewId', description: '视图ID', required: true })
  @ApiQuery({ name: 'format', description: '文件格式：xlsx/csv（默认xlsx）', required: false })
  @UseGuards(OptionalJwtAuthGuard, ViewAccessGuard)
  @Get()
  async export(
    @Param('tableId') tableId: string,
    @Req() req: any,
    @Res() res: Response,
    @Query('viewId') viewId?: string,
    @Query('format') format?: 'xlsx' | 'csv',
  ) {
    // 明确导出意图，供守卫识别
    req.query = { ...(req.query || {}), export: '1', viewId };

    // 校验视图存在与归属
    if (!viewId) throw new BadRequestException('缺少视图ID');
    const view = await this.prisma.view.findUnique({ where: { id: viewId } });
    if (!view) throw new NotFoundException('视图不存在');
    if (view.tableId !== tableId) throw new ForbiddenException('视图不属于指定表');
    if (!view.exportEnabled) throw new ForbiddenException('该视图未启用导出');

    // 使用 QueryService 执行视图筛选/排序/分组/聚合，并分页抓取全部数据
    const pageSize = 2000;
    let page = 1;
    let allItems: any[] = [];
    let visibleFields: Array<{ id: string; name: string; type: FieldType; order: number }> = [] as any;
    let groupsFromService: any[] | undefined = undefined;
    let total = 0;
    while (true) {
      const result = await this.queryService.execute(tableId, { viewId, page, pageSize } as any, req);
      if (page === 1) {
        visibleFields = result.visibleFields as any;
        groupsFromService = result.groups;
        total = result.total;
      }
      allItems = allItems.concat(result.items);
      if (allItems.length >= result.total) break;
      page++;
      if (page > 10000) break; // 保护性退出，防止无限循环
    }

    const formatSafe = (format || 'xlsx').toLowerCase();
    if (formatSafe === 'csv') {
      // 生成 CSV（主数据表）；分组统计追加到文件尾部注释行
      const headers = visibleFields.map((f) => escapeCsv(f.name));
      const lines: string[] = [];
      lines.push(headers.join(','));
      for (const item of allItems) {
        const row = visibleFields.map((f) => escapeCsv(formatCell(item[f.id], f.type) ?? ''));
        lines.push(row.join(','));
      }

      if (groupsFromService && groupsFromService.length) {
        lines.push('');
        lines.push('# Groups Summary');
        for (const g of groupsFromService) {
          const summary = `label=${escapeCsv(String(g.label))};count=${g.count};aggregations=${escapeCsv(JSON.stringify(g.aggregations || {}))}`;
          lines.push(`# ${summary}`);
        }
      }

      const csv = lines.join('\n');
      const filename = `export_${tableId}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
      return;
    }

    // 生成 Excel
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Export');
    ws.columns = visibleFields.map((f) => ({ header: f.name, key: f.id, width: 18 }));

    for (const item of allItems) {
      const rowVals: Record<string, string | null> = {};
      for (const f of visibleFields) {
        rowVals[f.id] = formatCell(item[f.id], f.type);
      }
      ws.addRow(rowVals);
    }

    // 如果存在分组统计，输出到单独的工作表
    if (groupsFromService && groupsFromService.length) {
      const ws2 = wb.addWorksheet('Groups');
      ws2.columns = [
        { header: 'Group', key: 'group', width: 24 },
        { header: 'Count', key: 'count', width: 10 },
        { header: 'Aggregations(JSON)', key: 'aggs', width: 60 },
      ];
      for (const g of groupsFromService) {
        ws2.addRow({ group: String(g.label), count: g.count, aggs: JSON.stringify(g.aggregations || {}) });
      }
    }

    const filename = `export_${tableId}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const buf = await wb.xlsx.writeBuffer();
    res.send(Buffer.from(buf));
  }
}

function formatCell(val: any, type: FieldType): string | null {
  if (val == null) return null;
  switch (type) {
    case FieldType.NUMBER:
      return typeof val === 'number' ? String(val) : String(Number(val));
    case FieldType.DATE: {
      const d = typeof val === 'string' ? new Date(val) : (val as Date);
      return isNaN(d.getTime()) ? String(val) : d.toISOString().slice(0, 10);
    }
    case FieldType.ATTACHMENT:
      return typeof val === 'object' ? JSON.stringify(val) : String(val);
    default:
      return typeof val === 'object' ? JSON.stringify(val) : String(val);
  }
}

function escapeCsv(val: string) {
  if (/[",\n]/.test(val)) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}