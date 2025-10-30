import React from 'react';
import type { RefObject, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import type { RowRecord } from '../../types';
import { Header, VirtualGrid } from '..';
import { useKeyboardGrid } from '../hooks/useKeyboardGrid';
import { useScrollSync } from '../hooks/useScrollSync';
import { useGridState } from '../context/GridStateContext';
import type { ColumnMeta, Virtualizer } from './types';

type Props<TData = RowRecord> = {
  parentRef: RefObject<HTMLDivElement | null>;
  table: any;
  columns: ColumnDef<TData, any>[];
  onCopyKey: (e: ReactKeyboardEvent<HTMLDivElement>) => boolean;
  onFillKey?: (e: ReactKeyboardEvent<HTMLDivElement>) => boolean;
  headerIds: string[];
  freezeCount: number;
  templateColumns: string;
  totalWidth: number;
  indexColWidth: number;
  getColWidth: (cid: string) => number;
  computeStickyLeft: (idx: number) => number;
  columnMeta: ColumnMeta;
  columnOrder: string[];
  columnVisibility: VisibilityState;
  sorting: SortingState;
  setSorting: (updater: SortingState | ((prev: SortingState) => SortingState)) => void;
  setColumnOrder: (updater: string[] | ((prev: string[]) => string[])) => void;
  onFreezeTo: (n: number) => void;
  onEditField: (id: string) => void;
  onHideField: (id: string) => void;
  onDeleteField: (id: string) => void;
  onInsertLeft: (id: string) => void;
  onInsertRight: (id: string) => void;
  onDuplicateField: (id: string) => void;
  onFillColorColumn: (id: string, color: string) => void;
  hoverResizeCid: string | null;
  setHoverResizeCid: (cid: string | null | ((prev: string | null) => string | null)) => void;
  startResize: (cid: string, startX: number) => void;
  onCreateField: () => void;
  rowVirtualizer: Virtualizer;
  getCellBg: (row: any, columnId: string) => string | undefined;
  onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
};

export default function GridSurface<TData = RowRecord>({
  parentRef,
  table,
  columns,
  onCopyKey,
  onFillKey,
  headerIds,
  freezeCount,
  templateColumns,
  totalWidth,
  indexColWidth,
  getColWidth,
  computeStickyLeft,
  columnMeta,
  columnOrder,
  columnVisibility,
  sorting,
  setSorting,
  setColumnOrder,
  onFreezeTo,
  onEditField,
  onHideField,
  onDeleteField,
  onInsertLeft,
  onInsertRight,
  onDuplicateField,
  onFillColorColumn,
  hoverResizeCid,
  setHoverResizeCid,
  startResize,
  onCreateField,
  rowVirtualizer,
  getCellBg,
  onPaste,
}: Props<TData>) {
  const { setHeaderSelectedCid, setSelectionRange, setIsDragging } = useGridState();
  const { onKeyDown } = useKeyboardGrid<TData>({ table, columns, onCopyKey, onFillKey });
  const { onScroll } = useScrollSync({ containerRef: parentRef });

  return (
    <div
      ref={parentRef}
      className="sheet-grid"
      style={{
        height: 'auto',
        position: 'relative',
        border: 'none',
        marginTop: 0
      }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onScroll={onScroll}
      onMouseDown={(e) => {
        const el = e.target as HTMLElement;
        const isHeaderCell = !!el.closest('.sheet-header-cell');
        const isDataCell = !!el.closest('.sheet-cell');
        if (!isHeaderCell && !isDataCell) {
          setHeaderSelectedCid(null);
          setSelectionRange({ start: null, end: null });
        }
      }}
      onMouseUp={() => { setIsDragging(false); }}
    >
      {/* 表头放入与数据同一滚动容器，并置顶粘性，避免双滚动条不同步 */}

      <Header
        table={table}
        headerIds={headerIds}
        freezeCount={freezeCount}
        templateColumns={templateColumns}
        totalWidth={totalWidth}
        indexColWidth={indexColWidth}
        getColWidth={getColWidth}
        computeStickyLeft={computeStickyLeft}
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
      />

      <VirtualGrid
        virtualItems={rowVirtualizer.getVirtualItems()}
        rows={table.getRowModel().rows}
        templateColumns={templateColumns}
        totalWidth={totalWidth}
        totalSize={rowVirtualizer.getTotalSize()}
        headerIds={headerIds}
        freezeCount={freezeCount}
        indexColWidth={indexColWidth}
        computeStickyLeft={(idx) => computeStickyLeft(idx)}
        getColWidth={getColWidth}
        getCellBg={getCellBg}
        hoverResizeCid={hoverResizeCid}
      />
    </div>
  );
}