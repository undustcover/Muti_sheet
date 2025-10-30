import type { KeyboardEvent } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useGridState } from '../context/GridStateContext';
import { useCallback } from 'react';

// 统一键盘导航与编辑切换逻辑
// - 方向键：在可见行/列内移动选区
// - Enter：进入编辑模式（使用当前选区）
// - Tab/Shift+Tab：在同一行左右移动
// - Ctrl+C：委托 useClipboard 的 onCopyKey 处理复制

export type UseKeyboardParams<RowT = any> = {
  table: any;
  columns: ColumnDef<RowT, any>[];
  onCopyKey: (e: KeyboardEvent<HTMLDivElement>) => boolean;
  onFillKey?: (e: KeyboardEvent<HTMLDivElement>) => boolean;
};

export function useKeyboard<RowT = any>(params: UseKeyboardParams<RowT>) {
  const { table, columns, onCopyKey, onFillKey } = params;
  const { selectedCell, editingCell, setSelectedCell, setEditingCell } = useGridState();

  const moveSelection = (dRow: number, dCol: number) => {
    const rowsModel = table.getRowModel().rows;
    const cols = columns as any[];
    const currRowIdx = Math.max(0, rowsModel.findIndex((r: any) => r.original.id === selectedCell.rowId));
    const currColIdx = Math.max(0, cols.findIndex((c: any) => c.id === selectedCell.columnId));
    const nextRowIdx = Math.min(Math.max(currRowIdx + dRow, 0), rowsModel.length - 1);
    const nextColIdx = Math.min(Math.max(currColIdx + dCol, 0), cols.length - 1);
    const nextRowId = rowsModel[nextRowIdx]?.original.id ?? null;
    const nextColId = (cols[nextColIdx] as any)?.id ?? null;
    setSelectedCell({ rowId: nextRowId, columnId: nextColId });
    setEditingCell({ rowId: null, columnId: null });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editingCell.rowId && editingCell.columnId) return;
    if (!selectedCell.rowId || !selectedCell.columnId) return;
    if (onCopyKey(e)) return;
    if (onFillKey && onFillKey(e)) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1, 0); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1, 0); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelection(0, -1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); moveSelection(0, 1); }
    else if (e.key === 'Enter') { e.preventDefault(); setEditingCell({ ...selectedCell }); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const isShift = e.shiftKey;
      if (isShift) moveSelection(0, -1); else moveSelection(0, 1);
    }
  };

  return { onKeyDown, moveSelection };
}