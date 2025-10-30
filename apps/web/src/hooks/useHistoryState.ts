import { useRef } from 'react';
import type { RowRecord } from '../types';

interface UseHistoryStateProps {
  data: RowRecord[];
  columnMeta: any;
  columnOrder: string[];
  columnVisibility: Record<string, boolean | undefined>;
  sorting: any;
  setData: (updater: RowRecord[] | ((prev: RowRecord[]) => RowRecord[])) => void;
  setColumnMeta: (updater: any) => void;
  setColumnOrder: (updater: string[] | ((prev: string[]) => string[])) => void;
  setColumnVisibility: (updater: any) => void;
  setSorting: (updater: any) => void;
  show: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  requestMeasure: () => void;
}

export function useHistoryState({
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
  show,
  requestMeasure,
}: UseHistoryStateProps) {
  const undoStackRef = useRef<Array<{ data: RowRecord[]; columnMeta: any; columnOrder: string[]; columnVisibility: Record<string, boolean | undefined>; sorting: any }>>([]);
  const redoStackRef = useRef<Array<{ data: RowRecord[]; columnMeta: any; columnOrder: string[]; columnVisibility: Record<string, boolean | undefined>; sorting: any }>>([]);

  const captureSnapshot = () => ({
    data: data.map(r => ({ ...r })),
    columnMeta: { ...columnMeta },
    columnOrder: [...columnOrder],
    columnVisibility: { ...columnVisibility } as any,
    sorting: [...sorting] as any,
  });

  const pushUndo = () => { undoStackRef.current.push(captureSnapshot()); };
  const clearRedo = () => { redoStackRef.current = []; };

  const histSetData = (updater: RowRecord[] | ((prev: RowRecord[]) => RowRecord[])) => { pushUndo(); clearRedo(); setData(updater); };
  const histSetColumnMeta = (updater: any) => { pushUndo(); clearRedo(); setColumnMeta(updater); };
  const histSetColumnOrder = (updater: string[] | ((prev: string[]) => string[])) => { pushUndo(); clearRedo(); setColumnOrder(updater); };
  const histSetColumnVisibility = (updater: any) => { pushUndo(); clearRedo(); setColumnVisibility(updater); };
  const histSetSorting = (updater: any) => { pushUndo(); clearRedo(); setSorting(updater); };

  const undo = () => {
    const prev = undoStackRef.current.pop();
    if (!prev) { show('没有可撤销的操作', 'info'); return; }
    redoStackRef.current.push(captureSnapshot());
    setData(prev.data);
    setColumnMeta(prev.columnMeta);
    setColumnOrder(prev.columnOrder);
    setColumnVisibility(prev.columnVisibility as any);
    setSorting(prev.sorting as any);
    requestMeasure();
  };

  const redo = () => {
    const next = redoStackRef.current.pop();
    if (!next) { show('没有可重做的操作', 'info'); return; }
    undoStackRef.current.push(captureSnapshot());
    setData(next.data);
    setColumnMeta(next.columnMeta);
    setColumnOrder(next.columnOrder);
    setColumnVisibility(next.columnVisibility as any);
    setSorting(next.sorting as any);
    requestMeasure();
  };

  return {
    histSetData,
    histSetColumnMeta,
    histSetColumnOrder,
    histSetColumnVisibility,
    histSetSorting,
    undo,
    redo,
    pushUndo,
    clearRedo,
  };
}