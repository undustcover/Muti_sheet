import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { RowRecord } from '../types';
import type { ConditionGroup, ColorRule } from '../stores/colorRules';
import { useFilterGroup } from './useFilterGroup';
import { useViewConfig, type StatsAgg } from './useViewConfig';
import { useViewQuery } from './useViewQuery';

export function useViews(params: {
  // base data & meta
  data: RowRecord[];
  columnMeta: Record<string, { type: string; name?: string }>;
  logicColumnMeta: Record<string, { type: string }>; // mapped for logic/matchesGroup

  // view id
  activeViewId: string;

  // view-scoped states
  sorting: any;
  freezeCount: number;
  columnVisibility: Record<string, boolean | undefined>;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  rowHeight: 'low' | 'medium' | 'high' | 'xhigh';
  // color states
  columnColors: Record<string, string>;
  colorRules: ColorRule[];

  // setters for applying view config
  setSorting: (s: any) => void;
  setFreezeCount: (n: number) => void;
  setColumnVisibility: (u: (prev: Record<string, boolean | undefined>) => Record<string, boolean | undefined>) => void;
  setColumnOrder: (o: string[]) => void;
  setColumnWidths: (w: Record<string, number>) => void;
  setRowHeight: (h: 'low' | 'medium' | 'high' | 'xhigh') => void;
  setColumnColors: (u: (prev: Record<string, string>) => Record<string, string>) => void;
  setColorRules: (rules: ColorRule[]) => void;

  // UI feedback
  show: (msg: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const {
    data,
    columnMeta,
    logicColumnMeta,
    activeViewId,
    sorting,
    freezeCount,
    columnVisibility,
    columnOrder,
    columnWidths,
    rowHeight,
    columnColors,
    colorRules,
    setSorting,
    setFreezeCount,
    setColumnVisibility,
    setColumnOrder,
    setColumnWidths,
    setRowHeight,
    setColumnColors,
    setColorRules,
    show,
  } = params;

  // 过滤条件（支持条件组）
  const { activeGroup, setActiveGroup, filteredByGroup, applyGroup, clearGroup } = useFilterGroup({
    data,
    columnMeta: logicColumnMeta,
  });

  // 视图级配置应用与持久化
  const { viewConfigMap, updateStatsAgg } = useViewConfig({
    activeViewId,
    sorting,
    freezeCount,
    columnVisibility,
    filterGroup: activeGroup,
    columnOrder,
    columnWidths,
    rowHeight,
    columnMeta,
    columnColors,
    colorRules,
    setSorting,
    setFreezeCount,
    setColumnVisibility,
    setFilterGroup: setActiveGroup,
    setColumnOrder,
    setColumnWidths,
    setRowHeight,
    setColumnColors,
    setColorRules,
  });

  // 视图查询
  const { activeQuery, applyQuery, queryFocusTick, queryOpen, openQuery, closeQuery } = useViewQuery({
    data,
    columnMeta,
    activeViewId,
    show,
  });

  // 合并过滤 + 查询
  const filteredData = useMemo(() => {
    const base = filteredByGroup;
    if (!activeQuery) return base;
    return base.filter((r) => {
      const vals = Object.keys(columnMeta)
        .filter((cid) => cid !== 'id')
        .map((cid) => (r as any)[cid]);
      return vals.some((v) => {
        if (v == null) return false;
        if (typeof v === 'object') {
          const label = (v as any).label ?? (v as any).name ?? '';
          return String(label) === activeQuery;
        }
        if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v)) {
          const d = dayjs(v);
          const iso = d.isValid() ? d.toISOString() : v;
          const short = d.isValid() ? d.format('YYYY-MM-DD') : v;
          return activeQuery === iso || activeQuery === short || activeQuery === v;
        }
        return String(v) === activeQuery;
      });
    });
  }, [filteredByGroup, activeQuery, columnMeta]);

  return {
    // filter group
    activeGroup,
    setActiveGroup,
    filteredByGroup, // raw filtered by group
    applyGroup,
    clearGroup,

    // view config map & helpers
    viewConfigMap,
    updateStatsAgg,

    // query
    activeQuery,
    applyQuery,
    queryFocusTick,
    queryOpen,
    openQuery,
    closeQuery,

    // final data
    filteredData,
  } as const;
}