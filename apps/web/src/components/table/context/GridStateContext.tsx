import React, { createContext, useContext } from 'react';

export type SelectionRange = { start: { row: number; col: number } | null; end: { row: number; col: number } | null };

export type GridState = {
  selectedCell: { rowId: string | null; columnId: string | null };
  editingCell: { rowId: string | null; columnId: string | null };
  setSelectedCell: (sel: { rowId: string | null; columnId: string | null }) => void;
  setEditingCell: (sel: { rowId: string | null; columnId: string | null }) => void;
  selectionRange: SelectionRange;
  setSelectionRange: (updater: SelectionRange | ((prev: SelectionRange) => SelectionRange)) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  isInRange: (rowIndex: number, colIndex: number) => boolean;
  headerSelectedCid: string | null;
  setHeaderSelectedCid: (cid: string | null) => void;
  focusGrid: () => void;
};

const GridStateContext = createContext<GridState | null>(null);

export const GridStateProvider: React.FC<{ value: GridState; children: React.ReactNode }> = ({ value, children }) => {
  return (
    <GridStateContext.Provider value={value}>{children}</GridStateContext.Provider>
  );
};

export function useGridState(): GridState {
  const ctx = useContext(GridStateContext);
  if (!ctx) throw new Error('useGridState must be used within GridStateProvider');
  return ctx;
}