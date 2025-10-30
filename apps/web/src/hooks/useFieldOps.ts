import dayjs from 'dayjs';
import type { ColumnItem, RowRecord, SelectOption } from '../types';

interface UseFieldOpsProps {
  columnMeta: Record<string, ColumnItem>;
  columnOrder: string[];
  columnVisibility: Record<string, boolean | undefined>;
  histSetColumnMeta: (updater: (prev: Record<string, ColumnItem>) => Record<string, ColumnItem>) => void;
  histSetColumnOrder: (updater: (prev: string[]) => string[]) => void;
  histSetColumnVisibility: (updater: (prev: Record<string, boolean | undefined>) => Record<string, boolean | undefined>) => void;
  histSetSorting: (updater: (prev: any[]) => any[]) => void;
  histSetData: (updater: (prev: RowRecord[]) => RowRecord[]) => void;
  show: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  requestMeasure: () => void;
}

export function useFieldOps({ columnMeta, columnOrder, columnVisibility, histSetColumnMeta, histSetColumnOrder, histSetColumnVisibility, histSetSorting, histSetData, show, requestMeasure }: UseFieldOpsProps) {
  const addField = (fid: string, item: ColumnItem) => {
    if (columnMeta[fid]) { show('字段已存在', 'warning'); return; }
    histSetColumnMeta(prev => ({ ...prev, [fid]: item }));
    histSetColumnOrder(prev => [...prev, fid]);
    histSetColumnVisibility(prev => ({ ...prev, [fid]: true }));
    // 初始化数据默认值（非公式列）
    const t = item.type;
    const normalizeType = (tt: string) => (tt === 'single' ? 'select' : tt === 'multi' ? 'multiSelect' : tt);
    const nt = normalizeType(t);
    if (nt !== 'formula') {
      const defaultValue = nt === 'text' ? ''
        : nt === 'number' ? 0
        : nt === 'date' ? dayjs().toISOString()
        : nt === 'select' ? null as any
        : nt === 'multiSelect' ? [] as any
        : nt === 'user' ? null as any
        : nt === 'relation' ? null as any
        : '';
      histSetData(prev => prev.map(r => ({ ...r, [fid]: defaultValue })));
    }
    show(`新增字段：${item.name}`, 'success');
    requestMeasure();
  };

  const removeField = (fid: string) => {
    if (fid === 'id') { show('不可删除 ID 字段', 'warning'); return; }
    if (!columnMeta[fid]) { show('字段不存在', 'warning'); return; }
    histSetColumnMeta(prev => {
      const next = { ...prev } as Record<string, ColumnItem>;
      delete next[fid];
      return next;
    });
    histSetColumnOrder(order => order.filter(x => x !== fid));
    histSetColumnVisibility(v => {
      const { [fid]: _omit, ...rest } = v;
      return rest;
    });
    histSetSorting(s => s.filter((x: any) => x.id !== fid));
    show('删除字段成功', 'success');
    requestMeasure();
  };

  const renameField = (fid: string, name: string) => {
    if (!columnMeta[fid]) { show('字段不存在', 'warning'); return; }
    const trimmed = name.trim();
    if (!trimmed) { show('字段名称不能为空', 'warning'); return; }
    const duplicate = Object.entries(columnMeta).some(([cid, meta]) => cid !== fid && meta.name === trimmed);
    if (duplicate) { show('字段名称已存在', 'warning'); return; }
    histSetColumnMeta(prev => ({ ...prev, [fid]: { ...prev[fid], name: trimmed } }));
    show(`重命名为：${trimmed}`, 'success');
  };

  const changeType = (fid: string, type: ColumnItem['type'], formatOrOptions?: any) => {
    if (!columnMeta[fid]) { show('字段不存在', 'warning'); return; }
    const normalizeType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t);
    const prevType = columnMeta[fid]?.type;
    const prevNorm = normalizeType(prevType);
    const nextNorm = normalizeType(type);
    const prevOptions = (columnMeta[fid]?.options ?? []) as SelectOption[];
    let nextOptions: SelectOption[] = prevOptions;
    histSetColumnMeta(prev => {
      const next = { ...prev } as Record<string, ColumnItem>;
      const meta: any = { ...next[fid], type };
      if (type === 'single' || type === 'multi') {
        meta.options = formatOrOptions?.options ?? next[fid]?.options ?? [];
        nextOptions = meta.options as SelectOption[];
      } else {
        if ('options' in meta) delete meta.options;
        nextOptions = [];
      }
      if (type === 'number') {
        meta.format = formatOrOptions?.format ?? next[fid]?.format ?? { decimals: 0, thousand: false };
      } else {
        if ('format' in meta) delete meta.format;
      }
      if (type === 'formula') {
        meta.formula = formatOrOptions?.formula ?? next[fid]?.formula ?? undefined;
      } else {
        if ('formula' in meta) delete meta.formula;
      }
      next[fid] = meta;
      return next;
    });
    // 选项删减清理：当 options 被删减时，移除数据中引用已删除选项的值
    if ((type === 'single' || type === 'multi') && prevOptions.length > 0) {
      const removedIds = new Set(prevOptions.filter((o) => !nextOptions.some((n) => n.id === o.id)).map((o) => o.id));
      if (removedIds.size > 0) {
        if (nextNorm === 'select') {
          histSetData(prev => prev.map(r => {
            const v: any = (r as any)[fid];
            if (v && removedIds.has(v.id)) {
              return { ...r, [fid]: null } as any;
            }
            return r;
          }));
        } else if (nextNorm === 'multiSelect') {
          histSetData(prev => prev.map(r => {
            const v: any = (r as any)[fid];
            if (Array.isArray(v) && v.length > 0) {
              const nv = v.filter((opt: SelectOption) => !removedIds.has(opt.id));
              if (nv.length !== v.length) {
                return { ...r, [fid]: nv } as any;
              }
            }
            return r;
          }));
        }
        show('选项删减：已清理无效选择', 'info');
      }
    }

    if (prevNorm !== nextNorm) {
      if (nextNorm !== 'formula') {
        const defaultValue = nextNorm === 'text' ? ''
          : nextNorm === 'number' ? 0
          : nextNorm === 'date' ? dayjs().toISOString()
          : nextNorm === 'select' ? null as any
          : nextNorm === 'multiSelect' ? [] as any
          : nextNorm === 'user' ? null as any
          : nextNorm === 'relation' ? null as any
          : '';
        histSetData(prev => prev.map(r => ({ ...r, [fid]: defaultValue })));
        show('类型切换：已根据新类型重置列值', 'info');
      } else {
        show('类型切换：公式列为只读，值由其他字段自动计算', 'info');
      }
    } else {
      show('字段已更新', 'success');
    }
    requestMeasure();
  };

  return { addField, removeField, renameField, changeType };
}