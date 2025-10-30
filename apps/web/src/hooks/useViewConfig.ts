import { useEffect, useState } from 'react';
import type { ConditionGroup, ColorRule } from '../stores/colorRules';
import {
  type ViewKind,
  type GridConfig,
  type QueryConfig,
  type KanbanConfig,
  type CalendarConfig,
  type ViewConfig,
  getView,
  upsertView,
  listViews,
} from '../services/viewsStore';

export type StatsAgg = 'none' | 'total' | 'empty' | 'filled' | 'unique' | 'empty_pct' | 'filled_pct' | 'unique_pct';

export function useViewConfig(params: {
  // ids
  tableId: string;
  activeViewId: string;
  // current states to persist (GridConfig)
  sorting: any;
  freezeCount: number;
  columnVisibility: Record<string, boolean | undefined>;
  filterGroup: ConditionGroup | null;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  rowHeight: 'low' | 'medium' | 'high' | 'xhigh';
  columnMeta: Record<string, { type: string; name?: string; options?: { id: string; label: string }[] }>;
  // color related
  columnColors: Record<string, string>;
  colorRules: ColorRule[];
  // setters to apply when switching views
  setSorting: (s: any) => void;
  setFreezeCount: (n: number) => void;
  setColumnVisibility: (u: (prev: Record<string, boolean | undefined>) => Record<string, boolean | undefined>) => void;
  setFilterGroup: (g: ConditionGroup | null) => void;
  setColumnOrder: (o: string[]) => void;
  setColumnWidths: (w: Record<string, number>) => void;
  setRowHeight: (h: 'low' | 'medium' | 'high' | 'xhigh') => void;
  setColumnColors: (u: (prev: Record<string, string>) => Record<string, string>) => void;
  setColorRules: (rules: ColorRule[]) => void;
}) {
  const {
    tableId,
    activeViewId,
    sorting,
    freezeCount,
    columnVisibility,
    filterGroup,
    columnOrder,
    columnWidths,
    rowHeight,
    columnMeta,
    columnColors,
    colorRules,
    setSorting,
    setFreezeCount,
    setColumnVisibility,
    setFilterGroup,
    setColumnOrder,
    setColumnWidths,
    setRowHeight,
    setColumnColors,
    setColorRules,
  } = params;

  const [viewConfigMap, setViewConfigMap] = useState<Record<string, (GridConfig & {
    filterGroup?: ConditionGroup | null;
    statsAggByField?: Record<string, StatsAgg>;
  })>>({});
  const [viewKindMap, setViewKindMap] = useState<Record<string, ViewKind>>({});
  const [kanbanGroupFieldId, setKanbanGroupFieldId] = useState<string | null>(null);
  const [calendarFields, setCalendarFieldsState] = useState<{ startDateFieldId: string | null; endDateFieldId?: string | null }>({ startDateFieldId: null, endDateFieldId: null });

  // when active view changes, apply its config or initialize from current states
  useEffect(() => {
    // load from persisted store; initialize if not exists
    const persisted = getView(tableId, activeViewId);
    if (persisted) {
      const cfg = persisted.config as GridConfig | QueryConfig | KanbanConfig | CalendarConfig;
      const kind = persisted.kind;
      setViewKindMap((prev) => ({ ...prev, [activeViewId]: kind }));
      // apply grid-like config when present
      const grid = cfg as GridConfig;
      setFreezeCount(grid.freezeCount ?? freezeCount);
      setSorting(grid.sorting ?? sorting);
      setColumnVisibility((prev) => ({ ...prev, ...(grid.columnVisibility ?? {}), id: false }));
      setFilterGroup(((cfg as any).filterGroup ?? null) as ConditionGroup | null);
      if (grid.columnOrder && grid.columnOrder.length) setColumnOrder(grid.columnOrder);
      setColumnWidths(grid.columnWidths ?? {});
      if (grid.rowHeight) setRowHeight(grid.rowHeight);
      if (grid.columnColors) setColumnColors(() => ({ ...grid.columnColors }));
      if (grid.colorRules) setColorRules(grid.colorRules as any);
      // specialized
      if (kind === 'kanban') {
        setKanbanGroupFieldId((cfg as KanbanConfig).groupFieldId ?? null);
      } else if (kind === 'calendar') {
        setCalendarFieldsState({
          startDateFieldId: (cfg as CalendarConfig).startDateFieldId ?? null,
          endDateFieldId: (cfg as CalendarConfig).endDateFieldId ?? null,
        });
      } else {
        // default: no-op
      }
      // mirror to local map for quick access (stats agg)
      setViewConfigMap((prev) => ({
        ...prev,
        [activeViewId]: {
          sorting: grid.sorting,
          freezeCount: grid.freezeCount ?? 0,
          columnVisibility: { ...(grid.columnVisibility ?? {}), id: false },
          filterGroup: ((cfg as any).filterGroup ?? null) as ConditionGroup | null,
          columnOrder: grid.columnOrder ?? columnOrder,
          columnWidths: grid.columnWidths ?? {},
          rowHeight: grid.rowHeight ?? rowHeight,
          statsAggByField: (grid.statsAggByField as any) ?? {},
          columnColors: grid.columnColors,
          colorRules: grid.colorRules as any,
        },
      }));
    } else {
      // initialize default grid config and persist
      const defaultGrid: GridConfig & { statsAggByField: Record<string, StatsAgg> } = {
        sorting,
        freezeCount,
        columnVisibility: { ...columnVisibility, id: false },
        columnOrder,
        columnWidths,
        rowHeight,
        statsAggByField: columnOrder.reduce((acc, colId) => {
          if (colId !== 'id' && columnVisibility[colId] !== false && columnMeta[colId]) {
            acc[colId] = 'none';
          }
          return acc;
        }, {} as Record<string, StatsAgg>),
        columnColors: { ...columnColors },
        colorRules: [...colorRules],
      };
      const view: ViewConfig = {
        id: activeViewId,
        tableId,
        name: activeViewId,
        kind: viewKindMap[activeViewId] ?? 'table',
        config: defaultGrid,
      };
      upsertView(tableId, view);
      setViewKindMap((prev) => ({ ...prev, [activeViewId]: view.kind }));
      setViewConfigMap((prev) => ({ ...prev, [activeViewId]: defaultGrid }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId, tableId]);

  // persist current states into the active view's config
  useEffect(() => {
    // mirror to local map
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
        columnColors: { ...columnColors },
        colorRules: [...colorRules],
      },
    }));
    // persist to store (grid-like)
    const persisted = getView(tableId, activeViewId);
    const nextGrid: GridConfig = {
      sorting,
      freezeCount,
      columnVisibility: { ...columnVisibility, id: false },
      columnOrder,
      columnWidths,
      rowHeight,
      statsAggByField: persisted?.config && (persisted.config as any).statsAggByField ? (persisted.config as any).statsAggByField : ({} as Record<string, string>),
      columnColors: { ...columnColors },
      colorRules: [...colorRules],
    };
    const view: ViewConfig = {
      id: activeViewId,
      tableId,
      name: persisted?.name ?? activeViewId,
      kind: persisted?.kind ?? (viewKindMap[activeViewId] ?? 'table'),
      config: {
        ...nextGrid,
        filterGroup,
      } as any,
    };
    upsertView(tableId, view);
  }, [sorting, freezeCount, columnVisibility, filterGroup, columnOrder, columnWidths, rowHeight, columnColors, colorRules, activeViewId, tableId]);

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
    const persisted = getView(tableId, activeViewId);
    const nextGrid: GridConfig = {
      ...(persisted?.config as GridConfig),
      statsAggByField: { ...(((persisted?.config as any)?.statsAggByField ?? {}) as Record<string, string>), [fieldId]: agg },
    };
    const view: ViewConfig = {
      id: activeViewId,
      tableId,
      name: persisted?.name ?? activeViewId,
      kind: persisted?.kind ?? (viewKindMap[activeViewId] ?? 'table'),
      config: {
        ...nextGrid,
        filterGroup,
      } as any,
    };
    upsertView(tableId, view);
  };

  const setViewKind = (kind: ViewKind) => {
    setViewKindMap((prev) => ({ ...prev, [activeViewId]: kind }));
    const persisted = getView(tableId, activeViewId);
    const view: ViewConfig = {
      id: activeViewId,
      tableId,
      name: persisted?.name ?? activeViewId,
      kind,
      config: persisted?.config ?? (viewConfigMap[activeViewId] as GridConfig),
    };
    upsertView(tableId, view);
  };

  const setKanbanGroupField = (fieldId: string) => {
    setViewKind('kanban');
    setKanbanGroupFieldId(fieldId);
    const persisted = getView(tableId, activeViewId);
    const view: ViewConfig = {
      id: activeViewId,
      tableId,
      name: persisted?.name ?? activeViewId,
      kind: 'kanban',
      config: { groupFieldId: fieldId } as KanbanConfig,
    };
    upsertView(tableId, view);
  };

  const setCalendarFields = (startId: string | null, endId?: string | null) => {
    setViewKind('calendar');
    setCalendarFieldsState({ startDateFieldId: startId, endDateFieldId: endId ?? null });
    const persisted = getView(tableId, activeViewId);
    const view: ViewConfig = {
      id: activeViewId,
      tableId,
      name: persisted?.name ?? activeViewId,
      kind: 'calendar',
      config: { startDateFieldId: startId ?? '', endDateFieldId: endId ?? undefined } as CalendarConfig,
    };
    upsertView(tableId, view);
  };

  return {
    viewConfigMap,
    updateStatsAgg,
    viewKind: viewKindMap[activeViewId] ?? 'table',
    setViewKind,
    kanbanGroupFieldId,
    setKanbanGroupField,
    calendarFields,
    setCalendarFields,
  } as const;
}