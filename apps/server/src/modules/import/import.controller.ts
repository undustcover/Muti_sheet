import { BadRequestException, Controller, Param, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';

@ApiTags('import')
@ApiBearerAuth()
@Controller('tables/:tableId/import')
export class ImportController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: '上传并导入为新表（CSV/XLSX）' })
  @ApiOkResponse({ description: '返回新建表ID与导入统计' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'tableId', description: '参考表ID（用其项目ID）' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'EDITOR')
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, _file: any, cb: any) => {
          const base = path.join(process.cwd(), 'tmp');
          fs.mkdirSync(base, { recursive: true });
          cb(null, base);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname);
          const name = path.basename(file.originalname, ext);
          const now = new Date().toISOString().replace(/[:.]/g, '-');
          cb(null, `${name}-${now}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  )
  async import(@Param('tableId') refTableId: string, @Req() req: any) {
    const file = req.file as any;
    if (!file) throw new BadRequestException('缺少文件字段：file');

    // 获取项目ID，以便在同项目创建新表
    const refTable = await this.prisma.table.findUnique({ where: { id: refTableId } });
    if (!refTable) throw new BadRequestException('参考表不存在');

    const projectId = refTable.projectId;
    const ext = String(path.extname(file.originalname)).toLowerCase();

    let headers: string[] = [];
    let rows: any[][] = [];

    if (ext === '.xlsx') {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(file.path);
      const ws = wb.worksheets[0];
      if (!ws) throw new BadRequestException('Excel 文件为空');
      headers = (ws.getRow(1).values as any[]).slice(1).map((v) => String(v ?? '').trim());
      for (let r = 2; r <= ws.rowCount; r++) {
        const vals = (ws.getRow(r).values as any[]).slice(1);
        rows.push(vals.map((v) => (v == null ? '' : String(v))));
      }
    } else {
      const content = fs.readFileSync(file.path, 'utf-8');
      const recs = parseCsv(content, { columns: false, skip_empty_lines: true });
      if (!recs.length) throw new BadRequestException('CSV 文件为空');
      headers = recs[0].map((v: any) => String(v ?? '').trim());
      rows = recs.slice(1);
    }

    if (!headers.length) throw new BadRequestException('缺少表头');

    // 创建新表与字段（字段类型初步推断：数字/日期/文本）
    const tableName = `Imported_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
    const table = await this.prisma.table.create({ data: { name: tableName, projectId } });

    const detectType = (values: any[]): 'NUMBER' | 'DATE' | 'TEXT' => {
      const nums = values.filter((v) => /^-?\d+(\.\d+)?$/.test(String(v))).length;
      const dates = values.filter((v) => !isNaN(Date.parse(String(v)))).length;
      if (nums > dates && nums >= values.length * 0.6) return 'NUMBER';
      if (dates >= values.length * 0.6) return 'DATE';
      return 'TEXT';
    };

    const fields = await Promise.all(
      headers.map((h, i) =>
        this.prisma.field.create({ data: { tableId: table.id, name: h || `Column_${i + 1}`, type: detectType(rows.map((r) => r[i])), order: i + 1 } }),
      ),
    );

    // 写入记录与数据
    for (const row of rows) {
      const rec = await this.prisma.record.create({ data: { tableId: table.id } });
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const raw = row[i];
        let data: any = { recordId: rec.id, fieldId: f.id };
        if (f.type === 'NUMBER') {
          const n = Number(raw);
          data.valueNumber = isNaN(n) ? null : Math.round(n * 100) / 100;
        } else if (f.type === 'DATE') {
          const d = new Date(raw);
          data.valueDate = isNaN(d.getTime()) ? null : d;
        } else {
          data.valueText = String(raw ?? '');
        }
        await this.prisma.recordsData.create({ data });
      }
    }

    // 清理临时文件
    try { fs.unlinkSync(file.path); } catch (_) {}

    return { tableId: table.id, fields: fields.length, records: rows.length };
  }
}