import { flexRender } from '@tanstack/react-table';
import { useGridState, type SelectionRange } from './context/GridStateContext';

type Props = {
  row: any;
  rowIndex: number;
  headerIds: string[];
  freezeCount: number;
  indexColWidth: number;
  computeStickyLeft: (idx: number) => number;
  getColWidth: (cid: string) => number;
  getCellBg: (row: any, columnId: string) => string | undefined;

  hoverResizeCid: string | null;
};

export default function Row({
  row,
  rowIndex,
  headerIds,
  freezeCount,
  indexColWidth,
  computeStickyLeft,
  getColWidth,
  getCellBg,
  hoverResizeCid,
}: Props) {
  const { selectedCell, editingCell, setSelectedCell, setEditingCell, isDragging, setIsDragging, isInRange, setSelectionRange, headerSelectedCid, setHeaderSelectedCid, focusGrid } = useGridState();

  const cellMap = new Map<string, any>();
  row.getVisibleCells()
    .filter((cell: any) => cell && cell.column && (cell.column as any).id)
    .forEach((cell: any) => { cellMap.set((cell.column as any).id as string, cell); });

  const rowId = (row.original as any)?.id ?? row.id;

  return (
    <>
      {/* Index column (non-interactive) */}
      <div
        className="sheet-cell frozen"
        style={{
          position: 'sticky',
          left: 0,
          zIndex: 4,
          background: '#fff',
          color: '#999',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 4px',
          width: `${indexColWidth}px`,
          borderRight: '1px solid #eee',
          boxSizing: 'border-box'
        }}
      >{rowIndex + 1}</div>

      {headerIds.map((colId, cIdx) => {
        const cell = cellMap.get(colId);
        if (!cell) return null;
        const isSelected = (selectedCell.rowId === rowId && selectedCell.columnId === colId);
        return (
          <div
            key={(cell as any).id ?? `${row.id}-${cIdx}`}
            className={`sheet-cell${cIdx < freezeCount ? ' frozen' : ''}${cIdx === freezeCount - 1 ? ' frozen-shadow' : ''}${isSelected ? ' is-selected' : ''}${isInRange(rowIndex, cIdx) ? ' is-range' : ''}`}
            style={{
              position: (cIdx < freezeCount) ? 'sticky' : 'static',
              left: (cIdx < freezeCount) ? `${computeStickyLeft(cIdx)}px` : undefined,
              zIndex: (cIdx < freezeCount) ? 3 : 1,
              background: (headerSelectedCid === colId)
                ? 'rgba(31, 111, 235, 0.10)'
                : ((cIdx < freezeCount) ? '#fff' : getCellBg(row.original, colId)),
              borderRight: `1px solid ${hoverResizeCid === colId ? '#1f6feb' : '#eee'}`,
              borderBottom: '1px solid #eee',
              width: `${getColWidth(colId)}px`,
              boxSizing: 'border-box',
              outline: undefined,
              userSelect: 'none',
            }}
            onClick={() => {
              const isEditingThis = editingCell.rowId === rowId && editingCell.columnId === colId;
              if (isEditingThis) return;
              setSelectedCell({ rowId, columnId: colId });
              setEditingCell({ rowId: null, columnId: null });
              setHeaderSelectedCid(null);
              setSelectionRange({ start: null, end: null });
              focusGrid();
            }}
            onDoubleClickCapture={() => {
              setSelectedCell({ rowId, columnId: colId });
              setEditingCell({ rowId, columnId: colId });
            }}
            onDoubleClick={() => {
              setSelectedCell({ rowId, columnId: colId });
              setEditingCell({ rowId, columnId: colId });
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              // 若是双击序列中的第二次按下（detail === 2），优先进入编辑并阻止后续拖选逻辑
              const detail = (e as unknown as { detail?: number }).detail ?? 1;
              if (detail >= 2) {
                e.preventDefault();
                e.stopPropagation();
                setSelectedCell({ rowId, columnId: colId });
                setEditingCell({ rowId, columnId: colId });
                setIsDragging(false);
                setSelectionRange({ start: null, end: null });
                return;
              }
              // 单击则进入选择（不编辑），并启动拖选
              setIsDragging(true);
              setSelectionRange({ start: { row: rowIndex, col: cIdx }, end: { row: rowIndex, col: cIdx } });
              setSelectedCell({ rowId, columnId: colId });
              setEditingCell({ rowId: null, columnId: null });
            }}
            onMouseEnter={() => {
              if (!isDragging) return;
              setSelectionRange((prev: SelectionRange) => ({ start: prev.start, end: { row: rowIndex, col: cIdx } }));
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        );
      })}
    </>
  );
}