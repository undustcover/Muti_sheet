import { useEffect, useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import type { RowRecord, SelectOption, FormulaConfig, NumberFormat } from '../types';

export type TableState = {
  data: RowRecord[];
  columnMeta: Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: NumberFormat }>;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  sorting: SortingState;
};

type UseTableStateParams = {
  initialTableId?: string;
  initialColumnMeta: Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: NumberFormat }>;
  generateRows: (count: number) => RowRecord[];
  initialRowCount?: number;
};

export function useTableState(params: UseTableStateParams) {
  const {
    initialTableId = 'tbl-1',
    initialColumnMeta,
    generateRows,
    initialRowCount = 200,
  } = params;

  const [activeTableId, setActiveTableId] = useState<string>(initialTableId);
  const [tables, setTables] = useState<Record<string, TableState>>(() => ({
    [initialTableId]: {
      data: generateRows(initialRowCount),
      columnMeta: initialColumnMeta,
      columnOrder: Object.keys(initialColumnMeta),
      columnVisibility: {},
      sorting: [],
    },
  }));

  const currentTable: TableState = tables[activeTableId] ?? tables[initialTableId];
  const data = currentTable.data;
  const columnMeta = currentTable.columnMeta;
  const columnOrder = currentTable.columnOrder;
  const columnVisibility = currentTable.columnVisibility;
  const sorting = currentTable.sorting;

  // 包装器：以当前 activeTableId 更新表级状态
  const setData = (updater: React.SetStateAction<RowRecord[]>) => {
    setTables(prev => {
      const id = activeTableId in prev ? activeTableId : initialTableId;
      const curr = prev[id];
      const nextData = typeof updater === 'function' ? (updater as (d: RowRecord[]) => RowRecord[])(curr.data) : updater;
      return { ...prev, [id]: { ...curr, data: nextData } };
    });
  };
  const setColumnMeta = (updater: React.SetStateAction<Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: NumberFormat }>>) => {
    setTables(prev => {
      const id = activeTableId in prev ? activeTableId : initialTableId;
      const curr = prev[id];
      const next = typeof updater === 'function' ? (updater as (m: typeof curr.columnMeta) => typeof curr.columnMeta)(curr.columnMeta) : updater;
      return { ...prev, [id]: { ...curr, columnMeta: next } };
    });
  };
  const setColumnOrder = (updater: React.SetStateAction<string[]>) => {
    setTables(prev => {
      const id = activeTableId in prev ? activeTableId : initialTableId;
      const curr = prev[id];
      const next = typeof updater === 'function' ? (updater as (o: string[]) => string[])(curr.columnOrder) : updater;
      return { ...prev, [id]: { ...curr, columnOrder: next } };
    });
  };
  const setColumnVisibility = (updater: React.SetStateAction<Record<string, boolean>>) => {
    setTables(prev => {
      const id = activeTableId in prev ? activeTableId : initialTableId;
      const curr = prev[id];
      const next = typeof updater === 'function' ? (updater as (v: Record<string, boolean>) => Record<string, boolean>)(curr.columnVisibility) : updater;
      return { ...prev, [id]: { ...curr, columnVisibility: next } };
    });
  };
  const setSorting = (updater: React.SetStateAction<SortingState>) => {
    setTables(prev => {
      const id = activeTableId in prev ? activeTableId : initialTableId;
      const curr = prev[id];
      const next = typeof updater === 'function' ? (updater as (s: SortingState) => SortingState)(curr.sorting) : updater;
      return { ...prev, [id]: { ...curr, sorting: next } };
    });
  };

  // 在不切换 activeTableId 的情况下，创建/覆盖某个表的结构与数据
  const createTable = (tableId: string, config: {
    columnMeta: Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: NumberFormat }>;
    data?: RowRecord[];
    columnOrder?: string[];
    columnVisibility?: Record<string, boolean>;
    sorting?: SortingState;
  }) => {
    setTables(prev => ({
      ...prev,
      [tableId]: {
        data: config.data ?? generateRows(initialRowCount),
        columnMeta: config.columnMeta,
        columnOrder: config.columnOrder ?? Object.keys(config.columnMeta),
        columnVisibility: config.columnVisibility ?? {},
        sorting: config.sorting ?? [],
      },
    }));
  };

  // 当切换到新的表 ID 时，初始化其默认结构与数据
  useEffect(() => {
    setTables(prev => {
      if (activeTableId in prev) return prev;
      return {
        ...prev,
        [activeTableId]: {
          data: generateRows(initialRowCount),
          columnMeta: initialColumnMeta,
          columnOrder: Object.keys(initialColumnMeta),
          columnVisibility: {},
          sorting: [],
        },
      };
    });
  }, [activeTableId, generateRows, initialColumnMeta]);

  return {
    activeTableId,
    setActiveTableId,
    tables,
    data,
    columnMeta,
    columnOrder,
    columnVisibility,
    sorting,
    setData,
    setColumnMeta,
    setColumnOrder,
    setColumnVisibility,
    setSorting,
    createTable,
  } as const;
}