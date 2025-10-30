import type { ColumnItem, RowRecord } from '../types';
import type { Table } from '@tanstack/react-table';
import type { SelectionRange } from '../components/table/context/GridStateContext';
import { fillSelectionWithAnchorValue as fillSelectionWithAnchorValueUtil } from '../components/table/utils/selectionFill';

interface UseSelectionEditingProps {
  selectedCell: { rowId: string | null; columnId: string | null } | null;
  columnMeta: Record<string, ColumnItem>;
  histSetData?: (updater: (prev: RowRecord[]) => RowRecord[]) => void;
  setData?: (updater: (prev: RowRecord[]) => RowRecord[]) => void;
  show?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  table?: Table<RowRecord> | any;
  selectionRange?: SelectionRange;
  columnOrder?: string[];
  columnVisibility?: Record<string, boolean | undefined>;
}

export function useSelectionEditing({ selectedCell, columnMeta, histSetData, setData, show, table, selectionRange, columnOrder, columnVisibility }: UseSelectionEditingProps) {
  const clearSelectedCellContent = () => {
    const rowId = selectedCell?.rowId ?? null;
    const colId = selectedCell?.columnId ?? null;
    if (!rowId || !colId) { show?.('请先选中一个单元格', 'warning'); return; }
    const t = columnMeta[colId]?.type;
    if (!t) { show?.('该单元格不可编辑', 'warning'); return; }
    if (t === 'formula') { show?.('公式列为只读，无法直接清空', 'info'); return; }
    const emptyValue = (() => {
      if (t === 'text') return '';
      if (t === 'number') return null as any;
      if (t === 'date' || t === 'time') return null as any;
      if (t === 'single') return null as any;
      if (t === 'multi') return [] as any;
      if (t === 'user') return null as any;
      if (t === 'attachment') return [] as any;
      if (t === 'relation') return null as any;
      return null as any;
    })();
    const apply = histSetData ?? setData;
    if (!apply) return;
    apply((prev) => prev.map((r) => (r.id === rowId ? { ...r, [colId]: emptyValue } : r)));
    show?.('已清空选中单元格内容', 'success');
  };

  const fillSelectionWithAnchorValue = () => {
    if (!table || !selectionRange || !columnOrder || !columnVisibility) return false;
    const apply = histSetData ?? setData;
    if (!apply) return false;
    return fillSelectionWithAnchorValueUtil({
      table,
      selectedCell: selectedCell ?? { rowId: null, columnId: null },
      selectionRange,
      columnOrder,
      columnVisibility,
      columnMeta,
      setData: apply,
      show,
    });
  };

  const onFillKey = (e: any): boolean => {
    if (!(selectedCell?.rowId && selectedCell?.columnId)) return false;
    if (e.ctrlKey && String(e.key).toLowerCase() === 'enter') { e.preventDefault(); return fillSelectionWithAnchorValue(); }
    if (e.ctrlKey && String(e.key).toLowerCase() === 'd') { e.preventDefault(); return fillSelectionWithAnchorValue(); }
    return false;
  };

  return { clearSelectedCellContent, fillSelectionWithAnchorValue, onFillKey };
}