import { useMemo, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { ColumnDef, SortingState, VisibilityState, OnChangeFn } from '@tanstack/react-table';
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';


import type { RowRecord, SelectOption } from '../types';
import { getColWidth as getColWidthUtil, buildTemplateColumns, calcTotalWidth, computeStickyLeft as computeStickyLeftUtil } from './table/utils';
import { GridStateProvider, GridSurface, Cell } from './table';
import { useClipboard } from './table/hooks/useClipboard';
import { useSelection } from './table/hooks/useSelection';
import { useColumnResize } from './table/hooks/useColumnResize';
import { useSelectionEditing } from '../hooks/useSelectionEditing';
// import of keyboard/scroll hooks is no longer needed here; they are used inside GridSurface


type ColumnMeta = Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; }> & Record<string, any>;

type Props = {
  rows: RowRecord[];
  columnMeta: ColumnMeta;
  columnOrder: string[];
  columnVisibility: VisibilityState;
  sorting: SortingState;
  setSorting: (updater: SortingState | ((prev: SortingState) => SortingState)) => void;
  setColumnVisibility: OnChangeFn<VisibilityState>;
  setColumnOrder: (updater: string[] | ((prev: string[]) => string[])) => void;
  setData: (updater: RowRecord[] | ((prev: RowRecord[]) => RowRecord[])) => void;
  setColumnMeta: (updater: ColumnMeta | ((prev: ColumnMeta) => ColumnMeta)) => void;
  rowHeight: 'low' | 'medium' | 'high' | 'xhigh';
  freezeCount: number;
  onFreezeTo: (n: number) => void;
  colWidth: number;
  colWidths: Record<string, number>;
  setColWidths: (updater: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  defaultSelectOptions?: SelectOption[];
  getCellBg: (row: RowRecord, columnId: string) => string | undefined;
  selectedCell: { rowId: string | null; columnId: string | null };
  editingCell: { rowId: string | null; columnId: string | null };
  setSelectedCell: (sel: { rowId: string | null; columnId: string | null }) => void;
  setEditingCell: (sel: { rowId: string | null; columnId: string | null }) => void;
  onEditField: (id: string) => void;
  onHideField: (id: string) => void;
  onDeleteField: (id: string) => void;
  onInsertLeft: (id: string) => void;
  onInsertRight: (id: string) => void;
  onDuplicateField: (id: string) => void;
  onFillColorColumn: (id: string, color: string) => void;
  onCreateField: () => void;
};

export type DataTableHandle = { measure: () => void };

const DataTable = forwardRef<DataTableHandle, Props>(({ 
  rows,
  columnMeta,
  columnOrder,
  columnVisibility,
  sorting,
  setSorting,
  setColumnVisibility,
  setColumnOrder,
  setData,
  setColumnMeta,
  rowHeight,
  freezeCount,
  onFreezeTo,
  colWidth,
  colWidths,
  setColWidths,
  defaultSelectOptions,
  getCellBg,
  selectedCell,
  editingCell,
  setSelectedCell,
  setEditingCell,
  onEditField,
  onHideField,
  onDeleteField,
  onInsertLeft,
  onInsertRight,
  onDuplicateField,
  onFillColorColumn,
  onCreateField,
}, ref) => {
  const columns = useMemo<ColumnDef<RowRecord, any>[]>(() => {
    const normalizeType = (t: string) => (t === 'single' ? 'select' : t === 'multi' ? 'multiSelect' : t);
    const makeDef = (id: string): ColumnDef<RowRecord, any> | null => {
      const meta = columnMeta[id];
      if (!meta || columnVisibility[id] === false) return null;
      const editorType = normalizeType(meta.type);
      return {
        id,
        header: () => meta.name,
        accessorKey: id,
        cell: ({ row, getValue }) => (
          <Cell
            row={row}
            columnId={id}
            editorType={editorType as any}
            value={getValue()}
            options={(editorType === 'select' || editorType === 'multiSelect') ? (columnMeta[id]?.options ?? defaultSelectOptions ?? []) : undefined}
            setData={setData}
          />
        ),
      } as ColumnDef<RowRecord, any>;
    };
    return columnOrder.map((id) => makeDef(id)).filter(Boolean) as ColumnDef<RowRecord, any>[];
  }, [columnMeta, columnOrder, columnVisibility, setData, defaultSelectOptions]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility, columnOrder },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef<HTMLDivElement | null>(null);
  // 绑定到 window 滚动，让页面滚动控制数据表垂直滚动
  const rowVirtualizer = useWindowVirtualizer({
    count: table.getRowModel().rows.length,
    estimateSize: () => ({ low: 28, medium: 40, high: 56, xhigh: 72 }[rowHeight]),
    overscan: 10,
  });

  // 页面尺寸变化时，触发虚拟列表重新测量，保证滚动条与内容高度/宽度自适应
  useEffect(() => {
    const onResize = () => { try { rowVirtualizer.measure(); } catch {} };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    try { ro.observe(document.documentElement); } catch {}

  return () => {
      window.removeEventListener('resize', onResize);
      try { ro.disconnect(); } catch {}
    };
  }, [rowVirtualizer]);

  useImperativeHandle(ref, () => ({
    measure: () => { try { rowVirtualizer.measure(); } catch {} },
  }), [rowVirtualizer]);

  // 行号列宽与每列宽度（可拖拽调整）
const [indexColWidth] = useState<number>(26);
  const getColWidth = (cid: string) => getColWidthUtil(colWidths, colWidth, cid);
  // 统一使用来自 props 的顺序与可见性，避免错位
  const headerIds = useMemo(() => (
    columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false)
  ), [columnOrder, columnMeta, columnVisibility]);
  const totalWidth = useMemo(() => (
    calcTotalWidth(indexColWidth, headerIds, colWidths, colWidth, colWidth)
  ), [indexColWidth, headerIds, colWidths, colWidth]);
  const templateColumns = useMemo(() => (
    buildTemplateColumns(indexColWidth, headerIds, colWidths, colWidth)
  ), [indexColWidth, headerIds, colWidths, colWidth]);
  const computeStickyLeft = (idx: number) => computeStickyLeftUtil(indexColWidth, headerIds, colWidths, colWidth, idx);
  // 新增字段：自动加入列顺序并设为可见
  useEffect(() => {
    const idsInMeta = Object.keys(columnMeta || {});
    const setKnown = new Set(columnOrder);
    const toAdd = idsInMeta.filter((id) => !setKnown.has(id));
    if (toAdd.length > 0) {
      setColumnOrder((prev) => [...prev, ...toAdd]);
    }
    // 默认可见
    if (toAdd.length > 0) {
      const nextVis = { ...columnVisibility } as any;
      let changed = false;
      toAdd.forEach((id) => {
        if (nextVis[id] === undefined) { nextVis[id] = true; changed = true; }
      });
      if (changed) { try { setColumnVisibility(nextVis); } catch {} }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnMeta]);
  // 列宽改为受控，由 App 负责持久化到视图配置

  // 列宽拖拽逻辑（抽离为 hook）
  const { hoverResizeCid, setHoverResizeCid, startResize } = useColumnResize(getColWidth, setColWidths);
  const [headerSelectedCid, setHeaderSelectedCid] = useState<string | null>(null);



  // 首行粘贴表头识别弹窗状态






  

  const { isDragging, setIsDragging, selectionRange, setSelectionRange, isInRange } = useSelection();
  const { onCopyKey, /* onFillKey */ handlePaste, headerPrompt, setHeaderPrompt, copyToast, applyPaste } = useClipboard({ table, columnMeta, columnOrder, columnVisibility, selectedCell, selectionRange, setColumnMeta, setColumnOrder, setColumnVisibility, setData });
  const { onFillKey } = useSelectionEditing({ selectedCell, columnMeta, setData, table, selectionRange, columnOrder, columnVisibility });
  // Inline GridSurface removed; using external component from './table/GridSurface'


  return (
    <div data-app-ready="1">
      <GridStateProvider value={{ selectedCell, editingCell, setSelectedCell, setEditingCell, selectionRange, setSelectionRange, isDragging, setIsDragging, isInRange, headerSelectedCid, setHeaderSelectedCid, focusGrid: () => parentRef.current?.focus() }}>
        <GridSurface
          parentRef={parentRef}
          table={table}
          columns={columns}
          onCopyKey={onCopyKey}
          onFillKey={onFillKey}
          headerIds={headerIds}
          freezeCount={freezeCount}
          templateColumns={templateColumns}
          totalWidth={totalWidth}
          indexColWidth={indexColWidth}
          getColWidth={getColWidth}
          computeStickyLeft={(idx) => computeStickyLeft(idx)}
          columnMeta={columnMeta}
          columnOrder={columnOrder}
          columnVisibility={columnVisibility}
          sorting={sorting}
          setSorting={setSorting}
          setColumnOrder={setColumnOrder}
          onFreezeTo={onFreezeTo}
          onEditField={onEditField}
          onHideField={onHideField}
          onDeleteField={onDeleteField}
          onInsertLeft={onInsertLeft}
          onInsertRight={onInsertRight}
          onDuplicateField={onDuplicateField}
          onFillColorColumn={onFillColorColumn}
          hoverResizeCid={hoverResizeCid}
          setHoverResizeCid={setHoverResizeCid}
          startResize={startResize}
          onCreateField={onCreateField}
          rowVirtualizer={rowVirtualizer}
          getCellBg={getCellBg}
          onPaste={handlePaste}
        />
      </GridStateProvider>
      {copyToast.show && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999, background: '#111', color: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.25)', fontSize: 13 }}>
          已复制 {copyToast.count} 个单元格
        </div>
      )}
      {headerPrompt.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, minWidth: 360, maxWidth: 520, boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontSize: 16, fontWeight: 600 }}>粘贴选项</div>
            <div style={{ padding: '20px', fontSize: 14, color: '#333' }}>是否将首行识别为表头</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 20px' }}>
              <button onClick={() => { if (headerPrompt.matrix) applyPaste(headerPrompt.matrix, headerPrompt.anchorRowIndex, headerPrompt.anchorColIndex, false); setHeaderPrompt({ show: false, matrix: null, anchorRowIndex: 0, anchorColIndex: 0 }); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>直接粘贴</button>
              <button onClick={() => { if (headerPrompt.matrix) applyPaste(headerPrompt.matrix, headerPrompt.anchorRowIndex, headerPrompt.anchorColIndex, true); setHeaderPrompt({ show: false, matrix: null, anchorRowIndex: 0, anchorColIndex: 0 }); }} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1f6feb', color: '#fff', cursor: 'pointer' }}>识别为表头</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DataTable;