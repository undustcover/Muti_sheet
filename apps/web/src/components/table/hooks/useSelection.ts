import { useState } from 'react';
import type { SelectionRange } from '../context/GridStateContext';

export function useSelection() {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectionRange, setSelectionRange] = useState<SelectionRange>({ start: null, end: null });

  const isInRange = (rowIdx: number, colIdx: number): boolean => {
    if (!selectionRange.start || !selectionRange.end) return false;
    const r1 = Math.min(selectionRange.start.row, selectionRange.end.row);
    const r2 = Math.max(selectionRange.start.row, selectionRange.end.row);
    const c1 = Math.min(selectionRange.start.col, selectionRange.end.col);
    const c2 = Math.max(selectionRange.start.col, selectionRange.end.col);
    return rowIdx >= r1 && rowIdx <= r2 && colIdx >= c1 && colIdx <= c2;
  };

  return {
    isDragging,
    setIsDragging,
    selectionRange,
    setSelectionRange,
    isInRange,
  };
}