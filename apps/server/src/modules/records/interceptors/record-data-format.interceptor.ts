import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Observable } from 'rxjs';
import { FieldType } from '../../fields/dto/create-field.dto';

@Injectable()
export class RecordDataFormatInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const { params, body, route } = req;

    // Only process if body has data or batch payload
    if (!body || typeof body !== 'object') {
      return next.handle();
    }

    // Helper: sanitize single data object by tableId
    const sanitizeDataByTable = async (tableId: string, data: Record<string, any>) => {
      if (!data || typeof data !== 'object') return {};
      const fields = await this.prisma.field.findMany({ where: { tableId }, select: { id: true, type: true } });
      const fieldMap = new Map<string, FieldType>(fields.map((f: any) => [f.id, (f.type as FieldType) || FieldType.TEXT]));
      const result: Record<string, any> = {};
      const MAX_TEXT_LENGTH = 800; // 最大文本长度限制（按字符数）

      for (const [fid, val] of Object.entries(data)) {
        if (!fieldMap.has(fid)) {
          // Ignore unknown field ids silently to keep backward-compatible behavior
          continue;
        }
        const type = fieldMap.get(fid)!;
        switch (type) {
          case FieldType.TEXT: {
            const v = val === null || val === undefined ? '' : String(val);
            const trimmed = v.trim();
            const length = Array.from(trimmed).length; // 以代码点计数，兼容中英文
            if (length > MAX_TEXT_LENGTH) {
              throw new BadRequestException(`Text too long for field ${fid}, max ${MAX_TEXT_LENGTH}`);
            }
            result[fid] = trimmed;
            break;
          }
          case FieldType.NUMBER: {
            if (val === null || val === undefined) {
              result[fid] = null;
            } else {
              if (typeof val !== 'number') {
                throw new BadRequestException(`Number field ${fid} only accepts numeric type`);
              }
              if (Number.isNaN(val)) {
                throw new BadRequestException(`Invalid number for field ${fid}`);
              }
              const rounded = Math.round(val * 100) / 100; // 对齐 Decimal(18,2)
              result[fid] = rounded;
            }
            break;
          }
          case FieldType.DATE: {
            if (val === null || val === undefined || val === '') {
              result[fid] = null;
            } else {
              const d = val instanceof Date ? val : new Date(val);
              if (Number.isNaN(d.getTime())) {
                throw new BadRequestException(`Invalid date for field ${fid}`);
              }
              result[fid] = d;
            }
            break;
          }
          default: {
            // For other complex types, ensure JSON-serializable (basic check)
            try {
              if (val === undefined) {
                result[fid] = null;
              } else {
                JSON.stringify(val);
                result[fid] = val;
              }
            } catch (e) {
              throw new BadRequestException(`Invalid JSON for field ${fid}`);
            }
            break;
          }
        }
      }
      return result;
    };

    // Route-aware sanitation
    // Create: POST tables/:tableId/records
    if (route?.path?.includes('tables/:tableId/records') && req.method === 'POST' && !route?.path?.endsWith(':batch')) {
      const tableId = params?.tableId;
      body.data = await sanitizeDataByTable(tableId, body.data || {});
    }

    // Update: PATCH records/:recordId
    if (route?.path?.includes('records/:recordId') && req.method === 'PATCH') {
      const recordId = params?.recordId;
      const rec = await this.prisma.record.findUnique({ where: { id: recordId }, select: { tableId: true } });
      if (!rec) throw new BadRequestException('Record not found');
      body.data = await sanitizeDataByTable(rec.tableId, body.data || {});
    }

    // Batch: POST tables/:tableId/records:batch
    if (route?.path?.includes('tables/:tableId/records:batch') && req.method === 'POST') {
      const tableId = params?.tableId;
      if (Array.isArray(body.create)) {
        body.create = await Promise.all(
          body.create.map(async (item: any) => ({ ...item, data: await sanitizeDataByTable(tableId, item?.data || {}) }))
        );
      }
      if (Array.isArray(body.update)) {
        body.update = await Promise.all(
          body.update.map(async (item: any) => ({ ...item, data: await sanitizeDataByTable(tableId, item?.data || {}) }))
        );
      }
      // delete list stays as-is
    }

    return next.handle();
  }
}