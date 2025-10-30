import { useEffect, useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import type { RowRecord, SelectOption } from '../../../types';

export type ColumnMeta = Record<string, { name: string; type: string; description?: string; options?: SelectOption[]; }> & Record<string, any>;

type Args = {
  table: any;
  columnMeta: ColumnMeta;
  columnOrder: string[];
  columnVisibility: VisibilityState;
  selectedCell: { rowId: string | null; columnId: string | null };
  selectionRange: { start: { row: number; col: number } | null; end: { row: number; col: number } | null};
  setColumnMeta: (updater: ColumnMeta | ((prev: ColumnMeta) => ColumnMeta)) => void;
  setColumnOrder: (updater: string[] | ((prev: string[]) => string[])) => void;
  setColumnVisibility: (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
  setData: (updater: RowRecord[] | ((prev: RowRecord[]) => RowRecord[])) => void;
};

export function useClipboard({
  table,
  columnMeta,
  columnOrder,
  columnVisibility,
  selectedCell,
  selectionRange,
  setColumnMeta,
  setColumnOrder,
  setColumnVisibility,
  setData,
}: Args) {
  const parseClipboardText = (text: string): string[][] => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.length > 0);
    const hasTab = lines.some((l) => l.includes('\t'));
    return lines.map((l) => (hasTab ? l.split('\t') : l.split(',')));
  };
  const parseNumber = (s: string): number | null => {
    if (!s) return null;
    const t = s.trim().replace(/,/g, '');
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(t)) {
      const n = Number(t);
      return isNaN(n) ? null : n;
    }
    return null;
  };
  const parseDate = (s: string): string | null => {
    if (!s) return null;
    const t = s.trim();
    const dt = new Date(t);
    if (!isNaN(dt.getTime())) {
      return dt.toISOString();
    }
    return null;
  };
  const parseTime = (s: string): string | null => {
    if (!s) return null;
    const t = s.trim();
    const m = t.match(/^([01]?\d|2[0-3]):([0-5]?\d)(?::([0-5]?\d)(\.\d{1,3})?)?$/);
    if (!m) return null;
    const hh = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const ss = (m[3] ?? '00').padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const [headerPrompt, setHeaderPrompt] = useState<{ show: boolean; matrix: string[][] | null; anchorRowIndex: number; anchorColIndex: number }>(
    { show: false, matrix: null, anchorRowIndex: 0, anchorColIndex: 0 }
  );
  const [copyToast, setCopyToast] = useState<{ show: boolean; count: number }>({ show: false, count: 0 });

  const applyPaste = (matrix: string[][], anchorRowIndex: number, anchorColIndex: number, useHeader: boolean) => {
    let pasteRows = matrix;
    const pasteCols = Math.max(...pasteRows.map((r) => r.length));
    const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
    const availableToRight = Math.max(0, visibleColumnIds.length - Math.max(0, anchorColIndex));
    const needNewCols = Math.max(0, pasteCols - availableToRight);
    const newColIds: string[] = [];

    if (useHeader && pasteRows.length > 0) {
      const headerValues = pasteRows[0];
      const overrideCount = Math.min(pasteCols, visibleColumnIds.length - Math.max(0, anchorColIndex));
      setColumnMeta((prev) => {
        const next = { ...prev } as any;
        for (let i = 0; i < overrideCount; i++) {
          const cid = visibleColumnIds[anchorColIndex + i];
          next[cid] = { ...(next[cid] || {}), name: headerValues[i] ?? '' };
        }
        return next;
      });
      pasteRows = pasteRows.slice(1);
    }

    if (needNewCols > 0) {
      const startIdx = availableToRight;
      const createId = (idx: number) => `field-${Date.now()}-${idx}`;
      for (let i = 0; i < needNewCols; i++) {
        const colValues = pasteRows.map((r) => r[startIdx + i] ?? '').filter((v) => v !== '');
        const allNum = colValues.length > 0 && colValues.every((v) => parseNumber(v) !== null);
        const allDate = colValues.length > 0 && colValues.every((v) => parseDate(v) !== null);
        const allTime = colValues.length > 0 && colValues.every((v) => parseTime(v) !== null);
        const cid = createId(i);
        newColIds.push(cid);
        const type = allNum ? 'number' : allDate ? 'date' : allTime ? 'time' : 'text';
        const defaultNameByType = (t: string) => t === 'number' ? `数字${startIdx + i + 1}` : t === 'date' ? `日期${startIdx + i + 1}` : t === 'time' ? `时间${startIdx + i + 1}` : `文本${startIdx + i + 1}`;
        const headerVal = useHeader ? (matrix[0]?.[startIdx + i] ?? '') : '';
        const name = useHeader ? (headerVal || defaultNameByType(type)) : defaultNameByType(type);
        setColumnMeta((prev) => ({ ...prev, [cid]: { name, type } }));
        setColumnOrder((order) => [...order, cid]);
        setColumnVisibility((vis) => ({ ...vis, [cid]: true }));
      }
    }

    const targetColumnIds = [...visibleColumnIds.slice(anchorColIndex), ...newColIds].slice(0, Math.max(...pasteRows.map((r) => r.length)));
    setData((prev) => {
      const next = [...prev];
      for (let r = 0; r < pasteRows.length; r++) {
        const rowVals = pasteRows[r];
        const targetRowIdx = anchorRowIndex + r;
        if (targetRowIdx >= next.length) {
          next.push({ id: `rec-${next.length + 1}`, text: String(next.length + 1), number: 0, date: new Date().toISOString(), select: null, multiSelect: [], relation: null, user: null } as any);
        }
        const rowObj = { ...next[targetRowIdx] } as any;
        for (let c = 0; c < targetColumnIds.length; c++) {
          const cid = targetColumnIds[c];
          const meta = columnMeta[cid] ?? ({} as any);
          const val = rowVals[c] ?? '';
          if (meta.type === 'number') {
            const n = parseNumber(val);
            if (n !== null) rowObj[cid] = n;
          } else if (meta.type === 'text') {
            rowObj[cid] = val;
          } else if (meta.type === 'date') {
            const d = parseDate(val);
            if (d !== null) rowObj[cid] = d;
          } else if (meta.type === 'time') {
            const t = parseTime(val);
            if (t !== null) rowObj[cid] = t;
          }
        }
        next[targetRowIdx] = rowObj;
      }
      return next;
    });
  };

  const onCopyKey = (e: any): boolean => {
    if (!(selectedCell.rowId && selectedCell.columnId)) return false;
    if (e.ctrlKey && String(e.key).toLowerCase() === 'c') {
      e.preventDefault();
      if (selectionRange.start && selectionRange.end) {
        try {
          const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
          const toText = (v: any) => (v === null || v === undefined) ? '' : String(v);
          const isNumCol = (cid: string) => columnMeta[cid]?.type === 'number';
          const isTextCol = (cid: string) => columnMeta[cid]?.type === 'text';
          const isDateCol = (cid: string) => columnMeta[cid]?.type === 'date';
          const rowsModel = table.getRowModel().rows;
          const r1 = Math.min(selectionRange.start!.row, selectionRange.end!.row);
          const r2 = Math.max(selectionRange.start!.row, selectionRange.end!.row);
          const c1 = Math.min(selectionRange.start!.col, selectionRange.end!.col);
          const c2 = Math.max(selectionRange.start!.col, selectionRange.end!.col);
          const selectedColIds = visibleColumnIds.slice(c1, c2 + 1);
          const rowsTsv = rowsModel.slice(r1, r2 + 1).map((row: any) => (
            selectedColIds.map((cid) => {
              if (isNumCol(cid)) {
                const n = (row.original as any)[cid];
                return (typeof n === 'number') ? String(n) : '';
              }
              if (isTextCol(cid)) {
                return toText((row.original as any)[cid]);
              }
              if (isDateCol(cid)) {
                const d = (row.original as any)[cid];
                try {
                  const dt = d ? new Date(d) : null;
                  return (dt && !isNaN(dt.getTime())) ? dt.toISOString().slice(0, 10) : '';
                } catch { return ''; }
              }
              return '';
            }).join('\t')
          )).join('\n');
          const copyViaClipboard = async (tsv: string) => {
            try {
              await navigator.clipboard.writeText(tsv);
            } catch {}
          };
          void copyViaClipboard(rowsTsv);
          const countRows = (r2 - r1 + 1);
          const countCols = selectedColIds.length;
          setCopyToast({ show: true, count: countRows * countCols });
          window.setTimeout(() => { setCopyToast((prev: any) => (prev?.show ? { show: false, count: prev.count } : prev)); }, 1500);
        } catch {}
        return true;
      }
      try {
        const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
        const toText = (v: any) => (v === null || v === undefined) ? '' : String(v);
        const isNumCol = (cid: string) => columnMeta[cid]?.type === 'number';
        const isTextCol = (cid: string) => columnMeta[cid]?.type === 'text';
        const isDateCol = (cid: string) => columnMeta[cid]?.type === 'date';
        const rowsModel = table.getRowModel().rows;
        const r1 = 0;
        const r2 = rowsModel.length - 1;
        const c1 = 0;
        const c2 = visibleColumnIds.length - 1;
        const selectedColIds = visibleColumnIds.slice(c1, c2 + 1);
        const rowsTsv = rowsModel.slice(r1, r2 + 1).map((row: any) => (
          selectedColIds.map((cid) => {
            if (cid === 'id') {
              const v = (row.original as any)[cid] ?? row.original.id;
              return toText(v);
            }
            if (isNumCol(cid)) {
              const n = (row.original as any)[cid];
              return (typeof n === 'number') ? String(n) : '';
            }
            if (isTextCol(cid)) {
              return toText((row.original as any)[cid]);
            }
            if (isDateCol(cid)) {
              const d = (row.original as any)[cid];
              try {
                const dt = d ? new Date(d) : null;
                return (dt && !isNaN(dt.getTime())) ? dt.toISOString().slice(0, 10) : '';
              } catch { return ''; }
            }
            return '';
          }).join('\t')
        )).join('\n');
        const copyViaClipboard = async (tsv: string) => {
          try { await navigator.clipboard.writeText(tsv); } catch {}
        };
        void copyViaClipboard(rowsTsv);
        const countRows = (r2 - r1 + 1);
        const countCols = selectedColIds.length;
        setCopyToast({ show: true, count: countRows * countCols });
        window.setTimeout(() => { setCopyToast((prev: any) => (prev?.show ? { show: false, count: prev.count } : prev)); }, 1500);
      } catch {}
      return true;
    }
    return false;
  };

  const handlePaste = (e: any) => {
    if (!e.clipboardData) return;
    e.preventDefault();
    const raw = e.clipboardData.getData('text/plain');
    if (!raw) return;
    const matrix = parseClipboardText(raw);
    if (matrix.length === 0) return;
    const firstRowId = table.getRowModel().rows[0]?.original.id ?? null;
    const anchorRowIndexRaw = Math.max(0, table.getRowModel().rows.findIndex((r: any) => r.original.id === selectedCell.rowId));
    const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
    const anchorColIndexRaw = Math.max(0, visibleColumnIds.findIndex((cid) => cid === selectedCell.columnId));
    const hasSelection = !!(selectionRange.start && selectionRange.end);
    const anchorRowIndex = hasSelection ? Math.min(selectionRange.start!.row, selectionRange.end!.row) : anchorRowIndexRaw;
    const anchorColIndex = hasSelection ? Math.min(selectionRange.start!.col, selectionRange.end!.col) : anchorColIndexRaw;
    const atFirstRow = anchorRowIndex === 0 || !selectedCell.rowId || (selectedCell.rowId === firstRowId);
    if (atFirstRow) {
      setHeaderPrompt({ show: true, matrix, anchorRowIndex, anchorColIndex });
    } else {
      applyPaste(matrix, anchorRowIndex, anchorColIndex, false);
    }
  };

  const fillSelectionWithAnchorValue = () => {
    if (!(selectedCell.rowId && selectedCell.columnId)) return false;
    if (!(selectionRange.start && selectionRange.end)) return false;
    const rowsModel = table.getRowModel().rows;
    const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
    const r1 = Math.min(selectionRange.start!.row, selectionRange.end!.row);
    const r2 = Math.max(selectionRange.start!.row, selectionRange.end!.row);
    const c1 = Math.min(selectionRange.start!.col, selectionRange.end!.col);
    const c2 = Math.max(selectionRange.start!.col, selectionRange.end!.col);
    const anchorRowIdx = Math.max(0, rowsModel.findIndex((r: any) => r.original.id === selectedCell.rowId));
    const anchorColIdx = Math.max(0, visibleColumnIds.findIndex((cid) => cid === selectedCell.columnId));
    const anchorVal = (rowsModel[anchorRowIdx]?.original as any)?.[selectedCell.columnId!];
    const isWithin = (rowIdx: number, colIdx: number) => (rowIdx >= r1 && rowIdx <= r2 && colIdx >= c1 && colIdx <= c2);
    setData((prev) => {
      const next = [...prev];
      for (let ri = r1; ri <= r2; ri++) {
        const rowObj = { ...next[ri] } as any;
        for (let ci = c1; ci <= c2; ci++) {
          const cid = visibleColumnIds[ci];
          const meta = columnMeta[cid] ?? ({} as any);
          const sameCell = (ri === anchorRowIdx && ci === anchorColIdx);
          if (sameCell) continue;
          if (meta.type === 'number') {
            if (typeof anchorVal === 'number') rowObj[cid] = anchorVal;
          } else if (meta.type === 'text') {
            rowObj[cid] = (anchorVal ?? '') as any;
          } else if (meta.type === 'date') {
            if (typeof anchorVal === 'string') rowObj[cid] = anchorVal;
          } else if (meta.type === 'time') {
            if (typeof anchorVal === 'string') rowObj[cid] = anchorVal;
          }
        }
        next[ri] = rowObj;
      }
      return next;
    });
    return true;
  };

  const onFillKey = (e: any): boolean => {
    if (!(selectedCell.rowId && selectedCell.columnId)) return false;
    if (e.ctrlKey && String(e.key).toLowerCase() === 'enter') {
      e.preventDefault();
      return fillSelectionWithAnchorValue();
    }
    if (e.ctrlKey && String(e.key).toLowerCase() === 'd') {
      e.preventDefault();
      return fillSelectionWithAnchorValue();
    }
    return false;
  };

  useEffect(() => {
    const onCopy = (ev: any) => {
      if (!(selectionRange.start && selectionRange.end)) return;
      try {
        const visibleColumnIds = columnOrder.filter((id) => !!columnMeta[id] && columnVisibility[id] !== false);
        const toText = (v: any) => (v === null || v === undefined) ? '' : String(v);
        const isNumCol = (cid: string) => columnMeta[cid]?.type === 'number';
        const isTextCol = (cid: string) => columnMeta[cid]?.type === 'text';
        const isDateCol = (cid: string) => columnMeta[cid]?.type === 'date';
        const rowsModel = table.getRowModel().rows;
        const r1 = Math.min(selectionRange.start!.row, selectionRange.end!.row);
        const r2 = Math.max(selectionRange.start!.row, selectionRange.end!.row);
        const c1 = Math.min(selectionRange.start!.col, selectionRange.end!.col);
        const c2 = Math.max(selectionRange.start!.col, selectionRange.end!.col);
        const selectedColIds = visibleColumnIds.slice(c1, c2 + 1);
        const rowsTsv = rowsModel.slice(r1, r2 + 1).map((row: any) => (
          selectedColIds.map((cid) => {
            if (cid === 'id') {
              const v = (row.original as any)[cid] ?? row.original.id;
              return toText(v);
            }
            if (isNumCol(cid)) {
              const n = (row.original as any)[cid];
              return (typeof n === 'number') ? String(n) : '';
            }
            if (isTextCol(cid)) {
              return toText((row.original as any)[cid]);
            }
            if (isDateCol(cid)) {
              const d = (row.original as any)[cid];
              try {
                const dt = d ? new Date(d) : null;
                return (dt && !isNaN(dt.getTime())) ? dt.toISOString().slice(0, 10) : '';
              } catch { return ''; }
            }
            return '';
          }).join('\t')
        )).join('\n');
        ev.preventDefault();
        ev.clipboardData?.setData('text/plain', rowsTsv);
        const countRows = (r2 - r1 + 1);
        const countCols = selectedColIds.length;
        setCopyToast({ show: true, count: countRows * countCols });
        window.setTimeout(() => { setCopyToast((prev: any) => (prev?.show ? { show: false, count: prev.count } : prev)); }, 1500);
      } catch {}
    };
    window.addEventListener('copy', onCopy);
    return () => { window.removeEventListener('copy', onCopy); };
  }, [selectionRange, columnOrder, columnVisibility, table, columnMeta]);

  return {
    onCopyKey,
    handlePaste,
    headerPrompt,
    setHeaderPrompt,
    copyToast,
    setCopyToast,
    applyPaste,
    onFillKey,
    fillSelectionWithAnchorValue,
  };
}