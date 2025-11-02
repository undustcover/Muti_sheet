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
      const fields = await this.prisma.field.findMany({ where: { tableId }, select: { id: true, name: true, type: true, config: true } });
      const typeMap = new Map<string, FieldType>(fields.map((f: any) => [f.id, (f.type as FieldType) || FieldType.TEXT]));
      const nameMap = new Map<string, string>(fields.map((f: any) => [f.id, f.name || f.id]));
      const optionSetMap = new Map<string, Set<string>>(
        fields.map((f: any) => {
          const opts = (f?.config as any)?.options || [];
          const ids: string[] = Array.isArray(opts) ? opts.map((o: any) => String(o?.id ?? '')).filter(Boolean) : [];
          return [f.id, new Set(ids)] as [string, Set<string>];
        })
      );
      const result: Record<string, any> = {};
      const MAX_TEXT_LENGTH = 800; // 最大文本长度限制（按字符数）

      // helpers
      const normalizeSingle = (val: any): string | null => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'string') return val;
        if (val && typeof val === 'object' && typeof val.id === 'string') return val.id;
        throw new BadRequestException('单选字段值必须为选项 id 或包含 id 的对象');
      };
      const normalizeMulti = (val: any): string[] | null => {
        if (val === null || val === undefined || val === '') return null;
        if (!Array.isArray(val)) throw new BadRequestException('多选字段值必须为选项 id 数组或包含 id 的对象数组');
        return val.map((item) => (typeof item === 'string' ? item : item && typeof item === 'object' ? String(item.id || '') : '')).filter(Boolean);
      };

      for (const [fid, rawVal] of Object.entries(data)) {
        if (!typeMap.has(fid)) {
          // 忽略未知字段，保持兼容
          continue;
        }
        const type = typeMap.get(fid)!;
        const fname = nameMap.get(fid) || fid;
        switch (type) {
          case FieldType.FORMULA: {
            // 公式字段不允许写入任何值
            if (rawVal !== undefined) {
              throw new BadRequestException(`公式字段“${fname}”不允许直接写入数据`);
            }
            // 跳过该字段
            break;
          }
          case FieldType.SINGLE_SELECT: {
            const id = normalizeSingle(rawVal);
            if (id === null) {
              result[fid] = null;
              break;
            }
            const set = optionSetMap.get(fid) || new Set();
            if (set.size === 0) {
              throw new BadRequestException(`单选字段“${fname}”尚未配置选项，无法写入值`);
            }
            if (!set.has(id)) {
              throw new BadRequestException(`单选字段“${fname}”的值不在可选项内`);
            }
            result[fid] = id;
            break;
          }
          case FieldType.MULTI_SELECT: {
            const ids = normalizeMulti(rawVal);
            if (ids === null) {
              result[fid] = null;
              break;
            }
            const set = optionSetMap.get(fid) || new Set();
            if (set.size === 0 && ids.length > 0) {
              throw new BadRequestException(`多选字段“${fname}”尚未配置选项，无法写入值`);
            }
            const illegal = ids.filter((x) => !set.has(x));
            if (illegal.length > 0) {
              throw new BadRequestException(`多选字段“${fname}”包含非法选项值`);
            }
            result[fid] = ids;
            break;
          }
          case FieldType.TEXT: {
            const v = rawVal === null || rawVal === undefined ? '' : String(rawVal);
            const trimmed = v.trim();
            const length = Array.from(trimmed).length; // 以代码点计数，兼容中英文
            if (length > MAX_TEXT_LENGTH) {
              throw new BadRequestException(`文本字段“${fname}”长度超出限制（最多 ${MAX_TEXT_LENGTH} 字符）`);
            }
            result[fid] = trimmed;
            break;
          }
          case FieldType.NUMBER: {
            if (rawVal === null || rawVal === undefined) {
              result[fid] = null;
            } else {
              if (typeof rawVal !== 'number') {
                throw new BadRequestException(`数字字段“${fname}”只接受数值类型`);
              }
              if (Number.isNaN(rawVal)) {
                throw new BadRequestException(`数字字段“${fname}”的值无效`);
              }
              const rounded = Math.round(rawVal * 100) / 100; // 对齐 Decimal(18,2)
              result[fid] = rounded;
            }
            break;
          }
          case FieldType.DATE: {
            if (rawVal === null || rawVal === undefined || rawVal === '') {
              result[fid] = null;
            } else {
              const d = rawVal instanceof Date ? rawVal : new Date(rawVal);
              if (Number.isNaN(d.getTime())) {
                throw new BadRequestException(`日期字段“${fname}”的值无效`);
              }
              result[fid] = d;
            }
            break;
          }
          default: {
            // 其他复杂类型，确保可 JSON 序列化
            try {
              if (rawVal === undefined) {
                result[fid] = null;
              } else {
                JSON.stringify(rawVal);
                result[fid] = rawVal;
              }
            } catch (e) {
              throw new BadRequestException(`字段“${fname}”的值不是有效的 JSON 结构`);
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