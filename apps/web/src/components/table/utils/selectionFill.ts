import type { ColumnItem, RowRecord } from '../../../types';
import type { Table } from '@tanstack/react-table';
import type { SelectionRange } from '../../table/context/GridStateContext';

export function fillSelectionWithAnchorValue(
  params: {
    table: Table<RowRecord>;
    selectedCell: { rowId: string | null; columnId: string | null };
    selectionRange: SelectionRange;
    columnOrder: string[];
    columnVisibility: Record<string, boolean | undefined>;
    columnMeta: Record<string, ColumnItem>;
    setData: (updater: (prev: RowRecord[]) => RowRecord[]) => void;
    show?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  }
): boolean {
  const { table, selectedCell, selectionRange, columnOrder, columnVisibility, columnMeta, setData, show } = params;
  if (!(selectedCell.rowId && selectedCell.columnId)) return false;
  if (!(selectionRange.start && selectionRange.end)) {
    show?.('请先框选区域后再批量填充', 'info');
    return false;
  }
  const rowsModel = table.getRowModel().rows;
  const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
  const r1 = Math.min(selectionRange.start!.row, selectionRange.end!.row);
  const r2 = Math.max(selectionRange.start!.row, selectionRange.end!.row);
  const c1 = Math.min(selectionRange.start!.col, selectionRange.end!.col);
  const c2 = Math.max(selectionRange.start!.col, selectionRange.end!.col);
  const anchorRowIdx = Math.max(0, rowsModel.findIndex((r: any) => r.original.id === selectedCell.rowId));
  const anchorColIdx = Math.max(0, visibleColumnIds.findIndex((cid) => cid === selectedCell.columnId));
  const anchorVal = (rowsModel[anchorRowIdx]?.original as any)?.[selectedCell.columnId!];
  setData((prev) => {
    const next = [...prev];
    for (let ri = r1; ri <= r2; ri++) {
      const rowObj = { ...next[ri] } as any;
      for (let ci = c1; ci <= c2; ci++) {
        const cid = visibleColumnIds[ci];
        const meta = columnMeta[cid] ?? ({} as any);
        const sameCell = (ri === anchorRowIdx && ci === anchorColIdx);
        if (sameCell) continue;
        if (meta.type === 'formula') continue;
        // 文本/数字/日期/选择/多选/用户/附件/关联支持填充
        rowObj[cid] = anchorVal;
      }
      next[ri] = rowObj as RowRecord;
    }
    return next;
  });
  show?.('已批量填充选区', 'success');
  return true;
}