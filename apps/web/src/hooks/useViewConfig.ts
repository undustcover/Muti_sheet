import { useEffect, useState } from 'react';
import type { ConditionGroup } from '../stores/colorRules';

export type StatsAgg = 'none' | 'total' | 'empty' | 'filled' | 'unique' | 'empty_pct' | 'filled_pct' | 'unique_pct';

export function useViewConfig(params: {
  // ids
  activeViewId: string;
  // current states to persist
  sorting: any;
  freezeCount: number;
  columnVisibility: Record<string, boolean | undefined>;
  filterGroup: ConditionGroup | null;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  rowHeight: 'low' | 'medium' | 'high' | 'xhigh';
  columnMeta: Record<string, { type: string; name?: string }>;
  // setters to apply when switching views
  setSorting: (s: any) => void;
  setFreezeCount: (n: number) => void;
  setColumnVisibility: (u: (prev: Record<string, boolean | undefined>) => Record<string, boolean | undefined>) => void;
  setFilterGroup: (g: ConditionGroup | null) => void;
  setColumnOrder: (o: string[]) => void;
  setColumnWidths: (w: Record<string, number>) => void;
  setRowHeight: (h: 'low' | 'medium' | 'high' | 'xhigh') => void;
}) {
  const {
    activeViewId,
    sorting,
    freezeCount,
    columnVisibility,
    filterGroup,
    columnOrder,
    columnWidths,
    rowHeight,
    columnMeta,
    setSorting,
    setFreezeCount,
    setColumnVisibility,
    setFilterGroup,
    setColumnOrder,
    setColumnWidths,
    setRowHeight,
  } = params;

  const [viewConfigMap, setViewConfigMap] = useState<Record<string, {
    sorting: any;
    freezeCount: number;
    columnVisibility: Record<string, boolean | undefined>;
    filterGroup: ConditionGroup | null;
    columnOrder?: string[];
    columnWidths?: Record<string, number>;
    rowHeight?: 'low' | 'medium' | 'high' | 'xhigh';
    statsAggByField?: Record<string, StatsAgg>;
  }>>({});

  // when active view changes, apply its config or initialize from current states
  useEffect(() => {
    const cfg = viewConfigMap[activeViewId];
    if (cfg) {
      setFreezeCount(cfg.freezeCount ?? freezeCount);
      setSorting(cfg.sorting ?? sorting);
      setColumnVisibility((prev) => ({ ...prev, ...cfg.columnVisibility, id: false }));
      setFilterGroup(cfg.filterGroup ?? null);
      if (cfg.columnOrder && cfg.columnOrder.length) setColumnOrder(cfg.columnOrder);
      setColumnWidths(cfg.columnWidths ?? {});
      if (cfg.rowHeight) setRowHeight(cfg.rowHeight);
    } else {
      setViewConfigMap((prev) => ({
        ...prev,
        [activeViewId]: {
          sorting,
          freezeCount,
          columnVisibility: { ...columnVisibility, id: false },
          filterGroup,
          columnOrder,
          columnWidths,
          rowHeight,
          statsAggByField: columnOrder.reduce((acc, colId) => {
            if (colId !== 'id' && columnVisibility[colId] !== false && columnMeta[colId]) {
              acc[colId] = 'none';
            }
            return acc;
          }, {} as Record<string, StatsAgg>),
        },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId]);

  // persist current states into the active view's config
  useEffect(() => {
    setViewConfigMap((prev) => ({
      ...prev,
      [activeViewId]: {
        sorting,
        freezeCount,
        columnVisibility: { ...columnVisibility, id: false },
        filterGroup,
        columnOrder,
        columnWidths,
        rowHeight,
        statsAggByField: prev[activeViewId]?.statsAggByField ?? {},
      },
    }));
  }, [sorting, freezeCount, columnVisibility, filterGroup, columnOrder, columnWidths, rowHeight, activeViewId]);

  const updateStatsAgg = (fieldId: string, agg: StatsAgg) => {
    setViewConfigMap((prev) => ({
      ...prev,
      [activeViewId]: {
        ...(prev[activeViewId] ?? {}),
        sorting,
        freezeCount,
        columnVisibility: { ...columnVisibility, id: false },
        filterGroup,
        columnOrder,
        columnWidths,
        rowHeight,
        statsAggByField: { ...(prev[activeViewId]?.statsAggByField ?? {}), [fieldId]: agg },
      },
    }));
  };

  return { viewConfigMap, updateStatsAgg } as const;
}