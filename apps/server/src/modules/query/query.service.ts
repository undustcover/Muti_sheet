import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionService } from '../../shared/policies/permission.service';
import { QueryRequestDto, FilterOp, SortDir } from './dto/query-request.dto';
import { FieldType } from '../fields/dto/create-field.dto';
import { Prisma } from '@prisma/client';
import { toPinyinKey } from '../../shared/utils/pinyin';

export type QueryResult = {
  total: number;
  page: number;
  pageSize: number;
  items: any[];
  groups?: any[];
  visibleFieldIds: string[];
  visibleFields: Array<{ id: string; name: string; type: FieldType; order: number }>;
};

@Injectable()
export class QueryService {
  constructor(private prisma: PrismaService, private permissionService: PermissionService) {}

  async execute(tableId: string, dto: QueryRequestDto, req: any): Promise<QueryResult> {
    const role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | undefined = req.user?.role;
    const anonymous = !role;
    if (anonymous) {
      const table = await this.prisma.table.findUnique({
        where: { id: tableId },
        select: { isAnonymousReadEnabled: true, project: { select: { isAnonymousReadEnabled: true } } },
      });
      if (!table?.project?.isAnonymousReadEnabled) throw new ForbiddenException('Anonymous read disabled for this project');
      if (!table?.isAnonymousReadEnabled) throw new ForbiddenException('Anonymous read disabled for this table');
    }

    const fields = await this.prisma.field.findMany({ where: { tableId }, orderBy: { order: 'asc' } });
    const fieldTypeMap = new Map<string, FieldType>();
    for (const f of fields as any[]) fieldTypeMap.set(f.id, f.type as FieldType);
    const effectiveRole = (role ?? 'VIEWER') as 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    // Base visibility by permission
    let visibleFieldIds = fields
      .filter((f: any) => {
        const perm = this.permissionService.resolveFieldPermission(effectiveRole, f.permissionJson);
        return perm.visible;
      })
      .map((f) => f.id);

    // If viewId provided, align with view config (columnVisibility/sorting/group/agg)
    let viewSorts: { fieldId: string; direction: SortDir }[] | undefined = undefined;
    if (dto.viewId) {
      const view = await this.prisma.view.findUnique({ where: { id: dto.viewId } });
      const cfg = (view?.config ?? {}) as any;
      const colVis = (cfg?.columnVisibility ?? {}) as Record<string, boolean | undefined>;
      const visKeys = Object.keys(colVis);
      if (visKeys.length) {
        visibleFieldIds = visibleFieldIds.filter((fid) => colVis[fid] !== false);
      }
      const sorting = (cfg?.sorting ?? []) as Array<{ id: string; desc?: boolean }>;
      if ((!dto.sorts || !dto.sorts.length) && Array.isArray(sorting) && sorting.length) {
        viewSorts = sorting
          .filter((s) => !!s.id)
          .map((s) => ({ fieldId: s.id, direction: s.desc ? SortDir.DESC : SortDir.ASC }));
      }
      const viewPriority: boolean = !!cfg?.viewPriority;
      if (!dto.groupBy && typeof cfg?.groupBy === 'string') dto.groupBy = cfg.groupBy;
      if (!dto.groupDateGranularity && typeof cfg?.groupDateGranularity === 'string') dto.groupDateGranularity = cfg.groupDateGranularity;
      if ((!dto.aggregations || !dto.aggregations.length) && Array.isArray(cfg?.aggregations)) {
        dto.aggregations = cfg.aggregations as any;
      }
      if (viewPriority) {
        if (typeof cfg?.groupBy === 'string') dto.groupBy = cfg.groupBy;
        if (typeof cfg?.groupDateGranularity === 'string') dto.groupDateGranularity = cfg.groupDateGranularity;
        if (Array.isArray(cfg?.aggregations)) dto.aggregations = cfg.aggregations as any;
        if (Array.isArray(sorting) && sorting.length) {
          viewSorts = sorting
            .filter((s) => !!s.id)
            .map((s) => ({ fieldId: s.id, direction: s.desc ? SortDir.DESC : SortDir.ASC }));
        }
      }
    }

    // Build initial where with DB-friendly filters (exclude REGEX handled in-memory)
    const prismaWhereAND: any[] = [];
    for (const f of dto.filters || []) {
      if (!visibleFieldIds.includes(f.fieldId)) continue;
      const base: any = { fieldId: f.fieldId };
      const t = fieldTypeMap.get(f.fieldId);
      const col = t === 'NUMBER' ? 'valueNumber' : t === 'DATE' ? 'valueDate' : t === 'TEXT' ? 'valueText' : undefined;
      switch (f.op) {
        case FilterOp.EQ:
          if (col) prismaWhereAND.push({ data: { some: { ...base, [col]: f.value } } });
          else prismaWhereAND.push({ data: { some: { ...base } } });
          break;
        case FilterOp.NEQ:
          if (col) prismaWhereAND.push({ data: { some: { ...base, NOT: { [col]: f.value } } } });
          else prismaWhereAND.push({ data: { some: { ...base } } });
          break;
        case FilterOp.LT:
          if (col === 'valueNumber' || col === 'valueDate') prismaWhereAND.push({ data: { some: { ...base, [col]: { lt: f.value } } } });
          break;
        case FilterOp.GT:
          if (col === 'valueNumber' || col === 'valueDate') prismaWhereAND.push({ data: { some: { ...base, [col]: { gt: f.value } } } });
          break;
        case FilterOp.LTE:
          if (col === 'valueNumber' || col === 'valueDate') prismaWhereAND.push({ data: { some: { ...base, [col]: { lte: f.value } } } });
          break;
        case FilterOp.GTE:
          if (col === 'valueNumber' || col === 'valueDate') prismaWhereAND.push({ data: { some: { ...base, [col]: { gte: f.value } } } });
          break;
        case FilterOp.IN:
          if (col === 'valueText') prismaWhereAND.push({ data: { some: { ...base, valueText: { in: f.values || [] } } } });
          else if (col === 'valueNumber') prismaWhereAND.push({ data: { some: { ...base, valueNumber: { in: f.values || [] } } } });
          else if (col === 'valueDate') prismaWhereAND.push({ data: { some: { ...base, valueDate: { in: f.values || [] } } } });
          break;
        case FilterOp.LIKE:
          prismaWhereAND.push({ data: { some: { ...base, valueText: { contains: f.value, mode: 'insensitive' } } } });
          break;
        case FilterOp.BETWEEN: {
          const end = (f.values || [])[0];
          if (col === 'valueNumber' || col === 'valueDate') prismaWhereAND.push({ data: { some: { ...base, [col]: { gte: f.value, lte: end } } } });
          break;
        }
        case FilterOp.EXISTS:
          prismaWhereAND.push({ data: { some: { ...base } } });
          break;
        case FilterOp.REGEX:
          // handled in-memory later
          break;
      }
    }

    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const sorts = (dto.sorts && dto.sorts.length ? dto.sorts : (viewSorts || [])) as { fieldId: string; direction: SortDir }[];
    const hasRegex = (dto.filters || []).some((x) => x.op === FilterOp.REGEX);

    let totalDB = 0;
    let itemsDB: any[] = [];

    // Attempt DB pushdown for multi-field ORDER BY when no REGEX filters
    if (sorts.length >= 1 && !hasRegex && sorts.every((s) => visibleFieldIds.includes(s.fieldId))) {
      const pinyinEnabled = String(process.env.PINYIN_COLLATION_ENABLED || 'false') === 'true';
      const pinyinName = String(process.env.PINYIN_COLLATION_NAME || 'zh-u-co-pinyin');
      const filterJoins: Prisma.Sql[] = [];
      const filterWhereParts: Prisma.Sql[] = [];
      const logic = (dto.filterLogic || 'and').toLowerCase();
      for (let i = 0, j = 0; i < (dto.filters || []).length; i++) {
        const f = dto.filters![i];
        if (!visibleFieldIds.includes(f.fieldId) || f.op === FilterOp.REGEX) continue;
        const alias = `f${j++}`;
        const ft = fieldTypeMap.get(f.fieldId);
        const col = ft === 'NUMBER' ? 'valueNumber' : ft === 'DATE' ? 'valueDate' : ft === 'TEXT' ? 'valueText' : null;
        let cond: Prisma.Sql | null = null;
        if (f.op === FilterOp.EQ && col) cond = Prisma.sql`${Prisma.raw(alias)}.${Prisma.raw(`"${col}"`)} = ${f.value}`;
        else if (f.op === FilterOp.NEQ && col) cond = Prisma.sql`${Prisma.raw(alias)}.${Prisma.raw(`"${col}"`)} <> ${f.value}`;
        else if (f.op === FilterOp.LT && (col === 'valueNumber' || col === 'valueDate')) cond = Prisma.sql`${Prisma.raw(alias)}.${Prisma.raw(`"${col}"`)} < ${f.value}`;
        else if (f.op === FilterOp.GT && (col === 'valueNumber' || col === 'valueDate')) cond = Prisma.sql`${Prisma.raw(alias)}.${Prisma.raw(`"${col}"`)} > ${f.value}`;
        else if (f.op === FilterOp.LTE && (col === 'valueNumber' || col === 'valueDate')) cond = Prisma.sql`${Prisma.raw(alias)}.${Prisma.raw(`"${col}"`)} <= ${f.value}`;
        else if (f.op === FilterOp.GTE && (col === 'valueNumber' || col === 'valueDate')) cond = Prisma.sql`${Prisma.raw(alias)}.${Prisma.raw(`"${col}"`)} >= ${f.value}`;
        else if (f.op === FilterOp.IN && col) {
          const vals = (f.values || []) as any[];
          if (vals.length) cond = Prisma.sql`${Prisma.raw(alias)}.${Prisma.raw(`"${col}"`)} IN (${Prisma.join(vals.map((v) => Prisma.sql`${v}`))})`;
        } else if (f.op === FilterOp.LIKE && col === 'valueText') {
          const pattern = `%${String(f.value)}%`;
          cond = Prisma.sql`${Prisma.raw(alias)}."valueText" ILIKE ${pattern}`;
        } else if (f.op === FilterOp.BETWEEN && (col === 'valueNumber' || col === 'valueDate')) {
          const end = (f.values || [])[0];
          if (end !== undefined) cond = Prisma.sql`${Prisma.raw(alias)}.${Prisma.raw(`"${col}"`)} BETWEEN ${f.value} AND ${end}`;
        } else if (f.op === FilterOp.EXISTS) {
          cond = null; // handled via alias presence
        }
        if (logic === 'or') {
          filterJoins.push(
            Prisma.sql`LEFT JOIN "RecordsData" AS ${Prisma.raw(alias)} ON ${Prisma.raw(alias)}."recordId" = r."id" AND ${Prisma.raw(alias)}."fieldId" = ${f.fieldId}`,
          );
          if (cond) filterWhereParts.push(cond);
          else filterWhereParts.push(Prisma.sql`${Prisma.raw(alias)}."recordId" IS NOT NULL`);
        } else {
          filterJoins.push(
            Prisma.sql`INNER JOIN "RecordsData" AS ${Prisma.raw(alias)} ON ${Prisma.raw(alias)}."recordId" = r."id" AND ${Prisma.raw(alias)}."fieldId" = ${f.fieldId}${cond ? Prisma.sql` AND ${cond}` : Prisma.sql``}`,
          );
        }
      }

      const sortJoins: Prisma.Sql[] = [];
      const orderParts: Prisma.Sql[] = [];
      for (let k = 0; k < sorts.length; k++) {
        const s = sorts[k];
        const alias = `s${k}`;
        const ft = fieldTypeMap.get(s.fieldId);
        const col = ft === 'NUMBER' ? 'valueNumber' : ft === 'DATE' ? 'valueDate' : ft === 'TEXT' ? 'valueText' : null;
        if (!col) continue;
        sortJoins.push(Prisma.sql`LEFT JOIN "RecordsData" AS ${Prisma.raw(alias)} ON ${Prisma.raw(alias)}."recordId" = r."id" AND ${Prisma.raw(alias)}."fieldId" = ${s.fieldId}`);
        const dir = s.direction === SortDir.DESC ? Prisma.raw('DESC') : Prisma.raw('ASC');
        if (col === 'valueText' && pinyinEnabled) {
          orderParts.push(Prisma.sql`${Prisma.raw(`${alias}."valueText" COLLATE "${pinyinName}"`)} ${dir} NULLS LAST`);
        } else {
          orderParts.push(Prisma.sql`${Prisma.raw(`${alias}."${col}"`)} ${dir} NULLS LAST`);
        }
      }

      const countRows = await this.prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(DISTINCT r."id") AS count FROM "Record" r ${Prisma.join(filterJoins)} WHERE r."tableId" = ${tableId}${
          filterWhereParts.length ? Prisma.sql` AND (${Prisma.join(filterWhereParts, logic === 'or' ? ' OR ' : ' AND ')})` : Prisma.sql``
        }`,
      );
      totalDB = Number(countRows[0]?.count || 0);

      const idsRows = await this.prisma.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          SELECT DISTINCT r."id"
          FROM "Record" r
          ${Prisma.join(filterJoins)}
          ${Prisma.join(sortJoins)}
          WHERE r."tableId" = ${tableId}
          ${filterWhereParts.length ? Prisma.sql` AND (${Prisma.join(filterWhereParts, logic === 'or' ? ' OR ' : ' AND ')})` : Prisma.sql``}
          ORDER BY ${Prisma.join(orderParts.length ? orderParts : [Prisma.sql`r."createdAt" DESC`])}, r."createdAt" DESC
          LIMIT ${pageSize} OFFSET ${skip}
        `,
      );
      const ids = idsRows.map((r) => r.id);
      const records = await this.prisma.record.findMany({ where: { id: { in: ids } }, include: { data: true } });
      const orderMap = new Map(ids.map((id, idx) => [id, idx]));
      itemsDB = records.sort((a: any, b: any) => (orderMap.get(a.id)! - orderMap.get(b.id)!));
    }

    if (!itemsDB.length && totalDB === 0) {
      const [cnt, rows] = await this.prisma.$transaction([
        this.prisma.record.count({ where: { tableId, AND: prismaWhereAND } }),
        this.prisma.record.findMany({
          where: { tableId, AND: prismaWhereAND },
          orderBy: { createdAt: 'desc' },
          include: { data: true },
        }),
      ]);
      totalDB = cnt;
      itemsDB = rows as any[];
    }

    let items = itemsDB;
    for (const f of (dto.filters || []).filter((x) => x.op === FilterOp.REGEX)) {
      if (!visibleFieldIds.includes(f.fieldId) || !f.value) continue;
      const pattern = String(f.value);
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, 'i');
      } catch (e) {
        throw new ForbiddenException('Invalid regex');
      }
      items = items.filter((rec) => {
        const d = rec.data.find((x: any) => x.fieldId === f.fieldId);
        const v = d ? (d.valueText ?? String(d.valueNumber ?? d.valueDate ?? d.valueJson ?? '')) : '';
        return regex.test(v);
      });
    }

    if (!(sorts.length >= 1 && !hasRegex)) {
      if (sorts.length) {
        items = items.slice().sort((a, b) => {
          for (const s of sorts) {
            const da = a.data.find((x: any) => x.fieldId === s.fieldId);
            const db = b.data.find((x: any) => x.fieldId === s.fieldId);
            const va = da ? (da.valueJson ?? da.valueText ?? da.valueNumber ?? da.valueDate ?? null) : null;
            const vb = db ? (db.valueJson ?? db.valueText ?? db.valueNumber ?? db.valueDate ?? null) : null;
            if (va === vb) continue;
            let aKey: any = va;
            let bKey: any = vb;
            const pinyinFallback = String(process.env.PINYIN_FALLBACK_ENABLED || 'false') === 'true';
            if (pinyinFallback && typeof aKey === 'string' && typeof bKey === 'string') {
              aKey = toPinyinKey(aKey);
              bKey = toPinyinKey(bKey);
            }
            const cmp = aKey > bKey ? 1 : -1;
            return s.direction === SortDir.ASC ? cmp : -cmp;
          }
          return 0;
        });
      }
    }

    let groups: any[] | undefined = undefined;
    if (dto.groupBy) {
      const bucketMap = new Map<string, any[]>();
      for (const rec of items) {
        const d = rec.data.find((x: any) => x.fieldId === dto.groupBy);
        let key = d ? (d.valueJson ?? d.valueText ?? d.valueNumber ?? d.valueDate ?? '') : '';
        const gbType = fieldTypeMap.get(dto.groupBy);
        if (gbType === 'DATE' && dto.groupDateGranularity && key) {
          const dt = new Date(key as any);
          if (dto.groupDateGranularity === 'day') {
            const y = dt.getUTCFullYear();
            const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
            const d0 = String(dt.getUTCDate()).padStart(2, '0');
            key = `${y}-${m}-${d0}`;
          } else if (dto.groupDateGranularity === 'month') {
            const y = dt.getUTCFullYear();
            const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
            key = `${y}-${m}`;
          } else if (dto.groupDateGranularity === 'week') {
            const tmp = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
            const day = (tmp.getUTCDay() + 6) % 7;
            tmp.setUTCDate(tmp.getUTCDate() - day + 3);
            const week1 = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
            const weekNo = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
            key = `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
          }
        } else {
          key = String(key ?? '');
        }
        const arr = bucketMap.get(key) || [];
        arr.push(rec);
        bucketMap.set(key, arr);
      }
      groups = Array.from(bucketMap.entries()).map(([key, rows]) => {
        const aggByField: Record<string, any> = {};
        for (const agg of dto.aggregations || []) {
          if (agg.type === 'count' && !agg.fieldId) {
            aggByField['__all__'] = { ...(aggByField['__all__'] ?? {}), count: rows.length };
            continue;
          }
          const fieldId = agg.fieldId!;
          const values = rows
            .map((r) => {
              const d = r.data.find((x: any) => x.fieldId === fieldId);
              return d ? (d.valueNumber ?? null) : null;
            })
            .filter((x) => typeof x === 'number') as number[];
          const existing = aggByField[fieldId] ?? {};
          if (agg.type === 'sum') existing.sum = values.reduce((s, n) => s + n, 0);
          else if (agg.type === 'avg') existing.avg = values.length ? values.reduce((s, n) => s + n, 0) / values.length : 0;
          else if (agg.type === 'min') existing.min = values.length ? Math.min(...values) : null;
          else if (agg.type === 'max') existing.max = values.length ? Math.max(...values) : null;
          else if (agg.type === 'count') existing.count = values.length;
          aggByField[fieldId] = existing;
        }
        const label = key === '' ? '空值' : String(key);
        return { key, label, count: rows.length, aggregations: aggByField };
      });
    }

    const total = hasRegex ? items.length : totalDB;
    const pageItems = items.slice(skip, skip + pageSize);

    const projectAnonymous = anonymous;
    const resultItems = pageItems.map((rec) => {
      const obj: any = { id: rec.id, createdAt: rec.createdAt };
      for (const d of rec.data) {
        if (!visibleFieldIds.includes(d.fieldId)) continue;
        const v = d.valueJson ?? d.valueText ?? d.valueNumber ?? d.valueDate ?? null;
        obj[d.fieldId] = projectAnonymous ? (typeof v === 'object' ? null : v) : v;
      }
      return obj;
    });

    const visibleFields = fields
      .filter((f) => visibleFieldIds.includes(f.id))
      .map((f) => ({ id: f.id, name: (f as any).name, type: f.type as FieldType, order: (f as any).order }));

    return { total, page, pageSize, items: resultItems, groups, visibleFieldIds, visibleFields };
  }
}