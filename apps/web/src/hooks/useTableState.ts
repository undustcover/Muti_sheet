import { useEffect, useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import type { RowRecord, SelectOption, FormulaConfig, NumberFormat } from '../types';
import { apiListRecords } from '../services/records';
import { apiListFields, mapBackendTypeToUI } from '../services/fields';

export type TableState = {
  data: RowRecord[];
  columnMeta: Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; formula?: FormulaConfig; format?: NumberFormat }>;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  sorting: SortingState;
  backendLoaded: boolean;
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
      backendLoaded: false,
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

  // 当切换到新的表 ID 时，初始化其默认结构与数据，并尝试后端拉取
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
          backendLoaded: false,
        },
      };
    });
  }, [activeTableId, generateRows, initialColumnMeta]);

  // 后端拉取：每次切换或首次渲染都尝试从服务端读取数据
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // 本地示例表（如 "tbl-1" 或 "tbl-import-<timestamp>") 不应访问后端。
      // 这些 ID 以 "tbl-" 开头，属于前端临时数据，直接跳过后端自举与拉取逻辑。
      if (activeTableId.startsWith('tbl-')) {
        return;
      }
      try {
        // 先拉取字段列表，若为空则进行“空表自举”：创建序号/文本/时间三字段
        let fields = await apiListFields(activeTableId);
        if (!cancelled && Array.isArray(fields) && fields.length > 0) {
          setTables(prev => {
            const id = activeTableId in prev ? activeTableId : initialTableId;
            const curr = prev[id];
            const nextMeta = Object.fromEntries(fields.map((f: any) => [
              f.id,
              {
                name: f.name,
                type: mapBackendTypeToUI(f.type as any),
                // 将后端 config 映射到前端列元数据
                options: f?.config?.options ?? undefined,
                formula: f?.config?.formula ?? undefined,
                format: f?.config?.format ?? undefined,
              },
            ]));
            const nextOrder = fields.map(f => f.id);
            return { ...prev, [id]: { ...curr, columnMeta: nextMeta as any, columnOrder: nextOrder } };
          });
        } else if (!cancelled) {
          try {
            const mod = await import('../services/fields');
            await mod.apiCreateField(activeTableId, { name: '序号', type: 'NUMBER', order: 1, visible: true });
            await mod.apiCreateField(activeTableId, { name: '文本', type: 'TEXT', order: 2, visible: true });
            await mod.apiCreateField(activeTableId, { name: '时间', type: 'DATE', order: 3, visible: true });
            fields = await apiListFields(activeTableId);
            if (!cancelled && Array.isArray(fields) && fields.length > 0) {
              setTables(prev => {
                const id = activeTableId in prev ? activeTableId : initialTableId;
                const curr = prev[id];
                const nextMeta = Object.fromEntries(fields.map((f: any) => [
                  f.id,
                  {
                    name: f.name,
                    type: mapBackendTypeToUI(f.type as any),
                    options: f?.config?.options ?? undefined,
                    formula: f?.config?.formula ?? undefined,
                    format: f?.config?.format ?? undefined,
                  },
                ]));
                const nextOrder = fields.map(f => f.id);
                return { ...prev, [id]: { ...curr, columnMeta: nextMeta as any, columnOrder: nextOrder } };
              });
            }
          } catch {}
        }

        // 拉取记录；若为空则插入15条默认记录后再拉取
        let list = await apiListRecords(activeTableId, { page: 1, pageSize: 200 });
        if (!cancelled) {
          setTables(prev => {
            const id = activeTableId in prev ? activeTableId : initialTableId;
            const curr = prev[id];
            const rows: RowRecord[] = Array.isArray(list.items) ? list.items.map((it: any) => ({ ...it })) : [];
            return { ...prev, [id]: { ...curr, data: rows, backendLoaded: true } };
          });
        }

        if (!cancelled && Array.isArray(list.items) && list.items.length === 0) {
          try {
            const { apiBatchRecords } = await import('../services/records');
            // 使用后端字段ID写入默认行，避免写入失败
            const nameToId = new Map((fields || []).map((f: any) => [f.name, f.id]));
            const seqId = nameToId.get('序号');
            const textId = nameToId.get('文本');
            const timeId = nameToId.get('时间');
            const isDefaultSchema = Array.isArray(fields) && fields.length === 3 && seqId && textId && timeId;
            if (isDefaultSchema) {
              const createPayload = Array.from({ length: 15 }).map((_, i) => ({
                data: {
                  [seqId as string]: i + 1,
                  [textId as string]: '',
                  [timeId as string]: null,
                },
              }));
              await apiBatchRecords(activeTableId, { create: createPayload });
            }
          } catch {}
          if (!cancelled) {
            list = await apiListRecords(activeTableId, { page: 1, pageSize: 200 });
            setTables(prev => {
              const id = activeTableId in prev ? activeTableId : initialTableId;
              const curr = prev[id];
              const rows: RowRecord[] = Array.isArray(list.items) ? list.items.map((it: any) => ({ ...it })) : [];
              return { ...prev, [id]: { ...curr, data: rows, backendLoaded: true } };
            });
          }
        }
      } catch (e) {
        // 若拉取失败（如权限或网络），保留现有示例数据，不破坏交互
        // 可在上层展示错误提示
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [activeTableId, initialTableId]);

  return {
    activeTableId,
    setActiveTableId,
    tables,
    data,
    columnMeta,
    columnOrder,
    columnVisibility,
    sorting,
    backendLoaded: currentTable.backendLoaded,
    setData,
    setColumnMeta,
    setColumnOrder,
    setColumnVisibility,
    setSorting,
    createTable,
  } as const;
}